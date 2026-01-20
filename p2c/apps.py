from django.apps import AppConfig


class P2cConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "p2c"

    def ready(self):
        # This ensures our Redis patch is applied
        from . import celery_progress_backend
        from .celery_progress_backend import apply_redis_patch

        apply_redis_patch()
