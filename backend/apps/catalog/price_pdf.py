import re
import unicodedata
from decimal import Decimal
from pathlib import Path

from pypdf import PdfReader

_SIZE = {
    "500 g": ("KG", Decimal("0.500")),
    "1 L": ("L", Decimal("1")),
    "4 L": ("L", Decimal("4")),
    "20 L": ("L", Decimal("20")),
    "5 kg": ("KG", Decimal("5")),
    "10 kg": ("KG", Decimal("10")),
    "50 kg": ("KG", Decimal("50")),
}
_DROP = {"NO", "INCLUYE", "FLETE", "MAS", "IVA"}


def money(token: str) -> Decimal | None:
    raw = token.replace("$", "").replace(" ", "").strip()
    if not raw or not raw.replace(".", "").isdigit():
        return None
    parts = raw.split(".")
    if len(parts) > 1 and all(len(part) == 3 for part in parts[1:]) and 1 <= len(parts[0]) <= 3:
        return Decimal("".join(parts))
    return Decimal(raw)


def zone_code_for_pdf(name: str) -> str | None:
    folded = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()
    if "VADEMECUM" in folded:
        return None
    if "ORIENTE" in folded:
        return "ORIENTE"
    if "URABA" in folded:
        return "URABA"
    if "CUNDINAMARCA" in folded or "BOGOTA" in folded:
        return "CUNDINAMARCA"
    if "PAMPLONA" in folded or "NORTE DE SANTANDER" in folded:
        return "NSANTANDER"
    if "TOLIMA" in folded:
        return "TOLIMA"
    if "VALLE" in folded:
        return "VALLE"
    if "BUCARAMANGA" in folded or "SANTANDER" in folded:
        return "SANTANDER"
    return None


def _items(page):
    found = []

    def visitor(text, _cm, tm, _font, _size):
        token = " ".join(text.split())
        if token:
            found.append((tm[5], tm[4], token))

    page.extract_text(visitor_text=visitor)
    return found


def _lines(items, gap=3.2):
    lines = []
    for y_pos, x_pos, token in sorted(items, key=lambda item: -item[0]):
        if lines and abs(lines[-1][0] - y_pos) <= gap:
            lines[-1][0] = (lines[-1][0] + y_pos) / 2
            lines[-1][1].append((x_pos, token))
        else:
            lines.append([y_pos, [(x_pos, token)]])
    return [(y_pos, sorted(tokens)) for y_pos, tokens in lines]


def _columns(tokens):
    columns = []
    index = 0
    while index < len(tokens):
        x_pos, token = tokens[index]
        label = token.upper().replace("Ó", "O")
        following = tokens[index + 1][1].upper() if index + 1 < len(tokens) else ""
        if "500" in label:
            columns.append((x_pos, "500 g"))
        elif "KG/LT" in label:
            columns.append((x_pos, "1 L"))
        elif "GAL" in label:
            columns.append((x_pos, "4 L"))
        elif "CANECA" in label:
            columns.append((x_pos, "20 L"))
        elif re.fullmatch(r"(5|10|50)\s*KG", label):
            columns.append((x_pos, f"{label.split()[0]} kg"))
        elif label in {"5", "10", "50"} and "KG" in following:
            columns.append((x_pos, f"{label} kg"))
            index += 1
        index += 1
    return columns


def _clean(text: str) -> str:
    words = []
    for word in text.replace("*", " ").replace("(", " ").replace(")", " ").split():
        if word.upper() in _DROP or money(word) is not None:
            continue
        words.append(word)
    name = " ".join(words)
    if name.upper() == "BACILLUS":
        return "BACILLUS THURINGIENSIS"
    return name


def _prices(tokens, columns):
    found = []
    index = 0
    while index < len(tokens):
        x_pos, token = tokens[index]
        if "$" in token:
            amount = money(token)
            anchor = x_pos
            if amount is None and index + 1 < len(tokens):
                amount = money(tokens[index + 1][1])
                anchor = tokens[index + 1][0]
                index += 1
            if amount is not None and columns:
                column = min(columns, key=lambda item: abs(item[0] - anchor))
                if abs(column[0] - anchor) <= 48:
                    found.append((column[1], amount))
        index += 1
    unique = {}
    for presentation, amount in found:
        unique.setdefault(presentation, amount)
    return unique


def parse_price_pdf(path: Path) -> list[tuple[str, dict[str, Decimal]]]:
    reader = PdfReader(str(path))
    lines = []
    for page in reader.pages:
        lines.extend(_lines(_items(page)))
    header = next(
        (
            index
            for index, (_, tokens) in enumerate(lines)
            if "PRODUCTO" in " ".join(token for _, token in tokens).upper() and any("500" in token for _, token in tokens)
        ),
        None,
    )
    if header is None:
        return []
    header_tokens = list(lines[header][1])
    if header > 0:
        previous = lines[header - 1][1]
        if any("GAL" in token.upper() or "CANECA" in token.upper() for _, token in previous):
            header_tokens = list(previous) + header_tokens
    columns = _columns(header_tokens)
    name_limit = min((x_pos for x_pos, _label in columns), default=170) - 8
    products: list[tuple[str, dict[str, Decimal]]] = []
    pending = ""
    last_y = None
    for y_pos, tokens in lines[header + 1 :]:
        blob = " ".join(token for _, token in tokens)
        if blob.upper().startswith("NOTA") or "EXENTO" in blob.upper():
            pending = ""
            continue
        name = " ".join(token for x_pos, token in tokens if x_pos < name_limit and "$" not in token)
        priced = _prices(tokens, columns)
        if name and not priced:
            if last_y is not None and products and abs(last_y - y_pos) < 16 and not pending:
                products[-1] = (_clean(f"{products[-1][0]} {name}"), products[-1][1])
            else:
                pending = f"{pending} {name}".strip()
            continue
        if not priced:
            continue
        full = _clean(f"{pending} {name}")
        pending = ""
        last_y = y_pos
        if len(full) < 3:
            continue
        products.append((full, priced))
    return products


def sku_for(name: str, presentation: str) -> str:
    raw = f"{name}-{presentation}".upper()
    parts = [part for part in "".join(char if char.isalnum() else "-" for char in raw).split("-") if part]
    return "-".join(parts)[:40]


def presentation_unit(presentation: str) -> tuple[str, Decimal]:
    unit, size = _SIZE[presentation]
    return unit, size
