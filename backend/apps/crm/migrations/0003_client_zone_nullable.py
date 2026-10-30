import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0002_initial"),
        ("org", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="client",
            name="zone",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="clients",
                to="org.zone",
            ),
        ),
    ]
