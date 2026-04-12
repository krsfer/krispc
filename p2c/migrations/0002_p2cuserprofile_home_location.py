from django.db import migrations, models


DEFAULT_HOME_LOCATION = "63 Chemin du Claus, 06110 Le Cannet"


class Migration(migrations.Migration):

    dependencies = [
        ("p2c", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="p2cuserprofile",
            name="home_location",
            field=models.CharField(blank=True, default=DEFAULT_HOME_LOCATION, max_length=255),
        ),
    ]
