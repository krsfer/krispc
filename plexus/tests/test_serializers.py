from django.test import TestCase
from plexus.models import Input
from plexus.serializers import InputSerializer

class InputSerializerTest(TestCase):
    def test_input_serializer_valid_data(self):
        data = {
            "content": "A test thought",
            "source": "api"
        }
        serializer = InputSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["content"], "A test thought")
        self.assertEqual(serializer.validated_data["source"], "api")

    def test_input_serializer_missing_content(self):
        data = {
            "source": "api"
        }
        serializer = InputSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("content", serializer.errors)

    def test_input_serializer_default_source(self):
        data = {
            "content": "Only content"
        }
        serializer = InputSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        # source has default 'web' in model, but serializer might need to handle it
        # or it will be filled by the model on save.
        instance = serializer.save()
        self.assertEqual(instance.source, "web")
