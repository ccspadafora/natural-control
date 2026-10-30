import csv
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Role
from apps.catalog.models import Category, Price, PriceList, Product
from apps.catalog.price_pdf import parse_price_pdf, presentation_unit, sku_for, zone_code_for_pdf
from apps.crm.client_import import DEPARTMENTS, fold, read_sales, rtc_zones
from apps.crm.models import Client, ClientKind, ClientSource, ClientType, CommercialStatus, DocumentType, Site
from apps.geo.models import Department, Municipality
from apps.integrations.models import ErpSale
from apps.org.models import Zone


class Command(BaseCommand):
    help = "Carga el Excel de ventas como clientes y las listas de precios de los PDF por zona."

    def add_arguments(self, parser):
        parser.add_argument("directory", help="Carpeta con CLIENTES (1).xlsx y los PDF de precios")

    def handle(self, *args, **options):
        folder = Path(options["directory"])
        workbook = next(folder.glob("CLIENTES*.xlsx"), None)
        if workbook is None:
            self.stderr.write("No está el Excel de clientes.")
            return
        with transaction.atomic():
            prices = self._prices(folder)
            clients, exceptions, sales = self._clients(workbook)
        report = Path("/app/var")
        report.mkdir(exist_ok=True)
        target = report / "clientes-excepciones.csv"
        with target.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["row", "reason", "name", "rtc", "city"])
            writer.writeheader()
            writer.writerows(exceptions)
        self.stdout.write(self.style.SUCCESS(
            f"Precios: {prices}. Clientes: {clients}. Ventas: {sales}. Excepciones: {len(exceptions)} en {target}."
        ))

    def _prices(self, folder: Path) -> dict[str, int]:
        category, _ = Category.objects.get_or_create(name="Bioinsumos", defaults={"sort_order": 1})
        counts = {}
        for path in sorted(folder.glob("*.pdf")):
            code = zone_code_for_pdf(path.name)
            if code is None:
                continue
            zone = Zone.objects.get(code=code)
            price_list = PriceList.objects.get(zone=zone, is_default=True, is_deleted=False)
            written = 0
            for name, prices in parse_price_pdf(path):
                for presentation, amount in prices.items():
                    unit, size = presentation_unit(presentation)
                    product, _ = Product.objects.get_or_create(
                        sku=sku_for(name, presentation),
                        defaults={
                            "name": name.title(),
                            "category": category,
                            "presentation": presentation,
                            "unit": unit,
                            "unit_size": size,
                        },
                    )
                    Price.objects.update_or_create(
                        price_list=price_list,
                        product=product,
                        defaults={"unit_price": amount.quantize(Decimal("0.01")), "currency": "COP", "is_deleted": False},
                    )
                    written += 1
            counts[code] = written
        return counts

    def _clients(self, workbook: Path) -> tuple[int, list[dict], int]:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        people, exceptions, sales = read_sales(workbook)
        role = Role.objects.get(code="RTC")
        zones = {zone.code: zone for zone in Zone.objects.filter(is_deleted=False)}
        lists = {
            item.zone.code: item
            for item in PriceList.objects.filter(is_default=True, is_deleted=False, zone__isnull=False).select_related("zone")
        }
        farmer, _ = ClientType.objects.get_or_create(name="Agricultor", defaults={"is_active": True})
        home = {name: zones.get(code) for name, code in rtc_zones(people).items()}
        sellers = {}
        for client in people:
            name = client["rtc"] or "Sin comercial"
            if name in sellers:
                continue
            sellers[name] = self._seller(User, role, name, home.get(name))
        towns = {}
        saved = {}
        for client in people:
            owner = sellers[client["rtc"] or "Sin comercial"]
            zone = zones.get(client["zone_code"] or "")
            record = self._upsert(client, owner, zone, lists.get(client["zone_code"] or ""), farmer, towns)
            saved[client["document"]] = record
        ErpSale.objects.filter(erp_document__startswith="NC-XLSX-").delete()
        batch = []
        kept = 0
        for sale in sales:
            if sale["date"] is None:
                continue
            seller = sellers.get(sale["rtc"])
            batch.append(
                ErpSale(
                    erp_document=f"NC-XLSX-{sale['row']:06d}",
                    erp_line="1",
                    date=sale["date"],
                    client=saved.get(sale["document"]),
                    erp_customer_code=sale["document"][:40],
                    seller=seller,
                    erp_seller_code=sale["rtc"][:40],
                    erp_product_code=sale["product"][:40],
                    quantity=sale["quantity"],
                    net_amount=sale["amount"].quantize(Decimal("0.01")),
                    raw={"crop": sale["crop"], "city": sale["city"], "department": sale["department"], "name": sale["name"]},
                )
            )
            kept += 1
            if len(batch) == 2000:
                ErpSale.objects.bulk_create(batch)
                batch = []
        if batch:
            ErpSale.objects.bulk_create(batch)
        return len(saved), exceptions, kept

    def _seller(self, User, role, name, zone):
        slug = "".join(char if char.isalnum() else "." for char in fold(name).lower())
        slug = ".".join(part for part in slug.split(".") if part)[:50] or "comercial"
        email = f"{slug}@naturalcontrol.test"
        user = User.objects.filter(email=email).first()
        parts = name.split()
        if user is None:
            return User.objects.create_user(
                email=email,
                password=None,
                role=role,
                first_name=parts[0][:80] if parts else "",
                last_name=" ".join(parts[1:])[:80],
                zone=zone,
            )
        return user

    def _upsert(self, client, owner, zone, price_list, farmer, towns):
        number = client["document"]
        kind = ClientKind.EMPRESA if client["company"] else ClientKind.PERSONA
        document_type = DocumentType.NIT if client["company"] else DocumentType.CC
        town = self._town(client["department"], client["city"], towns)
        record = Client.objects.filter(document_number=number, is_deleted=False).first()
        if record is None:
            record = Client.objects.create(
                kind=kind,
                document_type=document_type,
                document_number=number,
                legal_name=client["name"],
                client_type=farmer,
                commercial_status=CommercialStatus.ACTIVO,
                owner=owner,
                zone=zone,
                price_list=price_list,
                phone=client["phone"],
                email=client["email"],
                source=ClientSource.IMPORT,
            )
        else:
            record.legal_name = client["name"]
            record.kind = kind
            record.document_type = document_type
            record.owner = owner
            record.zone = zone
            record.price_list = price_list
            record.phone = client["phone"]
            record.email = client["email"]
            record.commercial_status = CommercialStatus.ACTIVO
            record.source = ClientSource.IMPORT
            record.save()
        site = record.sites.filter(is_primary=True, is_deleted=False).first()
        if site is None:
            Site.objects.create(
                client=record,
                name=town.name[:120],
                is_primary=True,
                municipality=town,
                address=client["address"],
            )
        else:
            site.municipality = town
            site.address = client["address"]
            site.name = town.name[:120]
            site.save()
        return record

    def _town(self, department_name, city_name, towns):
        code, label = DEPARTMENTS[fold(department_name)]
        department, _ = Department.objects.get_or_create(code=code, defaults={"name": label})
        city = fold(city_name) or "SIN MUNICIPIO"
        key = (code, city)
        if key in towns:
            return towns[key]
        found = None
        for item in Municipality.objects.filter(department=department):
            if fold(item.name) == city:
                found = item
                break
        if found is None:
            sequence = Municipality.objects.filter(code__startswith=f"imp{code}").count() + 1
            found = Municipality.objects.create(
                code=f"imp{code}{sequence:03d}",
                name=(city_name or "Sin municipio").title()[:80],
                department=department,
            )
        towns[key] = found
        return found
