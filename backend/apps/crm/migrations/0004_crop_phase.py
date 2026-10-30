from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0003_client_zone_nullable"),
    ]

    operations = [
        migrations.AddField(
            model_name="crop",
            name="phase",
            field=models.CharField(
                choices=[("PRODUCCION", "Producción"), ("SIEMBRA", "Siembra")],
                default="PRODUCCION",
                max_length=16,
            ),
        ),
    ]
