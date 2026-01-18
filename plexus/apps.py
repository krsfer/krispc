from django.apps import AppConfig


class PlexusConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "plexus"

    def ready(self):
        import plexus.signals