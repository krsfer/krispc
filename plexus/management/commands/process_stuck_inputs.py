from django.core.management.base import BaseCommand
from plexus.models import Input
from plexus.tasks import process_input
from django.conf import settings

class Command(BaseCommand):
    help = 'Process stuck inputs that have not been picked up by Celery'

    def handle(self, *args, **options):
        self.stdout.write(f"DEBUG status: {settings.DEBUG}")
        self.stdout.write(f"CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}")
        
        stuck_inputs = Input.objects.filter(processed=False)
        count = stuck_inputs.count()
        
        self.stdout.write(f"Found {count} stuck inputs.")
        
        for inp in stuck_inputs:
            self.stdout.write(f"Triggering task for Input {inp.id} created at {inp.timestamp}")
            # We use apply_async to force it to go to the queue, event if eager is on (though it shouldn't be)
            # Actually delay() respects eager settings.
            try:
                result = process_input.delay(inp.id)
                self.stdout.write(f"Task sent: {result.id}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send task: {e}"))
