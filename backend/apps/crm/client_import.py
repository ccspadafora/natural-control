from __future__ import annotations

import hashlib
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from decimal import Decimal

DEPARTMENTS = {
    "ANTIOQUIA": ("05", "Antioquia"),
    "ATLANTICO": ("08", "Atlántico"),
    "BOGOTA": ("11", "Bogotá"),
    "BOLIVAR": ("13", "Bolívar"),
    "BOYACA": ("15", "Boyacá"),
    "CALDAS": ("17", "Caldas"),
    "CAQUETA": ("18", "Caquetá"),
    "CAUCA": ("19", "Cauca"),
    "CESAR": ("20", "Cesar"),
    "CORDOBA": ("23", "Córdoba"),
    "CUNDINAMARCA": ("25", "Cundinamarca"),
    "CHOCO": ("27", "Chocó"),
    "HUILA": ("41", "Huila"),
    "LA GUAJIRA": ("44", "La Guajira"),
    "MAGDALENA": ("47", "Magdalena"),
    "META": ("50", "Meta"),
    "NARINO": ("52", "Nariño"),
    "NORTE DE SANTANDER": ("54", "Norte de Santander"),
    "QUINDIO": ("63", "Quindío"),
    "RISARALDA": ("66", "Risaralda"),
    "SANTANDER": ("68", "Santander"),
    "SUCRE": ("70", "Sucre"),
    "TOLIMA": ("73", "Tolima"),
    "VALLE DEL CAUCA": ("76", "Valle del Cauca"),
    "VALLE": ("76", "Valle del Cauca"),
    "ARAUCA": ("81", "Arauca"),
    "CASANARE": ("85", "Casanare"),
    "PUTUMAYO": ("86", "Putumayo"),
    "SAN ANDRES": ("88", "San Andrés"),
    "AMAZONAS": ("91", "Amazonas"),
    "GUAINIA": ("94", "Guainía"),
    "GUAVIARE": ("95", "Guaviare"),
    "VAUPES": ("97", "Vaupés"),
    "VICHADA": ("99", "Vichada"),
    "SIN DEPARTAMENTO": ("00", "Sin departamento"),
}

ZONE_BY_DEPARTMENT = {
    "CUNDINAMARCA": "CUNDINAMARCA",
    "BOGOTA": "CUNDINAMARCA",
    "BOYACA": "CUNDINAMARCA",
    "SANTANDER": "SANTANDER",
    "NORTE DE SANTANDER": "NSANTANDER",
    "TOLIMA": "TOLIMA",
    "HUILA": "TOLIMA",
    "VALLE DEL CAUCA": "VALLE",
    "VALLE": "VALLE",
    "CALDAS": "EJE",
    "RISARALDA": "EJE",
    "QUINDIO": "EJE",
    "CESAR": "SURCESAR",
    "CAUCA": "VALLE",
    "NARINO": "VALLE",
}

ORIENTE = {
    "LA CEJA",
    "RIONEGRO",
    "EL CARMEN DE VIBORAL",
    "CARMEN DE VIBORAL",
    "LA UNION",
    "ABEJORRAL",
    "RETIRO",
    "EL RETIRO",
    "SONSON",
    "MARINILLA",
    "GUARNE",
    "SAN VICENTE",
    "SAN VICENTE FERRER",
    "EL SANTUARIO",
    "SANTUARIO",
    "GRANADA",
    "COCORNA",
    "SAN RAFAEL",
    "SAN CARLOS",
    "PENOL",
    "EL PENOL",
    "NARINO",
    "ARGELIA",
    "CONCEPCION",
    "ALEJANDRIA",
    "GUATAPE",
    "SAN LUIS",
}
URABA = {
    "APARTADO",
    "TURBO",
    "CHIGORODO",
    "CAREPA",
    "NECOCLI",
    "SAN PEDRO DE URABA",
    "ARBOLETES",
    "MUTATA",
    "MURINDO",
    "VIGIA DEL FUERTE",
    "SAN JUAN DE URABA",
}

# Alias de zonas del Excel de roster → código interno
ZONE_ALIASES = {
    "CALDAS": "EJE",
    "RISARALDA": "EJE",
    "QUINDIO": "EJE",
    "SUR DEL CESAR": "SURCESAR",
    "SURCESAR": "SURCESAR",
    "ANTIOQUIA": "ANTIOQUIA",
    "URABA": "URABA",
    "ORIENTE": "ORIENTE",
    "ORIENTE ANTIOQUENO": "ORIENTE",
    "VALLE": "VALLE",
    "CUNDINAMARCA": "CUNDINAMARCA",
    "SANTANDER": "SANTANDER",
    "TOLIMA": "TOLIMA",
    "MERCADEO": "MERCADEO",
    "DNV": "DNV",
    "EJE": "EJE",
    "NSANTANDER": "NSANTANDER",
}


def fold(value) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return " ".join(text.upper().split())


def zone_code(department: str, city: str) -> str | None:
    dep = fold(department)
    if dep == "ANTIOQUIA":
        town = fold(city)
        if town in ORIENTE:
            return "ORIENTE"
        if town in URABA:
            return "URABA"
        return "ANTIOQUIA"
    return ZONE_BY_DEPARTMENT.get(dep)


def normalize_zone_label(label: str) -> str | None:
    folded = fold(label)
    if not folded:
        return None
    return ZONE_ALIASES.get(folded, folded.replace(" ", "")[:20] or None)


def document_number(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, int):
        return str(value)
    return "".join(char for char in str(value) if char.isdigit())


def ensure_document(number: str, name: str, city: str, rtc: str, row: int) -> str:
    """Nunca deja un cliente sin documento: sintetiza uno estable si falta o es inválido."""
    digits = "".join(char for char in str(number or "") if char.isdigit())
    if 3 <= len(digits) <= 20:
        return digits
    if len(digits) > 20:
        return digits[:20]
    digest = hashlib.sha1(f"{fold(name)}|{fold(city)}|{fold(rtc)}|{row}".encode()).hexdigest()
    return f"9{digest[:19]}"


def is_company(name: str, number: str) -> bool:
    folded = fold(name)
    if any(marker in folded for marker in ("SAS", "LTDA", "S A S", "E U")):
        return True
    return len(number) == 9 and number[0] in {"8", "9"}


def _when(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _decimal(value) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


def _department_key(department: str) -> str:
    folded = fold(department)
    if folded in DEPARTMENTS:
        return folded
    # Fuzzy: "VALLE DEL CAUCA - ..." etc.
    for key in DEPARTMENTS:
        if key in folded or folded in key:
            return key
    return "SIN DEPARTAMENTO"


def read_sales(path) -> tuple[list[dict], list[dict], list[dict]]:
    """Lee CLIENTES*.xlsx. No descarta filas: excepciones queda vacío (compat API)."""
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book["BASE DE DATOS"]
    latest: dict[str, dict] = {}
    sales: list[dict] = []
    for index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or all(cell is None for cell in row):
            continue
        cells = list(row) + [None] * 14
        sold_on = _when(cells[0])
        rtc = str(cells[1] or "").strip() or "Sin comercial"
        raw_number = document_number(cells[2])
        name = str(cells[3] or "").strip() or f"Cliente fila {index}"
        crop = str(cells[4] or "").strip()
        product = str(cells[5] or "").strip()
        quantity = _decimal(cells[6])
        amount = _decimal(cells[7])
        department = str(cells[8] or "").strip()
        city = str(cells[9] or "").strip()
        phone = str(cells[10] or cells[11] or "").strip()
        address = str(cells[12] or "").strip()
        email = str(cells[13] or "").strip()
        number = ensure_document(raw_number, name, city, rtc, index)
        dep_key = _department_key(department)
        sales.append(
            {
                "row": index,
                "date": sold_on,
                "rtc": rtc,
                "document": number,
                "name": name,
                "crop": crop,
                "product": product,
                "quantity": quantity,
                "amount": amount,
                "department": department or DEPARTMENTS[dep_key][1],
                "city": city,
            }
        )
        current = latest.get(number)
        if current is None or (sold_on and (current["date"] is None or sold_on >= current["date"])):
            latest[number] = {
                "document": number,
                "name": name[:200],
                "rtc": rtc,
                "department": department or DEPARTMENTS[dep_key][1],
                "department_key": dep_key,
                "city": city,
                "phone": phone[:20],
                "address": address[:250],
                "email": email if "@" in email else "",
                "date": sold_on,
                "company": is_company(name, number),
                "zone_code": zone_code(department or dep_key, city),
                "crop": crop,
                "synthetic_doc": not bool(raw_number),
            }
    book.close()
    return list(latest.values()), [], sales


def read_directory(path) -> list[dict]:
    """Hoja2: maestro de terceros (código = documento)."""
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "Hoja2" not in book.sheetnames:
        book.close()
        return []
    sheet = book["Hoja2"]
    rows: list[dict] = []
    for index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or all(cell is None for cell in row):
            continue
        cells = list(row) + [None] * 9
        kind = str(cells[0] or "").strip()
        number = ensure_document(document_number(cells[1]), str(cells[2] or ""), str(cells[4] or ""), "directorio", index)
        name = str(cells[2] or "").strip() or f"Tercero {number}"
        department = str(cells[3] or "").strip()
        city = str(cells[4] or "").strip()
        phone = str(cells[5] or cells[6] or "").strip()
        address = str(cells[7] or "").strip()
        email = str(cells[8] or "").strip()
        dep_key = _department_key(department)
        rows.append(
            {
                "document": number,
                "name": name[:200],
                "rtc": "Sin comercial",
                "department": department or DEPARTMENTS[dep_key][1],
                "department_key": dep_key,
                "city": city,
                "phone": phone[:20],
                "address": address[:250],
                "email": email if "@" in email else "",
                "date": None,
                "company": is_company(name, number),
                "zone_code": zone_code(department or dep_key, city),
                "crop": "",
                "synthetic_doc": False,
                "third_party_kind": kind,
            }
        )
    book.close()
    return rows


def read_rtc_roster(path) -> list[dict]:
    """LISTADO RTC del Excel BASE DE DATOS."""
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "LISTADO RTC" not in book.sheetnames:
        book.close()
        return []
    sheet = book["LISTADO RTC"]
    rows: list[dict] = []
    for row in sheet.iter_rows(min_row=3, values_only=True):
        if not row:
            continue
        name = str(row[0] or "").strip()
        zone = str(row[1] or "").strip() if len(row) > 1 else ""
        if not name or fold(name) in {"REPRESENTANTE TECNICO COMERCIAL", "RTC"}:
            continue
        rows.append({"name": name, "zone_label": zone, "zone_code": normalize_zone_label(zone)})
    book.close()
    return rows


def read_programming_links(path) -> list[dict]:
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "PROGRAMACIÓN" not in book.sheetnames and "PROGRAMACION" not in book.sheetnames:
        book.close()
        return []
    sheet = book["PROGRAMACIÓN"] if "PROGRAMACIÓN" in book.sheetnames else book["PROGRAMACION"]
    rows: list[dict] = []
    for row in sheet.iter_rows(min_row=3, values_only=True):
        if not row:
            continue
        name = str(row[0] or "").strip()
        url = str(row[1] or "").strip() if len(row) > 1 else ""
        if not name or fold(name).startswith("PROYECCION"):
            continue
        rows.append({"name": name, "url": url})
    book.close()
    return rows


def read_products_catalog(path) -> list[dict]:
    """PRODUCTOS del Excel BASE DE DATOS: familia + presentación / análisis."""
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "PRODUCTOS" not in book.sheetnames:
        book.close()
        return []
    sheet = book["PRODUCTOS"]
    family = ""
    products: list[dict] = []
    seen: set[str] = set()
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        cells = list(row) + [None] * 3
        a = str(cells[0] or "").strip()
        b = str(cells[1] or "").strip()
        c = str(cells[2] or "").strip()
        if fold(a) in {"PRODUCTOS", "ANALISIS"} or fold(b) in {"PRODUCTOS", "ANALISIS"}:
            continue
        if a and not b and not c:
            family = a
            continue
        if a and b and not c:
            # Could be family+presentation OR presentation-only under previous family OR lab analysis
            if fold(a) == fold(family) or (family and len(a) < 40 and "X" not in fold(a) and "KG" not in fold(a)):
                family = a
                name, presentation = a, b
            elif family:
                name, presentation = family, a if not b else f"{a} · {b}"
                # Actually row like ANISAGRO * 100 GR | SERVICIO... — product line + analysis col
                name, presentation = (family or a), a
            else:
                name, presentation = a, b
        elif a and b and c:
            family = a
            name, presentation = a, b
        elif b and not a:
            name, presentation = family or b, b
        else:
            continue
        name = name.strip()[:120]
        presentation = presentation.strip()[:120]
        if not name:
            continue
        key = fold(f"{name}|{presentation}")
        if key in seen:
            continue
        seen.add(key)
        products.append({"name": name, "presentation": presentation or "UND", "family": family or name})
    book.close()
    return products


def rtc_zones(clients: list[dict]) -> dict[str, str | None]:
    buckets: dict[str, Counter] = defaultdict(Counter)
    for client in clients:
        if client["rtc"] and client["zone_code"]:
            buckets[client["rtc"]][client["zone_code"]] += 1
    chosen = {}
    for name, counts in buckets.items():
        code, total = counts.most_common(1)[0]
        chosen[name] = code if total * 2 >= sum(counts.values()) else code
    return chosen
