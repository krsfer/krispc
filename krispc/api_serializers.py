"""
API Serializers for the KrisPC API.

Provides data serialization and validation for API endpoints.
"""
from rest_framework import serializers


class StandardAPIResponse(serializers.Serializer):
    """
    Standard wrapper for successful API responses.
    
    Provides consistent response format across all endpoints.
    """
    success = serializers.BooleanField(
        default=True,
        help_text="Indicates if the request was successful"
    )
    data = serializers.JSONField(
        help_text="The response data"
    )
    message = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional message about the response"
    )


class ErrorResponse(serializers.Serializer):
    """
    Standard wrapper for error responses.
    """
    success = serializers.BooleanField(
        default=False,
        help_text="Indicates if the request was successful (always False for errors)"
    )
    errors = serializers.JSONField(
        help_text="Detailed error information"
    )
    message = serializers.CharField(
        help_text="Human-readable error message"
    )
    status_code = serializers.IntegerField(
        help_text="HTTP status code"
    )


class ProductSerializer(serializers.Serializer):
    """
    Serializer for product/service information.
    
    Represents a product or service offered by KrisPC.
    """
    Prd_Icon = serializers.CharField(
        max_length=100,
        help_text="Icon identifier or CSS class for the product"
    )
    Prd_Name = serializers.CharField(
        max_length=200,
        help_text="Product name"
    )
    Prd_Desc = serializers.CharField(
        max_length=1000,
        help_text="Product description"
    )
    Prd_More = serializers.CharField(
        max_length=500,
        help_text="Additional information or link text"
    )

    class Meta:
        examples = [
            {
                'Prd_Icon': 'bi-laptop',
                'Prd_Name': 'Computer Repair',
                'Prd_Desc': 'Professional computer repair services for all brands',
                'Prd_More': 'Learn more about our repair services'
            }
        ]


class ColophonSerializer(serializers.Serializer):
    """
    Serializer for colophon data (technologies used).
    
    Represents a technology or tool used in the KrisPC website.
    """
    Colophon_Title = serializers.CharField(
        max_length=200,
        help_text="Name of the technology"
    )
    Colophon_Icon = serializers.CharField(
        max_length=100,
        help_text="Icon identifier or CSS class for the technology"
    )
    Colophon_Link = serializers.URLField(
        max_length=500,
        help_text="URL to the technology's website or documentation"
    )

    class Meta:
        examples = [
            {
                'Colophon_Title': 'Django',
                'Colophon_Icon': 'devicon-django-plain',
                'Colophon_Link': 'https://www.djangoproject.com/'
            }
        ]


class MarqueSerializer(serializers.Serializer):
    """
    Serializer for brand/manufacturer information.
    
    Represents a brand or manufacturer that KrisPC works with.
    """
    Marque_Title = serializers.CharField(
        max_length=200,
        help_text="Brand name"
    )
    Marque_Icon = serializers.CharField(
        max_length=100,
        help_text="Icon identifier or logo URL for the brand"
    )

    class Meta:
        examples = [
            {
                'Marque_Title': 'HP',
                'Marque_Icon': 'devicon-hp-plain'
            }
        ]


class VilleSerializer(serializers.Serializer):
    """
    Serializer for city/location information.
    
    Simple string serializer for cities where services are offered.
    """
    ville = serializers.CharField(
        max_length=200,
        help_text="City name"
    )

