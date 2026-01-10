from rest_framework import viewsets, views, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiTypes
from .models import Contact
from .serializers import ContactSerializer
from .api_serializers import ProductSerializer, ColophonSerializer, MarqueSerializer
from . import lst_products, colophon, marques, lst_villes
from .services import send_contact_email

class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows contacts to be created (public) or viewed (admin only).
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    throttle_scope = 'contacts'

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        GET: Admin only
        POST: AllowAny
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        Save the contact and trigger email notification.
        """
        contact = serializer.save()
        
        # Send email notification
        send_contact_email(
            firstname=contact.firstname,
            surname=contact.surname,
            client_email=contact.from_email,
            msg=contact.message
        )

class ProductsView(views.APIView):
    """
    Returns the list of products/services.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'
    
    @extend_schema(responses=ProductSerializer(many=True))
    def get(self, request):
        return Response(lst_products.data())

class ColophonView(views.APIView):
    """
    Returns the colophon data (technologies used).
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'

    @extend_schema(responses=ColophonSerializer(many=True))
    def get(self, request):
        return Response(colophon.data())

class MarquesView(views.APIView):
    """
    Returns the list of brands (marques).
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'

    @extend_schema(responses=MarqueSerializer(many=True))
    def get(self, request):
        return Response(marques.data())

class VillesView(views.APIView):
    """
    Returns the list of cities (villes) covered.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'read_only'

    @extend_schema(responses=OpenApiTypes.STR) # Returns a list of strings
    def get(self, request):
        return Response(lst_villes.data())
