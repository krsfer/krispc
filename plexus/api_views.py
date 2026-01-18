from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from plexus.models import Input, Thought, Action, ThoughtLink
from plexus.serializers import InputSerializer, ThoughtSerializer, ActionSerializer, ThoughtLinkSerializer

class InputViewSet(viewsets.ModelViewSet):
    queryset = Input.objects.all().order_by("-timestamp")
    serializer_class = InputSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["content"]

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
            serializer.save()
        else:
            # In a real app, we might return these errors in the response
            print(f"Sync Validation Error: {serializer.errors}")
