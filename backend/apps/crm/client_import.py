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
}

ZONE_BY_DEPARTMENT = {
    "CUNDINAMARCA": "CUNDINAMARCA",
    "BOGOTA": "CUNDINAMARCA",
    "SANTANDER": "SANTANDER",
    "NORTE DE SANTANDER": "NSANTANDER",
    "TOLIMA": "TOLIMA",
    "VALLE DEL CAUCA": "VALLE",
    "VALLE": "VALLE",
}

ORIENTE = {
    "LA CEJA", "RIONEGRO", "EL CARMEN DE VIBORAL", "CARMEN DE VIBORAL", "LA UNION", "ABEJORRAL",
    "RETIRO", "EL RETIRO", "SONSON", "MARINILLA", "GUARNE", "SAN VICENTE", "SAN VICENTE FERRER",
    "EL SANTUARIO", "SANTUARIO", "GRANADA", "COCORNA", "SAN RAFAEL", "SAN CARLOS", "PENOL", "EL PENOL",
    "NARINO", "ARGELIA", "CONCEPCION", "ALEJANDRIA", "GUATAPE", "SAN LUIS",
}
URABA = {
    "APARTADO", "TURBO", "CHIGORODO", "CAREPA", "NECOCLI", "SAN PEDRO DE URABA", "ARBOLETES",
    "MUTATA", "MURINDO", "VIGIA DEL FUERTE", "SAN JUAN DE URABA",
}
COMPANY = ("S.A.S", "SAS", "S.A.", "LTDA", "E.U.", "S.A.S.", "CIA")


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
        return None
    return ZONE_BY_DEPARTMENT.get(dep)


def document_number(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, int):
        return str(value)
    return "".join(char for char in str(value) if char.isdigit())


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
    return Decimal(str(value))


def read_sales(path) -> tuple[list[dict], list[dict], list[dict]]:
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book["BASE DE DATOS"]
    latest: dict[str, dict] = {}
    exceptions: list[dict] = []
    sales: list[dict] = []
    for index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or all(cell is None for cell in row):
            continue
        cells = list(row) + [None] * 14
        sold_on = _when(cells[0])
        rtc = str(cells[1] or "").strip()
        number = document_number(cells[2])
        name = str(cells[3] or "").strip()
        crop = str(cells[4] or "").strip()
        product = str(cells[5] or "").strip()
        quantity = _decimal(cells[6])
        amount = _decimal(cells[7])
        department = str(cells[8] or "").strip()
        city = str(cells[9] or "").strip()
        phone = str(cells[10] or cells[11] or "").strip()
        address = str(cells[12] or "").strip()
        email = str(cells[13] or "").strip()
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
                "department": department,
                "city": city,
            }
        )
        if not number:
            exceptions.append({"row": index, "reason": "Sin documento", "name": name, "rtc": rtc, "city": city})
            continue
        if len(number) > 20:
            exceptions.append({"row": index, "reason": "Documento demasiado largo", "name": name, "rtc": rtc, "city": city})
            continue
        if fold(department) not in DEPARTMENTS:
            exceptions.append({"row": index, "reason": "Departamento fuera de Colombia", "name": name, "rtc": rtc, "city": f"{city} / {department}"})
            continue
        if not name:
            exceptions.append({"row": index, "reason": "Sin nombre", "name": "", "rtc": rtc, "city": city})
            continue
        current = latest.get(number)
        if current is None or (sold_on and (current["date"] is None or sold_on >= current["date"])):
            latest[number] = {
                "document": number,
                "name": name[:200],
                "rtc": rtc,
                "department": department,
                "city": city,
                "phone": phone[:20],
                "address": address[:250],
                "email": email if "@" in email else "",
                "date": sold_on,
                "company": is_company(name, number),
                "zone_code": zone_code(department, city),
            }
    book.close()
    return list(latest.values()), exceptions, sales


def rtc_zones(clients: list[dict]) -> dict[str, str | None]:
    buckets: dict[str, Counter] = defaultdict(Counter)
    for client in clients:
        if client["rtc"] and client["zone_code"]:
            buckets[client["rtc"]][client["zone_code"]] += 1
    chosen = {}
    for name, counts in buckets.items():
        code, total = counts.most_common(1)[0]
        chosen[name] = code if total * 2 >= sum(counts.values()) else None
    return chosen
