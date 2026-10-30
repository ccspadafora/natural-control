from django.core.management.base import BaseCommand

from apps.core.seed import DEV_PASSWORD, seed


class Command(BaseCommand):
    help = "Siembra roles, parámetros, zonas con lista de precios y usuarios de desarrollo."

    def handle(self, *args, **options):
        seed()
        self.stdout.write(self.style.SUCCESS(f"Siembra lista. Clave de desarrollo: {DEV_PASSWORD}"))
