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
        # Content is now optional, so this should be valid
        self.assertTrue(serializer.is_valid())

    def test_input_serializer_with_image(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        image_content = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
        image = SimpleUploadedFile(name='test.gif', content=image_content, content_type='image/gif')
        
        data = {
            "source": "api",
            "image": image
        }
        serializer = InputSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["image"].name, "test.gif")

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
