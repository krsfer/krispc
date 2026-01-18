from rest_framework import serializers
from plexus.models import Input, Thought, Action

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = ["id", "thought", "description", "status"]

class ThoughtSerializer(serializers.ModelSerializer):
    actions = ActionSerializer(many=True, read_only=True)

    class Meta:
        model = Thought
        fields = ["id", "input", "content", "type", "confidence_score", "ai_model", "actions"]
        read_only_fields = ["id", "confidence_score", "ai_model"]

class InputSerializer(serializers.ModelSerializer):
    thoughts = ThoughtSerializer(many=True, read_only=True)

    class Meta:
        model = Input
        fields = ["id", "content", "source", "timestamp", "processed", "thoughts"]
        read_only_fields = ["id", "timestamp", "processed"]