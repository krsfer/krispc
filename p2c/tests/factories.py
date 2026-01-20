import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from p2c.models import Document, P2CUserProfile

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = "Test"
    last_name = "User"

class P2CUserProfileFactory(DjangoModelFactory):
    class Meta:
        model = P2CUserProfile

    user = factory.SubFactory(UserFactory)
    google_credentials = '{"token": "fake_token", "refresh_token": "fake_refresh", "client_id": "fake_id", "client_secret": "fake_secret"}'

class DocumentFactory(DjangoModelFactory):
    class Meta:
        model = Document

    user = factory.SubFactory(UserFactory)
    file = factory.django.FileField(filename="test.pdf", data=b"%PDF-1.4 test content")
    status = Document.Status.PENDING
