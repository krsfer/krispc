from datetime import timedelta

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from sas.models import SasAccessLog, SasFile
from sas.tasks import purge_old_access_logs, vacuum_sqlite_database


@pytest.mark.django_db
def test_purge_old_access_logs_deletes_entries_older_than_30_days():
    share = SasFile.objects.create(
        caption="Purge target",
        file=SimpleUploadedFile("purge.txt", b"payload"),
    )

    old_log = SasAccessLog.objects.create(share=share, was_allowed=False, reason="old")
    recent_log = SasAccessLog.objects.create(share=share, was_allowed=True, reason="recent")

    SasAccessLog.objects.filter(pk=old_log.pk).update(created_at=timezone.now() - timedelta(days=31))
    SasAccessLog.objects.filter(pk=recent_log.pk).update(created_at=timezone.now() - timedelta(days=5))

    deleted_count = purge_old_access_logs()

    assert deleted_count == 1
    assert SasAccessLog.objects.filter(pk=old_log.pk).exists() is False
    assert SasAccessLog.objects.filter(pk=recent_log.pk).exists() is True


@pytest.mark.django_db
def test_vacuum_sqlite_database_executes_vacuum_statement(mocker):
    cursor = mocker.MagicMock()
    cursor.__enter__.return_value = cursor
    mocked_connection = mocker.Mock(vendor="sqlite")
    mocked_connection.cursor.return_value = cursor
    mocker.patch("sas.tasks.connection", mocked_connection)

    result = vacuum_sqlite_database()

    assert result is True
    cursor.execute.assert_called_once_with("VACUUM")


@pytest.mark.django_db
def test_vacuum_sqlite_database_is_noop_for_non_sqlite_backend(mocker):
    mocked_connection = mocker.Mock(vendor="postgresql")
    mocker.patch("sas.tasks.connection", mocked_connection)

    result = vacuum_sqlite_database()

    assert result is False


def test_celery_schedule_contains_sas_retention_and_vacuum_jobs():
    schedule = settings.CELERY_BEAT_SCHEDULE

    assert "sas-purge-old-access-logs" in schedule
    assert schedule["sas-purge-old-access-logs"]["task"] == "sas.tasks.purge_old_access_logs"
    assert "sas-vacuum-sqlite-database" in schedule
    assert schedule["sas-vacuum-sqlite-database"]["task"] == "sas.tasks.vacuum_sqlite_database"
