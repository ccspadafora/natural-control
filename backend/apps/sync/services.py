import base64
import re
import uuid
from io import BytesIO
from uuid import UUID

from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import transaction

from apps.accounts.models import Device
from apps.core.exceptions import NcError
from apps.crm.api import _client_row
from apps.crm.services import create_client
from apps.parameters.services import get_setting
from apps.sync.models import MutationResult, SyncMutation
from apps.visits.api import _visit
from apps.visits.evidence import store_photo
from apps.visits.services import close_visit, mark_not_done, start_visit, visit_for

VISIT_CLOSE = re.compile(r"^/api/v1/visits/(?P<id>[0-9a-f-]{36})/close$")
VISIT_NOT_DONE = re.compile(r"^/api/v1/visits/(?P<id>[0-9a-f-]{36})/not-done$")
VISIT_EVIDENCE = re.compile(r"^/api/v1/visits/(?P<id>[0-9a-f-]{36})/evidence$")
VISIT_START = re.compile(r"^/api/v1/visits/(?P<id>[0-9a-f-]{36})/start$")


def require_offline_feature() -> None:
    if not get_setting("feature.offline"):
        raise NcError(
            "feature.disabled",
            "El modo sin conexión no está activo en este entorno.",
            status=403,
        )


def resolve_device(user) -> Device:
    device = Device.objects.filter(user=user, revoked_at__isnull=True).order_by("-last_used_at").first()
    if device is None:
        device = Device.objects.create(user=user, label="Campo (sync)", platform="OTHER")
    return device


def _parse_uuid(value: str, field: str) -> UUID:
    try:
        return UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise NcError("sync.invalid", f"Falta o es inválido: {field}.", status=400) from exc


def _op_for(path: str, method: str) -> str:
    if method.upper() != "POST":
        return f"http.{method.lower()}"
    if path == "/api/v1/clients":
        return "client.create"
    if VISIT_CLOSE.match(path):
        return "visit.close"
    if VISIT_NOT_DONE.match(path):
        return "visit.not_done"
    if VISIT_EVIDENCE.match(path):
        return "visit.evidence"
    if VISIT_START.match(path):
        return "visit.start"
    return "unknown"


def _entity_id(path: str, response: dict | None = None) -> UUID:
    if path == "/api/v1/clients":
        if response and response.get("id"):
            return _parse_uuid(response["id"], "client.id")
        return uuid.uuid4()
    match = VISIT_CLOSE.match(path) or VISIT_NOT_DONE.match(path) or VISIT_EVIDENCE.match(path) or VISIT_START.match(path)
    if match:
        return _parse_uuid(match.group("id"), "visit.id")
    return uuid.uuid4()


def _photo_from_body(body: dict) -> InMemoryUploadedFile:
    raw_b64 = body.get("data_base64") or body.get("file_base64") or ""
    if isinstance(raw_b64, str) and "," in raw_b64 and raw_b64.strip().startswith("data:"):
        raw_b64 = raw_b64.split(",", 1)[1]
    if not raw_b64:
        raise NcError("sync.invalid", "Falta la foto (data_base64).", status=400)
    try:
        raw = base64.b64decode(raw_b64, validate=False)
    except Exception as exc:
        raise NcError("sync.invalid", "La foto no se pudo decodificar.", status=400) from exc
    if len(raw) > 10 * 1024 * 1024:
        raise NcError("visit.photos", "La foto supera 10 MB.", status=400)
    filename = (body.get("filename") or "foto.jpg").strip() or "foto.jpg"
    content_type = (body.get("content_type") or "image/jpeg").strip() or "image/jpeg"
    buffer = BytesIO(raw)
    return InMemoryUploadedFile(buffer, "file", filename, content_type, len(raw), None)


@transaction.atomic
def apply_mutation(user, device: Device, item: dict) -> dict:
    client_uuid = _parse_uuid(item.get("client_uuid"), "client_uuid")
    method = (item.get("method") or "POST").upper()
    path = (item.get("path") or "").strip()
    body = item.get("body") or {}
    if not path.startswith("/api/v1/"):
        raise NcError("sync.invalid", "Ruta de mutación no soportada.", status=400)

    existing = SyncMutation.objects.filter(id=client_uuid, user=user).first()
    if existing is not None:
        return {
            "client_uuid": str(client_uuid),
            "status": existing.result,
            "response": existing.response,
            "error": existing.response.get("error"),
        }

    op = _op_for(path, method)
    try:
        if path == "/api/v1/clients" and method == "POST":
            client = create_client(user, body)
            response = _client_row(client)
            status = MutationResult.APPLIED
        elif match := VISIT_CLOSE.match(path):
            if method != "POST":
                raise NcError("sync.invalid", "Solo POST está soportado para cerrar visitas.", status=400)
            visit, check = close_visit(user, match.group("id"), body)
            response = _visit(visit, check)
            status = MutationResult.APPLIED
        elif match := VISIT_NOT_DONE.match(path):
            if method != "POST":
                raise NcError("sync.invalid", "Solo POST está soportado para visitas no realizadas.", status=400)
            visit, check = mark_not_done(user, match.group("id"), body)
            response = _visit(visit, check)
            status = MutationResult.APPLIED
        elif match := VISIT_EVIDENCE.match(path):
            if method != "POST":
                raise NcError("sync.invalid", "Solo POST está soportado para fotos.", status=400)
            visit = visit_for(user, match.group("id"))
            evidence = store_photo(visit, user, _photo_from_body(body))
            response = {
                "id": str(evidence.id),
                "url": evidence.file.url,
                "thumbnail": evidence.thumbnail.url if evidence.thumbnail else evidence.file.url,
            }
            status = MutationResult.APPLIED
        elif match := VISIT_START.match(path):
            if method != "POST":
                raise NcError("sync.invalid", "Solo POST está soportado para iniciar visitas.", status=400)
            visit = start_visit(user, match.group("id"), body.get("gps"))
            response = _visit(visit)
            status = MutationResult.APPLIED
        else:
            raise NcError("sync.unsupported", "Esta acción offline aún no está disponible.", status=400)
    except NcError as exc:
        SyncMutation.objects.create(
            id=client_uuid,
            user=user,
            device=device,
            op=op,
            entity_id=_entity_id(path),
            result=MutationResult.REJECTED,
            response={"error": exc.code, "detail": str(exc.detail)},
        )
        return {
            "client_uuid": str(client_uuid),
            "status": MutationResult.REJECTED,
            "response": {},
            "error": exc.code,
            "detail": str(exc.detail),
        }

    SyncMutation.objects.create(
        id=client_uuid,
        user=user,
        device=device,
        op=op,
        entity_id=_entity_id(path, response),
        result=status,
        response=response,
    )
    return {
        "client_uuid": str(client_uuid),
        "status": status,
        "response": response,
        "error": None,
    }


def apply_mutations(user, mutations: list) -> list[dict]:
    require_offline_feature()
    if len(mutations) > 50:
        raise NcError("sync.batch", "Envía como máximo 50 registros por lote.", status=400)
    device = resolve_device(user)
    return [apply_mutation(user, device, item) for item in mutations]
