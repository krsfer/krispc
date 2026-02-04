from rest_framework import views, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiTypes
from django.http import HttpResponse
from .services import get_services, format_services_as_text
from .pricelist import get_pricelist, format_pricelist_as_text
from .pattern_generator import PatternGenerator

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


class PatternGeneratorRequestSerializer(serializers.Serializer):
    """Serializer for pattern generation requests."""
    emojis = serializers.CharField(
        required=True,
        help_text="String of emojis to generate pattern from (e.g., '🐋🐳🏵️')",
        max_length=80
    )


class PatternGeneratorResponseSerializer(serializers.Serializer):
    """Serializer for pattern generation responses."""
    emojis = serializers.CharField(help_text="Original emoji sequence")
    grid = serializers.ListField(
        child=serializers.CharField(),
        help_text="Pattern grid as array of emoji strings"
    )
    size = serializers.IntegerField(help_text="Grid size (width/height)")


class PatternGeneratorView(views.APIView):
    """
    Generates concentric square emoji pattern grids from emoji sequences.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Generate emoji pattern grid",
        description="""
        Converts an emoji sequence into a concentric square pattern grid.
        
        **Pattern Logic:**
        - First emoji becomes the center
        - Each subsequent emoji wraps around as an outer layer
        - Creates symmetric concentric square pattern
        - Grid size: (number of emojis × 2) - 1
        
        **Example:**
        Input: `{"emojis": "🐋🐳🏵️"}`
        
        Output (JSON):
        ```json
        {
          "emojis": "🐋🐳🏵️",
          "grid": [
            "🏵️🏵️🏵️🏵️🏵️",
            "🏵️🐳🐳🐳🏵️",
            "🏵️🐳🐋🐳🏵️",
            "🏵️🐳🐳🐳🏵️",
            "🏵️🏵️🏵️🏵️🏵️"
          ],
          "size": 5
        }
        ```
        
        **Query Parameters:**
        - `output=text`: Returns plain text format with newline-separated rows
        
        **Constraints:**
        - Minimum: 1 emoji
        - Maximum: 10 emojis
        - Only valid emoji characters accepted
        """,
        request=PatternGeneratorRequestSerializer,
        responses={
            200: PatternGeneratorResponseSerializer,
            400: OpenApiTypes.OBJECT
        },
        parameters=[
            OpenApiParameter(
                name='output',
                type=str,
                description='Response format: json (default) or text',
                required=False,
                enum=['json', 'text']
            ),
        ],
        examples=[
            OpenApiExample(
                'Simple Pattern',
                value={'emojis': '🐋🐳'},
                request_only=True,
            ),
            OpenApiExample(
                'Complex Pattern',
                value={'emojis': '🐋🐳🏵️🌸🌺'},
                request_only=True,
            ),
            OpenApiExample(
                'Success Response',
                value={
                    'emojis': '🐋🐳🏵️',
                    'grid': [
                        '🏵️🏵️🏵️🏵️🏵️',
                        '🏵️🐳🐳🐳🏵️',
                        '🏵️🐳🐋🐳🏵️',
                        '🏵️🐳🐳🐳🏵️',
                        '🏵️🏵️🏵️🏵️🏵️'
                    ],
                    'size': 5
                },
                response_only=True,
            ),
        ],
        tags=['Pattern Generation'],
    )
    def post(self, request):
        """Generate emoji pattern grid from sequence."""
        # Validate request
        request_serializer = PatternGeneratorRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {'error': 'Invalid request', 'details': request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        emojis = request_serializer.validated_data['emojis']
        
        try:
            # Validate and parse emoji sequence
            sequence = PatternGenerator.validate_emoji_sequence(emojis)
            
            # Generate pattern grid
            grid = PatternGenerator.generate_concentric_pattern(sequence)
            
            # Check output format
            output_type = request.query_params.get('output', 'json').lower()
            
            if output_type == 'text':
                # Return as plain text with newline separators
                text_output = PatternGenerator.format_grid_as_text(grid)
                return HttpResponse(text_output, content_type='text/plain; charset=utf-8')
            
            # Return as JSON (default)
            grid_strings = [PatternGenerator.format_grid_as_text([row]) for row in grid]
            response_data = {
                'emojis': emojis,
                'grid': grid_strings,
                'size': len(grid)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
