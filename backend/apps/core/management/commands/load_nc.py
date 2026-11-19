import csv
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role
from apps.catalog.models import Category, Price, PriceList, Product, Unit
from apps.catalog.price_pdf import parse_price_pdf, presentation_unit, sku_for, zone_code_for_pdf
from apps.crm.client_import import (
    DEPARTMENTS,
    fold,
    read_directory,
    read_products_catalog,
    read_programming_links,
    read_rtc_roster,
    read_sales,
    rtc_zones,
)
from apps.crm.models import (
    Client,
    ClientKind,
    ClientSource,
    ClientType,
    CommercialStatus,
    Crop,
    CropPhase,
    CropType,
    DocumentType,
    Site,
)
from apps.geo.models import Department, Municipality
from apps.integrations.models import ErpSale
from apps.org.models import Zone
from apps.parameters.models import SystemSetting, ValueType


ZONE_SEED = [
    ("ORIENTE", "Oriente antioqueño"),
    ("URABA", "Urabá"),
    ("ANTIOQUIA", "Antioquia"),
    ("EJE", "Eje cafetero"),
    ("VALLE", "Valle del Cauca"),
    ("CUNDINAMARCA", "Cundinamarca y Boyacá"),
    ("SANTANDER", "Santanderes"),
    ("NSANTANDER", "Norte de Santander"),
    ("SURCESAR", "Sur del Cesar"),
    ("TOLIMA", "Tolima y Huila"),
    ("MERCADEO", "Mercadeo"),
    ("DNV", "DNV"),
]


class Command(BaseCommand):
    help = "Carga Excel de clientes/ventas, roster/productos BASE DE DATOS y PDFs de precios. Sin descartar filas."

    def add_arguments(self, parser):
        parser.add_argument("directory", help="Carpeta NC/ con CLIENTES*.xlsx, BASE DE DATOS*.xlsx y PDFs")

    def handle(self, *args, **options):
        folder = Path(options["directory"])
        clients_wb = next(folder.glob("CLIENTES*.xlsx"), None)
        roster_wb = next(folder.glob("BASE DE DATOS*.xlsx"), None)
        if clients_wb is None:
            self.stderr.write("No está el Excel de clientes (CLIENTES*.xlsx).")
            return
        with transaction.atomic():
            zones = self._ensure_zones()
            prices = self._prices(folder, zones)
            if roster_wb:
                products_n = self._catalog_products(roster_wb)
                roster_n = self._roster(roster_wb, zones)
                links_n = self._programming_links(roster_wb)
            else:
                products_n = roster_n = links_n = 0
            clients, exceptions, sales, crops = self._clients(clients_wb, zones)
        report = Path("/app/var") if Path("/app/var").exists() else folder / "var"
        report.mkdir(parents=True, exist_ok=True)
        target = report / "clientes-excepciones.csv"
        with target.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["row", "reason", "name", "rtc", "city"])
            writer.writeheader()
            writer.writerows(exceptions)
        self.stdout.write(
            self.style.SUCCESS(
                f"Zonas listas. Precios: {prices}. Productos catálogo: {products_n}. "
                f"RTCs roster: {roster_n}. Links prog: {links_n}. "
                f"Clientes: {clients}. Ventas: {sales}. Cultivos: {crops}. "
                f"Excepciones: {len(exceptions)} en {target}."
            )
        )

    def _ensure_zones(self) -> dict[str, Zone]:
        out = {}
        for code, name in ZONE_SEED:
            zone = Zone.objects.filter(code=code).first()
            if zone is None:
                # name is unique — avoid clash with an existing differently-coded zone
                if Zone.objects.filter(name=name).exists():
                    name = f"{name} ({code})"
                zone = Zone.objects.create(code=code, name=name)
            else:
                zone.is_deleted = False
                zone.save(update_fields=["is_deleted"])
            if not PriceList.objects.filter(zone=zone, is_default=True, is_deleted=False).exists():
                PriceList.objects.create(
                    zone=zone,
                    name=f"Lista {zone.name}",
                    valid_from=timezone.localdate(),
                    is_default=True,
                )
            out[code] = zone
        for zone in Zone.objects.filter(is_deleted=False):
            out.setdefault(zone.code, zone)
        return out

    def _prices(self, folder: Path, zones: dict[str, Zone]) -> dict[str, int]:
        category, _ = Category.objects.get_or_create(name="Bioinsumos", defaults={"sort_order": 1})
        counts = {}
        for path in sorted(folder.glob("*.pdf")):
            code = zone_code_for_pdf(path.name)
            if code is None:
                continue
            zone = zones.get(code) or Zone.objects.filter(code=code, is_deleted=False).first()
            if zone is None:
                continue
            price_list = PriceList.objects.filter(zone=zone, is_default=True, is_deleted=False).first()
            if price_list is None:
                price_list = PriceList.objects.create(
                    zone=zone,
                    name=f"Lista {zone.name}",
                    valid_from=timezone.localdate(),
                    is_default=True,
                )
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

    def _catalog_products(self, workbook: Path) -> int:
        category, _ = Category.objects.get_or_create(name="Catálogo NC", defaults={"sort_order": 2})
        analysis, _ = Category.objects.get_or_create(name="Análisis de laboratorio", defaults={"sort_order": 3})
        written = 0
        for row in read_products_catalog(workbook):
            presentation = row["presentation"]
            name = row["name"]
            is_lab = "ANALISIS" in fold(presentation) or "ANALISIS" in fold(name) or "SERVICIO" in fold(presentation)
            cat = analysis if is_lab else category
            try:
                unit, size = presentation_unit(presentation)
            except Exception:
                unit, size = Unit.UNIDAD, Decimal("1")
            if unit not in {choice.value for choice in Unit}:
                unit = Unit.UNIDAD
            sku = sku_for(name, presentation)[:40] or f"NC-{written+1:04d}"
            Product.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name[:120],
                    "category": cat,
                    "presentation": presentation[:80] or "UND",
                    "unit": unit,
                    "unit_size": size or Decimal("1"),
                    "is_active": True,
                    "is_deleted": False,
                },
            )
            written += 1
        return written

    def _roster(self, workbook: Path, zones: dict[str, Zone]) -> int:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        role = Role.objects.get(code="RTC")
        count = 0
        for row in read_rtc_roster(workbook):
            zone = zones.get(row["zone_code"] or "") if row["zone_code"] else None
            self._seller(User, role, row["name"], zone)
            count += 1
        return count

    def _programming_links(self, workbook: Path) -> int:
        links = {row["name"]: row["url"] for row in read_programming_links(workbook) if row.get("url")}
        if not links:
            return 0
        SystemSetting.objects.update_or_create(
            key="programming.sheet_links",
            defaults={
                "value": links,
                "value_type": ValueType.JSON,
                "module": "visits",
                "description": "Links de programación semanal por RTC (Google Sheets)",
                "editable_by_role": ["GERENCIA", "ADMIN"],
                "is_deleted": False,
            },
        )
        return len(links)

    def _clients(self, workbook: Path, zones: dict[str, Zone]) -> tuple[int, list[dict], int, int]:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        people, exceptions, sales = read_sales(workbook)
        directory = read_directory(workbook)
        by_doc = {p["document"]: p for p in people}
        for row in directory:
            if row["document"] not in by_doc:
                by_doc[row["document"]] = row
            else:
                current = by_doc[row["document"]]
                if not current.get("phone") and row.get("phone"):
                    current["phone"] = row["phone"]
                if not current.get("email") and row.get("email"):
                    current["email"] = row["email"]
                if not current.get("address") and row.get("address"):
                    current["address"] = row["address"]
        people = list(by_doc.values())

        role = Role.objects.get(code="RTC")
        lists = {
            item.zone.code: item
            for item in PriceList.objects.filter(is_default=True, is_deleted=False, zone__isnull=False).select_related(
                "zone"
            )
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
        crop_types: dict[str, CropType] = {}
        crops_n = 0
        for client in people:
            owner = sellers[client["rtc"] or "Sin comercial"]
            zone = zones.get(client["zone_code"] or "") if client.get("zone_code") else None
            record = self._upsert(client, owner, zone, lists.get(client.get("zone_code") or ""), farmer, towns)
            saved[client["document"]] = record
            crop_name = (client.get("crop") or "").strip()
            if crop_name and fold(crop_name) not in {"CLIENTES DIRECTOS", "N/A", "NA", "-"}:
                crops_n += self._ensure_crop(record, crop_name, client.get("date"), crop_types)

        # Cultivos adicionales desde historial de ventas
        for sale in sales:
            crop_name = (sale.get("crop") or "").strip()
            client = saved.get(sale["document"])
            if not client or not crop_name or fold(crop_name) in {"CLIENTES DIRECTOS", "N/A", "NA", "-"}:
                continue
            crops_n += self._ensure_crop(client, crop_name, sale.get("date"), crop_types)

        ErpSale.objects.filter(erp_document__startswith="NC-XLSX-").delete()
        batch = []
        kept = 0
        for sale in sales:
            sold_on = sale["date"] or date_fallback()
            seller = sellers.get(sale["rtc"])
            batch.append(
                ErpSale(
                    erp_document=f"NC-XLSX-{sale['row']:06d}",
                    erp_line="1",
                    date=sold_on,
                    client=saved.get(sale["document"]),
                    erp_customer_code=sale["document"][:40],
                    seller=seller,
                    erp_seller_code=(sale["rtc"] or "")[:40],
                    erp_product_code=(sale["product"] or "")[:40],
                    quantity=sale["quantity"],
                    net_amount=sale["amount"].quantize(Decimal("0.01")),
                    raw={
                        "crop": sale["crop"],
                        "city": sale["city"],
                        "department": sale["department"],
                        "name": sale["name"],
                    },
                )
            )
            kept += 1
            if len(batch) == 2000:
                ErpSale.objects.bulk_create(batch)
                batch = []
        if batch:
            ErpSale.objects.bulk_create(batch)
        return len(saved), exceptions, kept, crops_n

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
                first_name=(parts[0][:80] if parts else ""),
                last_name=" ".join(parts[1:])[:80],
                zone=zone,
            )
        if zone and user.zone_id is None:
            user.zone = zone
            user.save(update_fields=["zone"])
        return user

    def _upsert(self, client, owner, zone, price_list, farmer, towns):
        number = client["document"]
        kind = ClientKind.EMPRESA if client["company"] else ClientKind.PERSONA
        document_type = DocumentType.NIT if client["company"] else DocumentType.CC
        town = self._town(client.get("department_key") or client["department"], client["city"], towns)
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
            record.phone = client["phone"] or record.phone
            record.email = client["email"] or record.email
            record.commercial_status = CommercialStatus.ACTIVO
            record.source = ClientSource.IMPORT
            record.save()
        site = record.sites.filter(is_primary=True, is_deleted=False).first()
        if site is None:
            Site.objects.create(
                client=record,
                name=(town.name[:120] if town else "Sede principal"),
                is_primary=True,
                municipality=town,
                address=client["address"],
            )
        else:
            site.municipality = town
            if client["address"]:
                site.address = client["address"]
            site.name = town.name[:120] if town else site.name
            site.save()
        return record

    def _ensure_crop(self, client: Client, crop_name: str, recorded_at, cache: dict[str, CropType]) -> int:
        key = fold(crop_name)
        if key not in cache:
            cache[key], _ = CropType.objects.get_or_create(name=crop_name[:80])
        crop_type = cache[key]
        site = client.sites.filter(is_primary=True, is_deleted=False).first()
        if site is None:
            return 0
        exists = Crop.objects.filter(site=site, crop_type=crop_type, is_deleted=False).exists()
        if exists:
            return 0
        Crop.objects.create(
            site=site,
            crop_type=crop_type,
            area_ha=Decimal("0"),
            phase=CropPhase.PRODUCCION,
            notes="Importado de ventas NC",
            recorded_at=recorded_at or timezone.localdate(),
        )
        return 1

    def _town(self, department_name, city_name, towns):
        dep_key = fold(department_name)
        if dep_key not in DEPARTMENTS:
            dep_key = "SIN DEPARTAMENTO"
        code, label = DEPARTMENTS[dep_key]
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


def date_fallback():
    return timezone.localdate()
