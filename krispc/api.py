from rest_framework import viewsets, views
from rest_framework.response import Response
from .models import Contact
from .serializers import ContactSerializer
from . import lst_products, colophon, marques, lst_villes

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

class ProductsView(views.APIView):
    """
    Returns the list of products/services.
    """
    def get(self, request):
        return Response(lst_products.data())

class ColophonView(views.APIView):
    """
    Returns the colophon data (technologies used).
    """
    def get(self, request):
        return Response(colophon.data())

class MarquesView(views.APIView):
    """
    Returns the list of brands (marques).
    """
    def get(self, request):
        return Response(marques.data())

class VillesView(views.APIView):
    """
    Returns the list of cities (villes) covered.
    """
    def get(self, request):
        return Response(lst_villes.data())
