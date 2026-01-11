"""
API Views for the KrisPC API.

Provides RESTful endpoints for contacts, products, technologies, brands, and cities.
"""
import html
import logging
from rest_framework import viewsets, views, permissions, filters
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema, 
    OpenApiExample, 
    OpenApiParameter,
    OpenApiTypes
)
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.utils.translation import activate

from .models import Contact
from .serializers import ContactSerializer
from .api_serializers import (
    ProductSerializer, 
    ColophonSerializer, 
    MarqueSerializer,
    StandardAPIResponse
)
from .permissions import ContactCreatePermission
from . import lst_products, colophon, marques, lst_villes
from .services import send_contact_email
from .pricelist import get_pricelist, format_pricelist_as_text, format_products_as_text
from django.http import HttpResponse

logger = logging.getLogger(__name__)


def decode_html_entities(data):
    """
    Recursively decode HTML entities in strings within data structures.
    
    This ensures API responses contain clean Unicode data rather than
    HTML entities like &nbsp;, &euro;, &mdash;, etc.
    
    Args:
        data: Can be a string, dict, list, or other type
        
    Returns:
        Data with all HTML entities decoded to proper Unicode characters
    """
    if isinstance(data, str):
        return html.unescape(data)
    elif isinstance(data, dict):
        return {key: decode_html_entities(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [decode_html_entities(item) for item in data]
    else:
        return data


class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing contact form submissions.
    
    - **POST**: Publicly accessible for creating new contacts (rate limited to 5/minute)
    - **GET/LIST**: Admin only - retrieve list of all contacts
    - **GET/DETAIL**: Admin only - retrieve specific contact
    - **PUT/PATCH**: Admin only - update contact
    - **DELETE**: Admin only - delete contact
    
    Features:
    - Automatic email notifications on submission
    - Honeypot spam protection
    - Message length validation (min 10 characters)
    - Filtering by name and email
    - Full-text search across all fields
    - Ordering by creation date
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contacts'
    permission_classes = [ContactCreatePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['firstname', 'surname', 'from_email']
    search_fields = ['firstname', 'surname', 'from_email', 'message']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    @extend_schema(
        summary="List all contacts (Admin Only)",
        description="Retrieve a paginated list of all contact submissions. Only accessible to admin users.",
        tags=['Contacts'],
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across firstname, surname, email, and message'
            ),
            OpenApiParameter(
                name='ordering',
                type=str,
                description='Order by: created_at, -created_at, updated_at, -updated_at'
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        logger.info(f"Admin {request.user.username} listing contacts")
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create a new contact submission",
        description="""
        Publicly accessible endpoint for contact form submissions.
        
        **Rate Limiting**: 5 requests per minute per IP address.
        
        **Spam Protection**: Includes honeypot field validation.
        
        **Validation Rules**:
        - Message must be at least 10 characters long
        - All fields are required except 'website' (honeypot)
        - Valid email format required
        """,
        examples=[
            OpenApiExample(
                'Valid Contact Submission',
                value={
                    'firstname': 'Jean',
                    'surname': 'Dupont',
                    'from_email': 'jean.dupont@example.com',
                    'message': 'Bonjour, j\'ai besoin d\'aide avec mon ordinateur portable.'
                },
                request_only=True,
            ),
        ],
        tags=['Contacts'],
    )
    def create(self, request, *args, **kwargs):
        logger.info(f"New contact submission from {request.data.get('from_email', 'unknown')}")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Save the contact and trigger email notification.
        """
        contact = serializer.save()
        logger.info(f"Contact created: ID={contact.id}, Email={contact.from_email}")
        
        try:
            # Send email notification
            send_contact_email(
                firstname=contact.firstname,
                surname=contact.surname,
                client_email=contact.from_email,
                msg=contact.message
            )
            logger.info(f"Email notification sent for contact {contact.id}")
        except Exception as e:
            logger.error(f"Failed to send email for contact {contact.id}: {str(e)}", exc_info=True)
            # Don't fail the request if email fails


class ProductsView(views.APIView):
    """
    Returns the list of products and services offered by KrisPC.
    
    This endpoint is cached for 15 minutes to improve performance.
    Supports internationalization via the Accept-Language header.
    
    **Supported Languages**: French (fr), English (en)
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        summary="Get list of products/services",
        description="""
        Returns a list of IT products and services offered by KrisPC.
        Results are localized based on the Accept-Language header.
        
        **Query Parameters**:
        - `output=text`: Returns plain text format instead of JSON
        
        Response is cached for 15 minutes for better performance.
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
        responses={200: ProductSerializer(many=True)},
        examples=[
            OpenApiExample(
                'Products Response',
                value=[
                    {
                        'Prd_Icon': 'bi-laptop',
                        'Prd_Name': 'Computer Repair',
                        'Prd_Desc': 'Professional computer repair services for all brands',
                        'Prd_More': 'Learn more'
                    }
                ],
                response_only=True,
            ),
        ],
        tags=['Products & Services'],
    )
    def get(self, request):
        logger.debug(f"Products endpoint accessed - Language: {request.LANGUAGE_CODE}")
        
        products_data = decode_html_entities(lst_products.data())
        
        # Check for text output
        output_type = request.query_params.get('output', 'json').lower()
        if output_type == 'text':
            text_output = format_products_as_text(products_data, request.LANGUAGE_CODE)
            return HttpResponse(text_output, content_type='text/plain; charset=utf-8')
        
        return Response(products_data)


class PricelistView(views.APIView):
    """
    Returns structured pricing information for KrisPC services.
    
    This endpoint provides clean, structured pricing data separate from 
    marketing descriptions. Ideal for:
    - AI assistants and chatbots
    - Price comparison tools
    - Programmatic access
    - Plain text consumption
    
    **Supported Formats**:
    - JSON (default): Structured pricing data
    - Text (?format=text): Human-readable plain text
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get service pricelist",
        description="""
        Returns a structured pricelist of all KrisPC services with pricing information.
        
        Each service includes:
        - Service ID and name (translated)
        - Category (mobile, computer, security, etc.)
        - Pricing type (hourly, fixed, or mixed)
        - Hourly rates and/or fixed prices
        - Minimum charge amounts
        
        **Query Parameters**:
        - `output=text`: Returns human-readable plain text format
        
        Response is cached for 15 minutes for better performance.
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
        examples=[
            OpenApiExample(
                'Pricelist Response (JSON)',
                value={
                    "currency": "EUR",
                    "currency_symbol": "€",
                    "services": [
                        {
                            "id": "smartphones",
                            "name": "Smartphone & Tablet Repair",
                            "pricing_type": "hourly",
                            "hourly_rate": 30,
                            "minimum_charge": 30
                        }
                    ]
                },
                response_only=True,
            ),
        ],
        tags=['Products & Services'],
    )
    def get(self, request):
        logger.debug(f"Pricelist endpoint accessed - Language: {request.LANGUAGE_CODE}")
        
        pricelist_data = get_pricelist()
        
        # Check for text output
        output_type = request.query_params.get('output', 'json').lower()
        if output_type == 'text':
            text_output = format_pricelist_as_text(pricelist_data, request.LANGUAGE_CODE)
            return HttpResponse(text_output, content_type='text/plain; charset=utf-8')
        
        return Response(pricelist_data)


class ColophonView(views.APIView):
    """
    Returns the colophon data (technologies and tools used in building the website).
    
    This endpoint is cached for 15 minutes.
    Supports internationalization via the Accept-Language header.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get technologies used",
        description="""
        Returns a list of technologies, frameworks, and tools used to build the KrisPC website.
        Each entry includes the technology name, icon, and link to documentation.
        
        Response is cached for 15 minutes for better performance.
        """,
        responses={200: ColophonSerializer(many=True)},
        examples=[
            OpenApiExample(
                'Colophon Response',
                value=[
                    {
                        'Colophon_Title': 'Django',
                        'Colophon_Icon': 'devicon-django-plain',
                        'Colophon_Link': 'https://www.djangoproject.com/'
                    }
                ],
                response_only=True,
            ),
        ],
        tags=['Information'],
    )
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def get(self, request):
        logger.debug("Colophon endpoint accessed")
        return Response(colophon.data())


class MarquesView(views.APIView):
    """
    Returns the list of computer brands and manufacturers supported by KrisPC.
    
    This endpoint is cached for 15 minutes.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get supported brands",
        description="""
        Returns a list of computer brands and manufacturers that KrisPC services and supports.
        
        Response is cached for 15 minutes for better performance.
        """,
        responses={200: MarqueSerializer(many=True)},
        examples=[
            OpenApiExample(
                'Brands Response',
                value=[
                    {
                        'Marque_Title': 'HP',
                        'Marque_Icon': 'devicon-hp-plain'
                    },
                    {
                        'Marque_Title': 'Dell',
                        'Marque_Icon': 'devicon-dell-plain'
                    }
                ],
                response_only=True,
            ),
        ],
        tags=['Information'],
    )
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def get(self, request):
        logger.debug("Brands endpoint accessed")
        return Response(marques.data())


class VillesView(views.APIView):
    """
    Returns the list of cities (villes) where KrisPC provides services.
    
    This endpoint is cached for 15 minutes.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Get service area cities",
        description="""
        Returns a list of cities in France where KrisPC provides on-site services.
        
        Response is cached for 15 minutes for better performance.
        """,
        responses={200: OpenApiTypes.OBJECT},
        examples=[
            OpenApiExample(
                'Cities Response',
                value=['Paris', 'Lyon', 'Marseille', 'Toulouse'],
                response_only=True,
            ),
        ],
        tags=['Information'],
    )
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def get(self, request):
        logger.debug("Cities endpoint accessed")
        return Response(decode_html_entities(lst_villes.data()))