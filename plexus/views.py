from django.shortcuts import get_object_or_404, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import TemplateView, ListView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.db.models import Q
from django.contrib import messages
from django.utils.translation import gettext_lazy as _
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status, permissions
from rest_framework.response import Response
from .forms import InputForm, ThoughtForm
from .serializers import InputSerializer
from .models import Input, Thought, Action, ReviewQueue, SystemConfiguration
from .services.stats import get_system_stats
from .services.transcription import transcribe_audio
from .services.surfacing import get_on_this_day, get_random_resurface
from .guest import get_guest_status, can_create_thought, is_guest_user
from .pricelist import get_pricelist
from .services_info import get_services

class DeveloperIndexView(TemplateView):
    template_name = "plexus/developers.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['api_docs_swagger'] = reverse_lazy('plexus:swagger-ui')
        context['api_docs_redoc'] = reverse_lazy('plexus:redoc')
        context['pricelist_json'] = reverse_lazy('plexus:api-pricelist')
        context['pricelist_text'] = reverse_lazy('plexus:api-pricelist') + "?output=text"
        context['services_text'] = reverse_lazy('plexus:api-services') + "?output=text"
        context['mcp_server_info'] = reverse_lazy('plexus:api-mcp')
        return context

class IndexView(TemplateView):
    template_name = "plexus/index.html"

class CaptureView(LoginRequiredMixin, CreateView):
    model = Input
    form_class = InputForm
    template_name = "plexus/capture.html"
    success_url = reverse_lazy("plexus:dashboard")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["guest_status"] = get_guest_status(self.request.user)
        return context

    def form_valid(self, form):
        # Check guest limit
        can_create, remaining = can_create_thought(self.request.user)
        if not can_create:
            messages.error(
                self.request,
                _("Guest limit reached. Please create an account to continue.")
            )
            return redirect("plexus:capture")
        
        # Assign user to input
        form.instance.user = self.request.user
        return super().form_valid(form)

class ThoughtDeleteView(LoginRequiredMixin, DeleteView):
    model = Thought
    template_name = "plexus/thought_confirm_delete.html"
    success_url = reverse_lazy("plexus:dashboard")

class DashboardView(LoginRequiredMixin, ListView):
    model = Thought
    template_name = "plexus/dashboard.html"
    context_object_name = "thoughts"

    def get_queryset(self):
        queryset = Thought.objects.select_related("input").prefetch_related(
            "actions", 
            "outgoing_links", 
            "outgoing_links__target"
        )
        
        # Filter by user for all users (guest and regular)
        if self.request.user.is_authenticated:
            queryset = queryset.filter(input__user=self.request.user)
        
        queryset = queryset.order_by("-input__timestamp")
        
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
        # Add guest status for UI
        context["guest_status"] = get_guest_status(self.request.user)
        
        # Add unprocessed info
        if self.request.user.is_authenticated:
            unprocessed = Input.objects.filter(
                user=self.request.user, 
                processed=False
            )
            
            # Apply same search filter
            query = self.request.GET.get("q")
            if query:
                unprocessed = unprocessed.filter(content__icontains=query)
            
            context["unprocessed_inputs"] = unprocessed.order_by("-timestamp")
        
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

class KanbanView(LoginRequiredMixin, TemplateView):
    template_name = "plexus/kanban.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        actions = Action.objects.select_related("thought").all().order_by("-updated_at")
        
        # Group by status
        context["columns"] = {
            "pending": actions.filter(status="pending"),
            "done": actions.filter(status="done"),
            "dismissed": actions.filter(status="dismissed"),
        }
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
    serializer_class = InputSerializer

    def post(self, request, *args, **kwargs):
        from .validators import validate_audio_file, validate_audio_duration
        from django.core.exceptions import ValidationError
        
        # Check guest limit
        can_create, remaining = can_create_thought(request.user)
        if not can_create:
            return Response(
                {"error": _("Guest limit reached. Please create an account to continue.")}, 
                status=status.HTTP_403_FORBIDDEN
            )

        if "audio" not in request.FILES:
            return Response({"error": "No audio file provided"}, status=status.HTTP_400_BAD_REQUEST)

        audio_file = request.FILES["audio"]
        
        # Validate audio file size and duration
        try:
            validate_audio_file(audio_file)
            validate_audio_duration(audio_file)
        except ValidationError as e:
            return Response({"error": str(e.message)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Transcribe
        transcript = transcribe_audio(audio_file)
        
        if transcript.startswith("Error:"):
            return Response({"error": transcript}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create Input
        input_obj = Input.objects.create(
            content=transcript,
            source="voice",
            user=request.user if request.user.is_authenticated else None
        )
        
        # Return serialized input
        serializer = InputSerializer(input_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class IngestAPIView(APIView):
    """
    API endpoint for frictionless ingestion of raw data.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InputSerializer

    def post(self, request, *args, **kwargs):
        serializer = InputSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user if request.user.is_authenticated else None)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
