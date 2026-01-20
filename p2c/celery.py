from __future__ import absolute_import, unicode_literals

import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "p2c_config.settings")

# Create the Celery app
app = Celery("p2c")

# Configure Celery to use RabbitMQ
app.conf.update(
    broker_url="amqp://guest:guest@localhost:5672//",
    result_backend="rpc://",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    enable_utc=True,
)

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
