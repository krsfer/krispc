from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Lists all users in the database.'

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()
        if not users:
            self.stdout.write('No users found in the database.')
            return

        self.stdout.write(self.style.SUCCESS('Available users:'))
        for user in users:
            self.stdout.write(f'- {user.username}')