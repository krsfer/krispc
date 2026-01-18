from django.test import TestCase
from django.utils import timezone
from plexus.models import Input, Thought
from plexus.services.surfacing import get_on_this_day, get_random_resurface

class SurfacingServiceTest(TestCase):
    def setUp(self):
        self.now = timezone.now()
        
        # 1. Thought from exactly 1 year ago (Should appear in On This Day)
        last_year = self.now - timezone.timedelta(days=365)
        input_last_year = Input.objects.create(content="Last year input")
        # Manually set timestamp (auto_now_add=True won't allow it via create usually, 
        # but we can update it or use a mock)
        Input.objects.filter(pk=input_last_year.pk).update(timestamp=last_year)
        input_last_year.refresh_from_db()
        
        self.thought_last_year = Thought.objects.create(
            input=input_last_year,
            content="Old thought",
            type="ideation",
            confidence_score=1.0
        )

        # 2. Recent thought (Should NOT appear in On This Day or Random)
        input_recent = Input.objects.create(content="Recent input")
        self.thought_recent = Thought.objects.create(
            input=input_recent,
            content="New thought",
            type="ideation",
            confidence_score=1.0
        )

    def test_get_on_this_day(self):
        results = get_on_this_day()
        self.assertIn(self.thought_last_year, results)
        self.assertNotIn(self.thought_recent, results)

    def test_get_random_resurface(self):
        # Setup another old thought (> 30 days)
        old_date = self.now - timezone.timedelta(days=45)
        input_old = Input.objects.create(content="Old input")
        Input.objects.filter(pk=input_old.pk).update(timestamp=old_date)
        input_old.refresh_from_db()
        
        thought_old = Thought.objects.create(
            input=input_old,
            content="Random candidate",
            type="ideation",
            confidence_score=1.0
        )
        
        # Should return either thought_last_year or thought_old
        result = get_random_resurface()
        self.assertIsNotNone(result)
        self.assertIn(result, [self.thought_last_year, thought_old])
        self.assertNotEqual(result, self.thought_recent)
