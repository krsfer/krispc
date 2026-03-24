from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="StreamConfig",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="MediaMTX path name (must match the path configured in mediamtx.yml)",
                        max_length=100,
                        unique=True,
                    ),
                ),
                ("display_name", models.CharField(blank=True, max_length=200)),
                (
                    "rtsp_source",
                    models.CharField(
                        blank=True,
                        help_text="RTSP source URL for pull mode (leave blank for push mode)",
                        max_length=500,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                ("enabled", models.BooleanField(default=True)),
                (
                    "record",
                    models.BooleanField(
                        default=False,
                        help_text="Enable recording for this stream",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
    ]
