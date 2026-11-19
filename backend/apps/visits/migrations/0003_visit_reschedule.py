import apps.core.ids
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("visits", "0002_gps_review_informacion_solicitada"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="visit",
            name="reschedule_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="VisitReschedule",
            fields=[
                ("id", models.UUIDField(default=apps.core.ids.uuid7, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("version", models.PositiveIntegerField(default=1)),
                ("previous_start", models.DateTimeField()),
                ("previous_end", models.DateTimeField(blank=True, null=True)),
                ("new_start", models.DateTimeField()),
                ("new_end", models.DateTimeField(blank=True, null=True)),
                ("reason", models.CharField(blank=True, max_length=250)),
                ("month_key", models.CharField(db_index=True, max_length=7)),
                (
                    "changed_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "rtc",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="visit_reschedules",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "visit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reschedules",
                        to="visits.visit",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="visitreschedule",
            index=models.Index(fields=["rtc", "month_key"], name="visits_resched_rtc_month_idx"),
        ),
        migrations.AddIndex(
            model_name="visitreschedule",
            index=models.Index(fields=["visit", "-created_at"], name="visits_resched_visit_idx"),
        ),
    ]
