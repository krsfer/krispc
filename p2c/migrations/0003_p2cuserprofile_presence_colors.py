from django.db import migrations, models


DEFAULT_PAST_PRESENCE_COLOR = "#16a34a"
DEFAULT_FUTURE_PRESENCE_COLOR = "#14532d"


class Migration(migrations.Migration):

    dependencies = [
        ("p2c", "0002_p2cuserprofile_home_location"),
    ]

    operations = [
        migrations.AddField(
            model_name="p2cuserprofile",
            name="future_presence_color",
            field=models.CharField(blank=True, default=DEFAULT_FUTURE_PRESENCE_COLOR, max_length=7),
        ),
        migrations.AddField(
            model_name="p2cuserprofile",
            name="past_presence_color",
            field=models.CharField(blank=True, default=DEFAULT_PAST_PRESENCE_COLOR, max_length=7),
        ),
    ]
