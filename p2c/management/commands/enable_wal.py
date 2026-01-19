from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Enable WAL mode for SQLite database'

    def handle(self, *args, **options):
        if connection.vendor == 'sqlite':
            with connection.cursor() as cursor:
                cursor.execute('PRAGMA journal_mode=WAL;')
                row = cursor.fetchone()
                self.stdout.write(self.style.SUCCESS(f'SQLite journal mode set to: {row[0]}'))
        else:
            self.stdout.write('Not using SQLite, skipping WAL mode.')
