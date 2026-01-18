from rest_framework import viewsets, permissions, filters
from plexus.models import Input, Thought, Action
from plexus.serializers import InputSerializer, ThoughtSerializer, ActionSerializer

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
