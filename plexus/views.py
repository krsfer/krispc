from django.shortcuts import get_object_or_404, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import TemplateView, ListView, CreateView, UpdateView
from django.urls import reverse_lazy
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.response import Response
from .forms import InputForm, ThoughtForm
from .serializers import InputSerializer
from .models import Input, Thought, Action, ReviewQueue, SystemConfiguration
from .services.stats import get_system_stats
from .services.transcription import transcribe_audio
from .services.surfacing import get_on_this_day, get_random_resurface

class IndexView(TemplateView):
    template_name = "plexus/index.html"

class CaptureView(LoginRequiredMixin, CreateView):
    model = Input
    form_class = InputForm
    template_name = "plexus/capture.html"
    success_url = reverse_lazy("plexus:dashboard")

class DashboardView(LoginRequiredMixin, ListView):
    model = Thought
    template_name = "plexus/dashboard.html"
    context_object_name = "thoughts"

    def get_queryset(self):
        queryset = Thought.objects.select_related("input").all().order_by("-input__timestamp")
        
        # Search
        query = self.request.GET.get("q")
        if query:
            queryset = queryset.filter(
                Q(content__icontains=query) | 
                Q(input__content__icontains=query)
            )
        
        # Filter by type
        thought_type = self.request.GET.get("type")
        if thought_type:
            queryset = queryset.filter(type=thought_type)
            
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add surfacing insights
        context["on_this_day"] = get_on_this_day()
        context["random_thought"] = get_random_resurface()
        return context

class ReviewQueueListView(LoginRequiredMixin, ListView):
    model = ReviewQueue
    template_name = "plexus/bouncer/queue.html"
    context_object_name = "reviews"

    def get_queryset(self):
        return ReviewQueue.objects.filter(status="pending").order_by("-created_at")

class ReviewResolveView(LoginRequiredMixin, UpdateView):
    model = Thought
    form_class = ThoughtForm
    template_name = "plexus/bouncer/resolve.html"
    success_url = reverse_lazy("plexus:review_queue")

    def get_object(self, queryset=None):
        review = get_object_or_404(ReviewQueue, pk=self.kwargs["pk"])
        return review.thought

    def form_valid(self, form):
        response = super().form_valid(form)
        review = get_object_or_404(ReviewQueue, pk=self.kwargs["pk"])
        review.status = "resolved"
        review.save()
        return response

class ActionListView(LoginRequiredMixin, ListView):
    model = Action
    template_name = "plexus/action_center.html"
    context_object_name = "actions"

    def get_queryset(self):
        status = self.request.GET.get("status", "pending")
        return Action.objects.filter(status=status).select_related("thought").order_by("-thought__input__timestamp")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["current_status"] = self.request.GET.get("status", "pending")
        return context

class ActionToggleView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        action = get_object_or_404(Action, pk=self.kwargs["pk"])
        if action.status == "pending":
            action.status = "done"
        else:
            action.status = "pending"
        action.save()
        
        # Redirect back to the referring page, or default to action center
        next_url = request.META.get("HTTP_REFERER", reverse_lazy("plexus:action_center"))
        return redirect(next_url)

class ThoughtUpdateView(LoginRequiredMixin, UpdateView):
    model = Thought
    form_class = ThoughtForm
    template_name = "plexus/thought_edit.html"
    success_url = reverse_lazy("plexus:dashboard")

    def form_valid(self, form):
        response = super().form_valid(form)
        if form.cleaned_data.get("reclassify"):
            from .tasks import process_input
            # Trigger reprocessing of the updated input (via the thought's input link)
            # Important: The Thought model is updated first (by super().form_valid), 
            # so the input content might need syncing if we want AI to see the *new* text.
            # However, the task reads Input.content.
            # We should update Input.content to match Thought.content if we want the AI to see edits.
            
            thought = self.object
            thought.input.content = thought.content
            thought.input.save()
            
            process_input.delay(thought.input.id)
            
        return response

class AdminDashboardView(UserPassesTestMixin, TemplateView):
    template_name = "plexus/admin_dashboard.html"

    def test_func(self):
        return self.request.user.is_superuser

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["stats"] = get_system_stats()
        context["config"] = SystemConfiguration.get_solo()
        return context

    def post(self, request, *args, **kwargs):
        config = SystemConfiguration.get_solo()
        
        # Handle AI Provider switch
        provider = request.POST.get("active_ai_provider")
        if provider in dict(SystemConfiguration.AI_PROVIDERS):
            config.active_ai_provider = provider
        
        # Handle Redis Env switch
        redis_env = request.POST.get("active_redis_env")
        if redis_env in dict(SystemConfiguration.REDIS_ENVS):
            config.active_redis_env = redis_env
            
        config.save()
        return redirect("plexus:admin_dashboard")

class ThoughtRetryView(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        from .tasks import process_input
        thought = get_object_or_404(Thought, pk=self.kwargs["pk"])
        process_input.delay(thought.input.id)
        
        # Redirect back
        next_url = request.META.get("HTTP_REFERER", reverse_lazy("plexus:dashboard"))
        return redirect(next_url)

class VoiceCaptureView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        if "audio" not in request.FILES:
            return Response({"error": "No audio file provided"}, status=status.HTTP_400_BAD_REQUEST)

        audio_file = request.FILES["audio"]
        
        # Transcribe
        transcript = transcribe_audio(audio_file)
        
        if transcript.startswith("Error:"):
            return Response({"error": transcript}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create Input
        input_obj = Input.objects.create(
            content=transcript,
            source="voice"
        )
        
        # Return serialized input
        serializer = InputSerializer(input_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class IngestAPIView(APIView):
    """
    API endpoint for frictionless ingestion of raw data.
    """
    def post(self, request, *args, **kwargs):
        serializer = InputSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
