from django.test import TestCase
from plexus.models import SystemConfiguration

class SystemConfigurationTest(TestCase):
    def test_singleton_pattern(self):
        """
        Test that only one SystemConfiguration object can exist.
        The `get_solo` method (if using django-solo or similar logic)
        or custom save logic should enforce this.
        For now, we will test our custom `get_solo` implementation.
        """
        config1 = SystemConfiguration.get_solo()
        config2 = SystemConfiguration.get_solo()
        
        self.assertEqual(config1, config2)
        self.assertEqual(SystemConfiguration.objects.count(), 1)

    def test_default_values(self):
        config = SystemConfiguration.get_solo()
        self.assertEqual(config.active_ai_provider, "gemini")
        self.assertEqual(config.active_redis_env, "local")

    def test_update_configuration(self):
        config = SystemConfiguration.get_solo()
        config.active_ai_provider = "openai"
        config.active_redis_env = "cloud"
        config.save()
        
        config.refresh_from_db()
        self.assertEqual(config.active_ai_provider, "openai")
        self.assertEqual(config.active_redis_env, "cloud")
