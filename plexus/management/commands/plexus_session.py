from django.core.management.base import BaseCommand
from plexus.models import Input
from plexus.services.processor import InputProcessor
import sys

class Command(BaseCommand):
    help = "Starts an interactive session to process pending inputs (Session-Based Pattern)"

    def handle(self, *args, **options):
        pending_inputs = Input.objects.filter(processed=False).order_by('timestamp')
        
        if not pending_inputs.exists():
            self.stdout.write(self.style.SUCCESS("No pending inputs found. Your inbox is clear!"))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(f"Found {pending_inputs.count()} pending inputs. Starting session..."))
        
        for input_obj in pending_inputs:
            self.stdout.write("\n" + "="*50)
            self.stdout.write(f"INPUT ID: {input_obj.id} | SOURCE: {input_obj.source}")
            self.stdout.write(f"RAW CONTENT: {input_obj.content}")
            if input_obj.image:
                self.stdout.write(f"IMAGE: {input_obj.image.url}")
            
            choice = input("Process this item? [Y/n/skip/quit]: ").lower().strip()
            
            if choice == 'quit' or choice == 'q':
                self.stdout.write(self.style.WARNING("Ending session."))
                break
            elif choice == 'skip' or choice == 's':
                self.stdout.write("Skipping...")
                continue
            elif choice == 'n':
                input_obj.processed = True
                input_obj.save()
                self.stdout.write(self.style.NOTICE("Marked as processed (dismissed)."))
                continue
            
            # Default to Yes
            self.stdout.write("Processing with AI...")
            processor = InputProcessor(input_obj)
            result = processor.process()
            
            if isinstance(result, str):
                self.stdout.write(self.style.WARNING(result))
            else:
                self.stdout.write(self.style.SUCCESS(f"Successfully created {result.type} Thought: {result.id}"))
                self.stdout.write(f"REFINED: {result.content}")
                for action in result.actions.all():
                    self.stdout.write(f" -> ACTION: {action.description}")

        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS("Session complete."))
