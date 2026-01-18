from django.test import TestCase
from django.urls import reverse

class IndexViewTest(TestCase):
    def test_index_view_success(self):
        url = reverse("plexus:index")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "plexus/index.html")
        self.assertContains(response, "Welcome to your Second Brain")
