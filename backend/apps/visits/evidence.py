from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image, ImageOps

from apps.core.exceptions import NcError
from apps.parameters.services import get_setting
from apps.visits.models import Evidence, EvidenceKind, UploadStatus


def store_photo(visit, user, uploaded) -> Evidence:
    limit = int(get_setting("visits.max_photos"))
    if visit.evidence.filter(kind=EvidenceKind.PHOTO, is_deleted=False).count() >= limit:
        raise NcError("visit.photos", f"Puedes adjuntar hasta {limit} fotos.", status=400)
    raw = uploaded.read()
    if len(raw) > 10 * 1024 * 1024:
        raise NcError("visit.photos", "La foto supera 10 MB.", status=400)
    try:
        image = ImageOps.exif_transpose(Image.open(BytesIO(raw)))
        image = image.convert("RGB")
    except Exception as exc:
        raise NcError("visit.photos", "La evidencia tiene que ser una foto.", status=400) from exc
    full = BytesIO()
    image.save(full, format="JPEG", quality=82)
    thumb = image.copy()
    thumb.thumbnail((480, 480))
    small = BytesIO()
    thumb.save(small, format="JPEG", quality=75)
    evidence = Evidence(
        kind=EvidenceKind.PHOTO,
        content_type="image/jpeg",
        size_bytes=full.tell(),
        width=image.width,
        height=image.height,
        captured_at=timezone.now(),
        visit=visit,
        uploaded_by=user,
        upload_status=UploadStatus.PROCESSED,
        created_by=user,
        updated_by=user,
    )
    evidence.file.save(f"{visit.id}-{timezone.now().strftime('%H%M%S%f')}.jpg", ContentFile(full.getvalue()), save=False)
    evidence.thumbnail.save(f"thumb-{visit.id}-{timezone.now().strftime('%H%M%S%f')}.jpg", ContentFile(small.getvalue()), save=False)
    evidence.save()
    return evidence
