"""Generación de Excel para ExportJob."""

from __future__ import annotations

from datetime import timedelta
from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone
from openpyxl import Workbook

from apps.core.scoping import scope_queryset
from apps.crm.models import Client
from apps.forecast.selectors import forecast_payload
from apps.reports.models import ExportKind, ExportJob, ReportStatus
from apps.visits.live import live_visits, parse_live_date


def _workbook_rows(headers: list[str], rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_visits_xlsx(user, filters: dict) -> tuple[bytes, int]:
    day = parse_live_date(filters.get("date"))
    payload = live_visits(
        user,
        day=day,
        status=filters.get("status"),
        zone=filters.get("zone"),
        rtc=filters.get("rtc"),
        page=1,
    )
    # Exporta hasta 10 páginas
    rows = list(payload["results"])
    page = 2
    while len(payload["results"]) == payload["page_size"] and page <= 10:
        payload = live_visits(
            user,
            day=day,
            status=filters.get("status"),
            zone=filters.get("zone"),
            rtc=filters.get("rtc"),
            page=page,
        )
        rows.extend(payload["results"])
        page += 1
    data = [
        [
            r.get("scheduled_start") or "",
            r.get("client_name") or "",
            r.get("rtc_name") or "",
            r.get("zone") or "",
            r.get("municipality") or "",
            r.get("status") or "",
            r.get("result") or "",
            (r.get("gps") or {}).get("status") or "",
            r.get("concretado") or 0,
            r.get("potencial") or 0,
        ]
        for r in rows
    ]
    content = _workbook_rows(
        ["Hora", "Cliente", "RTC", "Zona", "Municipio", "Estado", "Resultado", "GPS", "Concretado", "Potencial"],
        data,
    )
    return content, len(data)


def build_clients_xlsx(user, filters: dict) -> tuple[bytes, int]:
    qs = scope_queryset(
        Client.objects.filter(is_deleted=False).select_related("owner", "zone"),
        user,
        owner_field="owner",
    )
    if filters.get("zone"):
        qs = qs.filter(zone_id=filters["zone"])
    if filters.get("owner"):
        qs = qs.filter(owner_id=filters["owner"])
    rows = []
    for client in qs.order_by("legal_name")[:5000]:
        rows.append(
            [
                client.trade_name or client.legal_name,
                client.legal_name,
                client.document_number,
                client.phone,
                client.commercial_status,
                client.owner.email if client.owner_id else "",
                client.zone.name if client.zone_id else "",
            ]
        )
    content = _workbook_rows(
        ["Nombre", "Razón social", "Documento", "Teléfono", "Estado", "RTC", "Zona"],
        rows,
    )
    return content, len(rows)


def build_forecast_xlsx(user, filters: dict) -> tuple[bytes, int]:
    payload = forecast_payload(user, months=int(filters.get("months") or 4))
    rows = []
    for r in payload["by_rtc"]:
        rows.append([r["name"], r["zone"], r["optimistic"], r["probable"], r["committed"], r.get("hit_rate")])
    for p in payload["by_product"]:
        rows.append([p["name"], "Producto", p["optimistic"], p["probable"], p["committed"], None])
    content = _workbook_rows(
        ["Nombre", "Grupo", "Optimista", "Probable", "Comprometido", "Acierto %"],
        rows,
    )
    return content, len(rows)


def _simple_pdf(title: str, lines: list[str]) -> bytes:
    """PDF mínimo (Helvetica) sin dependencias extra."""
    def esc(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    content_lines = [f"BT /F1 16 Tf 50 780 Td ({esc(title)}) Tj"]
    y = 750
    content_lines.append("/F1 11 Tf")
    for line in lines:
        content_lines.append(f"0 -16 Td ({esc(line[:110])}) Tj")
        y -= 16
        if y < 60:
            break
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="replace")
    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
    objects.append(
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
    )
    objects.append(f"4 0 obj<< /Length {len(stream)} >>stream\n".encode() + stream + b"\nendstream\nendobj\n")
    objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(
        f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)


def build_league_pdf(user, filters: dict) -> tuple[bytes, int]:
    from apps.goals.league import league_board

    board = league_board(user, zone=filters.get("zone"))
    lines = [
        f"Periodo: {board.get('period_start', '')} · día {board.get('day', '')}/{board.get('days_in_month', '')}",
        "",
        "Pos  RTC  GEN  Zona",
    ]
    for row in board.get("results") or []:
        lines.append(
            f"{row.get('pos', '—'):>3}  {row.get('name', '')}  {row.get('gen', '—')}  {row.get('zone', '')}"
        )
    a = filters.get("compare_a_name")
    b = filters.get("compare_b_name")
    if a or b:
        lines.extend(["", f"Comparación: {a or '—'} vs {b or '—'}"])
        attrs = filters.get("attr_rows") or []
        for item in attrs:
            lines.append(f"- {item.get('label', '')}: {item.get('a', '—')} / {item.get('b', '—')}")
    return _simple_pdf("Liga de RTC · Natural Control", lines), len(board.get("results") or [])


BUILDERS = {
    ExportKind.VISITS_XLSX: build_visits_xlsx,
    ExportKind.CLIENTS_XLSX: build_clients_xlsx,
    ExportKind.FORECAST_XLSX: build_forecast_xlsx,
    ExportKind.LEAGUE_PDF: build_league_pdf,
}


def generate_export(job_id) -> None:
    job = ExportJob.objects.select_related("requested_by").filter(id=job_id, is_deleted=False).first()
    if job is None:
        return
    builder = BUILDERS.get(job.kind)
    if builder is None:
        job.status = ReportStatus.FAILED
        job.save(update_fields=["status", "updated_at"])
        return
    try:
        content, count = builder(job.requested_by, job.filters or {})
        ext = "pdf" if str(job.kind).endswith("PDF") else "xlsx"
        filename = f"{job.kind.lower()}_{job.id}.{ext}"
        job.file.save(filename, ContentFile(content), save=False)
        job.row_count = count
        job.status = ReportStatus.DONE
        job.save(update_fields=["file", "row_count", "status", "updated_at"])
    except Exception:
        job.status = ReportStatus.FAILED
        job.save(update_fields=["status", "updated_at"])
        raise


def create_export_job(user, kind: str, filters: dict | None) -> ExportJob:
    return ExportJob.objects.create(
        kind=kind,
        filters=filters or {},
        requested_by=user,
        status=ReportStatus.PENDING,
        expires_at=timezone.now() + timedelta(days=7),
        created_by=user,
        updated_by=user,
    )
