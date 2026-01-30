"""
Serializers for the Plexus application.

Provides REST API serialization for Input, Thought, Action, and ThoughtLink models.
"""
from rest_framework import serializers
from plexus.models import Input, Thought, Action, ThoughtLink, Pattern


class ActionSerializer(serializers.ModelSerializer):
    """
    Serializer for Action model.
    
    Represents actionable items extracted from thoughts with status tracking.
    """
    class Meta:
        model = Action
        fields = ["id", "thought", "description", "status", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["created_at", "updated_at"]


class ThoughtLinkSerializer(serializers.ModelSerializer):
    """
    Serializer for ThoughtLink model.
    
    Represents connections between related thoughts with reasoning.
    """
    class Meta:
        model = ThoughtLink
        fields = ["id", "source", "target", "reason", "created_at"]
        read_only_fields = ["created_at"]


class ThoughtSerializer(serializers.ModelSerializer):
    """
    Serializer for Thought model.
    
    Represents processed thoughts with nested actions and links.
    Includes AI model metadata and confidence scores.
    """
    actions = ActionSerializer(many=True, read_only=True)
    links = ThoughtLinkSerializer(source="outgoing_links", many=True, read_only=True)

    class Meta:
        model = Thought
        fields = ["id", "input", "content", "type", "confidence_score", "ai_model", "actions", "links", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "confidence_score", "ai_model", "created_at", "updated_at"]


class InputSerializer(serializers.ModelSerializer):
    """
    Serializer for Input model.
    
    Represents raw user inputs with nested thoughts.
    Supports text and image content from multiple sources.
    """
    thoughts = ThoughtSerializer(many=True, read_only=True)

    class Meta:
        model = Input
        fields = ["id", "content", "image", "source", "timestamp", "processed", "thoughts", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "timestamp", "processed", "created_at", "updated_at"]


class PatternSerializer(serializers.ModelSerializer):
    """
    Serializer for Pattern model.
    Represents creative patterns with sequence data and analytics.
    """
    class Meta:
        model = Pattern
        fields = [
            "id", "user_id", "name", "sequence", "palette_id", "size",
            "is_public", "is_ai_generated", "generation_prompt", "tags",
            "difficulty_rating", "view_count", "like_count", "complexity_score",
            "estimated_time_minutes", "version", "parent_pattern_id",
            "created_at", "updated_at", "deleted_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at", "view_count", "like_count", "version"]