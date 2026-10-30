from django.core.management.base import BaseCommand

from apps.core.prototipo import FROZEN_AT, seed_prototipo
from apps.core.seed import DEV_PASSWORD


class Command(BaseCommand):
    help = (
        "Siembra los datos exactos de los prototipos Portal + App Campo "
        "y congela la fecha en 2026-10-29 11:02 America/Bogota."
    )

    def handle(self, *args, **options):
        seed_prototipo()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed prototipo listo. Fecha congelada: {FROZEN_AT.isoformat()}. "
                f"Clave: {DEV_PASSWORD}"
            )
        )
