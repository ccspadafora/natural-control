from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("geo", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="municipality",
            name="code",
            field=models.CharField(max_length=12, unique=True),
        ),
    ]
