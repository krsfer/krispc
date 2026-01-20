import os
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from p2c.models import Document, PlanningSnapshot
from p2c.pdf_processing.parser_factory import PDFParserFactory
from p2c.config.caregiver_settings import normalize_caregiver_name

class Command(BaseCommand):
    help = 'Imports a PDF from a local file path and creates a PlanningSnapshot.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='The absolute path to the PDF file.')
        parser.add_argument('--username', type=str, help='The username of the user to associate the document with. Defaults to the first user found.')

    def handle(self, *args, **options):
        file_path = options['file_path']
        username = options['username']
        User = get_user_model()

        if not os.path.exists(file_path):
            raise CommandError(f'File not found at "{file_path}"')

        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(f'User "{username}" not found.')
        else:
            user = User.objects.first()
            if not user:
                raise CommandError('No users found in the database. Please specify a username.')
            self.stdout.write(self.style.WARNING(f'No username provided. Using the first user found: {user.username}'))

        file_name = os.path.basename(file_path)
        
        # 1. Create a Document object
        document = Document(user=user)
        with open(file_path, 'rb') as f:
            document.file.save(file_name, File(f), save=True)
        self.stdout.write(self.style.SUCCESS(f'Successfully saved document "{file_name}".'))

        # 2. Process the PDF to extract appointments
        try:
            parser = PDFParserFactory.create_parser(document.file.path)
            appointments = parser.extract_schedule_entries(document.file.path)
            
            if not appointments:
                raise CommandError("Could not extract any appointments from the PDF.")

            # 3. Normalize the extracted data into the format expected by PlanningSnapshot
            formatted_appointments = []
            for apt in appointments:
                try:
                    # Normalize caregiver names
                    description = normalize_caregiver_name(apt.get("beneficiary", "").strip())
                    
                    formatted_appointments.append({
                        "day": apt["start_time"].day,
                        "month": apt["start_time"].month,
                        "year": apt["start_time"].year,
                        "start_time": apt["start_time"].strftime("%H:%M"),
                        "end_time": apt["end_time"].strftime("%H:%M"),
                        "description": description,
                        "normalized_name": description,
                        "location": apt.get("location", ""),
                        "event_description": apt.get("event_description", ""),
                    })
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Skipping an appointment due to formatting error: {e}"))
                    continue
            
            if not formatted_appointments:
                raise CommandError("No valid appointments could be formatted.")

            # 4. Create the PlanningSnapshot
            snapshot_data = {"appointments": formatted_appointments}
            month = formatted_appointments[0]['month']
            year = formatted_appointments[0]['year']

            snapshot = PlanningSnapshot.objects.create(
                user=user,
                data=snapshot_data,
                month=month,
                year=year,
                origin='pdf_import_command',
                document=document
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created PlanningSnapshot {snapshot.id} with {len(formatted_appointments)} appointments.'))

        except Exception as e:
            raise CommandError(f"An error occurred during PDF processing: {e}")
