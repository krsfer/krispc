from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from plexus.models import Input, Thought, Action, ThoughtLink, Pattern, Reminder, Notification
from plexus.serializers import InputSerializer, ThoughtSerializer, ActionSerializer, ThoughtLinkSerializer, PatternSerializer, ReminderSerializer, NotificationSerializer

class InputViewSet(viewsets.ModelViewSet):
    queryset = Input.objects.all().order_by("-timestamp")
    serializer_class = InputSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["content"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user if self.request.user.is_authenticated else None)

class ThoughtViewSet(viewsets.ModelViewSet):
    queryset = Thought.objects.select_related("input").prefetch_related("actions").all().order_by("-input__timestamp")
    serializer_class = ThoughtSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["content", "input__content"]
    ordering_fields = ["type", "confidence_score"]

class ActionViewSet(viewsets.ModelViewSet):
    queryset = Action.objects.select_related("thought").all().order_by("status", "-thought__input__timestamp")
    serializer_class = ActionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["description", "thought__content"]

    def perform_update(self, serializer):
        # Allow simple status toggling via API
        super().perform_update(serializer)

class SyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. PUSH: Process incoming changes
        changes = request.data.get('changes', {})
        if changes:
            self.process_push(changes)

        # 2. PULL: Get items updated since last_sync
        last_sync = request.data.get('last_sync_timestamp')
        
        if last_sync:
            last_sync_dt = parse_datetime(last_sync)
        else:
            last_sync_dt = None

        if last_sync_dt:
            updated_inputs = Input.objects.filter(updated_at__gt=last_sync_dt)
            updated_thoughts = Thought.objects.filter(updated_at__gt=last_sync_dt)
            updated_actions = Action.objects.filter(updated_at__gt=last_sync_dt)
            updated_links = ThoughtLink.objects.filter(created_at__gt=last_sync_dt)
        else:
            # Initial sync: get everything
            updated_inputs = Input.objects.all()
            updated_thoughts = Thought.objects.all()
            updated_actions = Action.objects.all()
            updated_links = ThoughtLink.objects.all()

        return Response({
            "sync_timestamp": timezone.now(),
            "updates": {
                "inputs": InputSerializer(updated_inputs, many=True).data,
                "thoughts": ThoughtSerializer(updated_thoughts, many=True).data,
                "actions": ActionSerializer(updated_actions, many=True).data,
                "links": ThoughtLinkSerializer(updated_links, many=True).data,
            }
        })

    def process_push(self, changes):
        # Naive sync: Process in dependency order.
        # Limitation: Does not handle client-side temp IDs mapping for related items.
        # Clients should ideally sync parents, get real IDs, then sync children.
        
        for item in changes.get('inputs', []):
            self.save_item(Input, InputSerializer, item)
            
        for item in changes.get('thoughts', []):
            self.save_item(Thought, ThoughtSerializer, item)
            
        for item in changes.get('actions', []):
            self.save_item(Action, ActionSerializer, item)

    def save_item(self, Model, Serializer, data):
        pk = data.get('id')
        if pk:
            try:
                instance = Model.objects.get(pk=pk)
                serializer = Serializer(instance, data=data, partial=True)
            except Model.DoesNotExist:
                # ID exists in client but not server. Treat as new create.
                data_copy = data.copy()
                data_copy.pop('id', None)
                serializer = Serializer(data=data_copy)
        else:
            serializer = Serializer(data=data)
            
        if serializer.is_valid():
            # For new items in sync, we prefer assigning the current sync user
            # unless the serializer already has a user (which it won't if data is from client)
            if not pk and hasattr(Model, 'user'):
                 # We don't have request here directly but we can pass it to save_item or use a context-based approach.
                 # However, SyncView is an APIView, we have self.request.
                 serializer.save(user=self.request.user if self.request.user.is_authenticated else None)
            else:
                serializer.save()
        else:
            # In a real app, we might return these errors in the response
            print(f"Sync Validation Error: {serializer.errors}")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def input_status(request):
    """
    Check processing state for a list of Input IDs owned by the current user.
    """
    input_ids = request.data.get("input_ids", [])
    if not isinstance(input_ids, list):
        return Response(
            {"processed_ids": [], "failed_ids": []},
            status=status.HTTP_400_BAD_REQUEST,
        )

    normalized_ids = []
    failed_ids = []
    for input_id in input_ids:
        try:
            normalized_ids.append(int(input_id))
        except (TypeError, ValueError):
            failed_ids.append(input_id)

    inputs = Input.objects.filter(
        id__in=normalized_ids,
        user=request.user,
    ).prefetch_related("thoughts")
    inputs_by_id = {input_obj.id: input_obj for input_obj in inputs}

    processed_ids = []
    for input_id in normalized_ids:
        input_obj = inputs_by_id.get(input_id)
        if not input_obj:
            failed_ids.append(input_id)
            continue

        if not input_obj.processed:
            continue

        thoughts = list(input_obj.thoughts.all())
        has_processor_error = any(
            "processor-error" in (thought.ai_model or "").lower()
            for thought in thoughts
        )
        if has_processor_error:
            failed_ids.append(input_id)
        else:
            processed_ids.append(input_id)

    return Response(
        {
            "processed_ids": processed_ids,
            "failed_ids": failed_ids,
        }
    )

class PatternViewSet(viewsets.ModelViewSet):
    """
    ViewSet for interacting with Pattern data.
    Provides standard CRUD operations for patterns.
    """
    queryset = Pattern.objects.filter(deleted_at__isnull=True).order_by("-created_at")
    serializer_class = PatternSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "tags", "generation_prompt"]
    ordering_fields = ["created_at", "view_count", "like_count", "difficulty_rating"]

    def perform_destroy(self, instance):
        # Soft delete
        instance.deleted_at = timezone.now()
        instance.save()


class ReminderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing reminders.
    Provides CRUD operations for scheduled action reminders.
    """
    queryset = Reminder.objects.select_related('action').all().order_by('-remind_at')
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['message', 'action__description']
    ordering_fields = ['remind_at', 'is_sent', 'created_at']


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    Provides CRUD operations and bulk mark-as-read functionality.
    """
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read', 'notification_type']

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all unread notifications as read."""
from django.http import HttpResponse
from .services_info import get_services, format_services_as_text
from .pricelist import get_pricelist, format_pricelist_as_text

class ServicesView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        data = get_services()
        if request.query_params.get('output') == 'text':
            return HttpResponse(format_services_as_text(data, request.LANGUAGE_CODE), content_type="text/plain")
        return Response(data)

class PricelistView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        data = get_pricelist()
        if request.query_params.get('output') == 'text':
            return HttpResponse(format_pricelist_as_text(data, request.LANGUAGE_CODE), content_type="text/plain")
        return Response(data)

class MCPView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        return Response({
            "name": "Plexus MCP Server",
            "version": "1.0.0",
            "description": "SecondBrain tools for thoughts and actions.",
            "documentation": f"{request.scheme}://{request.get_host()}/docs/mcp/"
        })
