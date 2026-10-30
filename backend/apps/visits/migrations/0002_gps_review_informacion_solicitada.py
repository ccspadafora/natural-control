from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("visits", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gpscheck",
            name="review_status",
            field=models.CharField(
                choices=[
                    ("NO_REQUERIDA", "No requerida"),
                    ("PENDIENTE", "Pendiente"),
                    ("INFORMACION_SOLICITADA", "Información solicitada"),
                    ("JUSTIFICADA", "Justificada"),
                    ("RECHAZADA", "Rechazada"),
                ],
                default="NO_REQUERIDA",
                max_length=32,
            ),
        ),
    ]
