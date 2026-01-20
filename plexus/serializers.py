from rest_framework import serializers
from plexus.models import Input, Thought, Action, ThoughtLink

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = ["id", "thought", "description", "status", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["created_at", "updated_at"]

class ThoughtLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThoughtLink
        fields = ["id", "source", "target", "reason", "created_at"]
        read_only_fields = ["created_at"]

class ThoughtSerializer(serializers.ModelSerializer):
    actions = ActionSerializer(many=True, read_only=True)
    links = ThoughtLinkSerializer(source="outgoing_links", many=True, read_only=True)

    class Meta:
        model = Thought
        fields = ["id", "input", "content", "type", "confidence_score", "ai_model", "actions", "links", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "confidence_score", "ai_model", "created_at", "updated_at"]

class InputSerializer(serializers.ModelSerializer):
    thoughts = ThoughtSerializer(many=True, read_only=True)

    class Meta:
        model = Input
        fields = ["id", "content", "image", "source", "timestamp", "processed", "thoughts", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "timestamp", "processed", "created_at", "updated_at"]