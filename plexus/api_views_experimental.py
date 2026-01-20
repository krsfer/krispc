from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from plexus.models import Input, Thought, Action
from plexus.serializers import ThoughtSerializer, ActionSerializer
from plexus.services.llm import query_llm
import json

class DynamicViewGenerator(APIView):
    """
    Experimental API that generates a UI layout and data based on a natural language query.
    Implements the 'AI-Generated Interfaces' pattern for 2026.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "")
        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Ask AI to interpret the query and generate SQL-like filters and UI hints
        system_prompt = f"""
        You are a UI Generator for a Second Brain system. 
        The user wants to see a specific view of their data based on this query: "{query}"

        Available Models:
        - Thought (fields: content, type [task/ideation/reference], confidence_score, created_at)
        - Action (fields: description, status [pending/done], thought_id)

        Return a JSON object with:
        1. 'filter_type': "thought" or "action"
        2. 'filter_criteria': A dictionary of Django-like filters (e.g., {{'status': 'pending', 'description__icontains': 'urgent'}})
        3. 'layout_title': A display title for the view.
        4. 'layout_type': "list", "kanban", or "grid".
        5. 'layout_description': A brief explanation of why this layout was chosen.
        
        Ensure the output is valid JSON.
        """
        
        # We use the generic query_llm helper
        llm_response = query_llm(system_prompt)
        
        if not llm_response:
             return Response({"error": "AI Service unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            # Clean possible markdown formatting
            clean_json = llm_response.replace("```json", "").replace("```", "").strip()
            spec = json.loads(clean_json)
        except json.JSONDecodeError:
            return Response({"error": "Failed to parse AI response"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Execute the query based on AI specs
        data = []
        try:
            filter_kwargs = spec.get("filter_criteria", {})
            
            if spec.get("filter_type") == "action":
                queryset = Action.objects.filter(**filter_kwargs)[:50] # Safety limit
                data = ActionSerializer(queryset, many=True).data
            else:
                queryset = Thought.objects.filter(**filter_kwargs)[:50]
                data = ThoughtSerializer(queryset, many=True).data
                
        except Exception as e:
            return Response({
                "error": f"Invalid filter generated: {str(e)}",
                "spec": spec
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Return the Data + The View Specification
        return Response({
            "meta": {
                "title": spec.get("layout_title", "Custom View"),
                "layout": spec.get("layout_type", "list"),
                "description": spec.get("layout_description", "")
            },
            "data": data
        })
