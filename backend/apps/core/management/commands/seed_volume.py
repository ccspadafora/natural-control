from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Genera volumen sintético para pruebas de rendimiento (clientes y visitas)."

    def add_arguments(self, parser):
        parser.add_argument("--clients", type=int, default=500)
        parser.add_argument("--visits-per-client", type=int, default=3)

    def handle(self, *args, **options):
        from apps.core.volume import seed_volume

        n_clients = options["clients"]
        visits = options["visits_per_client"]
        created = seed_volume(clients=n_clients, visits_per_client=visits)
        self.stdout.write(
            self.style.SUCCESS(
                f"Volumen listo: {created['clients']} clientes, {created['visits']} visitas."
            )
        )
