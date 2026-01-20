import os
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from p2c.models import PlanningSnapshot
from p2c.text_processing.google_calendar_parser import GoogleCalendarTextParser

class Command(BaseCommand):
    help = 'Imports a Google Calendar text file and creates a PlanningSnapshot.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='The absolute path to the text file.')
        parser.add_argument('--username', type=str, help='The username of the user to associate the snapshot with.', required=True)

    def handle(self, *args, **options):
        file_path = options['file_path']
        username = options['username']
        User = get_user_model()

        if not os.path.exists(file_path):
            raise CommandError(f'File not found at "{file_path}"')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found.')

        with open(file_path, 'r', encoding='utf-8') as f:
            text_content = f.read()

        try:
            parser = GoogleCalendarTextParser()
            appointments = parser.parse(text_content)

            if not appointments:
                raise CommandError("Could not extract any appointments from the text.")

            # Create the PlanningSnapshot
            snapshot_data = {"appointments": appointments}
            month = appointments[0]['month']
            year = appointments[0]['year']

            snapshot = PlanningSnapshot.objects.create(
                user=user,
                data=snapshot_data,
                month=month,
                year=year,
                origin='google_text_import',
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created PlanningSnapshot {snapshot.id} with {len(appointments)} appointments.'))

        except Exception as e:
            raise CommandError(f"An error occurred during text processing: {e}")