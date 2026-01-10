from rest_framework import serializers
from .models import Contact

class ContactSerializer(serializers.ModelSerializer):
    # Honeypot field: should be left empty by humans
    website = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = Contact
        fields = ['id', 'firstname', 'surname', 'from_email', 'message', 'website']
        read_only_fields = ['id']

    def validate(self, data):
        # If the honeypot field 'website' is filled, it's likely a bot.
        if data.get('website'):
            raise serializers.ValidationError("Invalid submission.")
        
        # Remove the honeypot field from the data so it doesn't cause issues with the model
        data.pop('website', None)
        return data

    def validate_message(self, value):
        if len(value) < 10:
             raise serializers.ValidationError("Message is too short (min 10 characters).")
        return value