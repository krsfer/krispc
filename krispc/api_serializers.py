from rest_framework import serializers

class ProductSerializer(serializers.Serializer):
    Prd_Icon = serializers.CharField()
    Prd_Name = serializers.CharField()
    Prd_Desc = serializers.CharField()
    Prd_More = serializers.CharField()

class ColophonSerializer(serializers.Serializer):
    Colophon_Title = serializers.CharField()
    Colophon_Icon = serializers.CharField()
    Colophon_Link = serializers.CharField()

class MarqueSerializer(serializers.Serializer):
    Marque_Title = serializers.CharField()
    Marque_Icon = serializers.CharField()
