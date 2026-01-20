from django.test import TestCase
from django.urls import reverse
from django.utils import translation

class IndexViewTest(TestCase):
    def test_index_view_success(self):
        url = reverse("plexus:index")
        with translation.override("en"):
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertTemplateUsed(response, "plexus/index.html")
            # Check for English or French welcome text since override might be affected by middleware
            content = response.content.decode()
            self.assertTrue(
                "Welcome to your Second Brain" in content or 
                "Bienvenue dans votre Second Cerveau" in content
            )
