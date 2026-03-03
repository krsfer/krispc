from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.db import connection
from django.utils import timezone

from sas.models import SasAccessLog


logger = logging.getLogger(__name__)


@shared_task
def purge_old_access_logs() -> int:
    retention_days = 30
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted_count, _details = SasAccessLog.objects.filter(created_at__lt=cutoff).delete()
    logger.info("sas_access_log_purge", extra={"sas_maintenance": {"deleted_count": deleted_count}})
    return int(deleted_count)


@shared_task
def vacuum_sqlite_database() -> bool:
    if connection.vendor != "sqlite":
        logger.info(
            "sas_vacuum_skipped",
            extra={"sas_maintenance": {"reason": "non_sqlite_backend", "vendor": connection.vendor}},
        )
        return False

    with connection.cursor() as cursor:
        cursor.execute("VACUUM")
    logger.info("sas_vacuum_completed", extra={"sas_maintenance": {"vendor": connection.vendor}})
    return True
