from rest_framework import views, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiTypes
from django.http import HttpResponse
from .services import get_services, format_services_as_text
from .pricelist import get_pricelist, format_pricelist_as_text

class ServicesView(views.APIView):
    """
    Returns the list of services offered by Emoty.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Get list of services",
        description="""
        Returns a list of AI and emotion analysis services offered by Emoty.
        
        **Query Parameters**:
        - `output=text`: Returns plain text format instead of JSON
        """,
        parameters=[
            OpenApiParameter(
                name='output',
                type=str,
                description='Response output: json (default) or text',
                required=False,
                enum=['json', 'text']
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
        tags=['Services'],
    )
    def get(self, request):
        services_data = get_services()
        
        output_type = request.query_params.get('output', 'json').lower()
        if output_type == 'text':
            text_output = format_services_as_text(services_data, request.LANGUAGE_CODE)
            return HttpResponse(text_output, content_type='text/plain; charset=utf-8')
        
        return Response(services_data)

class PricelistView(views.APIView):
    """
    Returns structured pricing information for Emoty services.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get service pricelist",
        description="""
        Returns a structured pricelist of all Emoty subscriptions and services.
        
        **Query Parameters**:
        - `output=text`: Returns human-readable plain text format
        """,
        parameters=[
            OpenApiParameter(
                name='output',
                type=str,
                description='Response output: json (default) or text',
                required=False,
                enum=['json', 'text']
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
        tags=['Services'],
    )
    def get(self, request):
        pricelist_data = get_pricelist()
        
        output_type = request.query_params.get('output', 'json').lower()
        if output_type == 'text':
            text_output = format_pricelist_as_text(pricelist_data, request.LANGUAGE_CODE)
            return HttpResponse(text_output, content_type='text/plain; charset=utf-8')
        
        return Response(pricelist_data)


class MCPView(views.APIView):
    """
    Returns information about the Emoty MCP (Model Context Protocol) Server.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get MCP Server Info",
        description="""
        Returns connection details and capabilities for the Emoty MCP Server.
        Use this to connect AI agents (like Claude Desktop) to Emoty tools.
        """,
        responses={200: OpenApiTypes.OBJECT},
        tags=['MCP'],
    )
    def get(self, request):
        return Response({
            "name": "Emoty MCP Server",
            "version": "1.0.0",
            "description": "Provides tools for emotion analysis and memory management.",
            "connection": {
                "type": "stdio",
                "command": "uv",
                "args": ["run", "mcp_server.py"]
            },
            "documentation": f"{request.scheme}://{request.get_host()}/docs/mcp/"
        })
