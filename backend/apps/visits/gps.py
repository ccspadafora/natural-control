from datetime import timedelta

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.crm.models import LocationSource
from apps.parameters.services import get_setting
from apps.visits.models import CaptureMode, GpsCheck, GpsError, GpsFlag, GpsKind, GpsStatus, ReviewStatus


def verify_gps(visit, payload: dict | None, kind: str) -> GpsCheck:
    payload = payload or {}
    zone = visit.client.zone
    tolerance = int(zone.gps_tolerance_m or get_setting("gps.tolerance_m"))
    max_accuracy = float(get_setting("gps.max_accuracy_m"))
    skew_min = int(get_setting("gps.max_device_clock_skew_min"))
    now = timezone.now()
    error = payload.get("error") or GpsError.NONE
    if error not in GpsError.values:
        error = GpsError.POSITION_UNAVAILABLE
    coords = (payload.get("position") or {}).get("coordinates") or []
    position = None
    if error == GpsError.NONE and len(coords) >= 2:
        try:
            position = Point(float(coords[0]), float(coords[1]), srid=4326)
        except (TypeError, ValueError):
            position = None
            error = GpsError.POSITION_UNAVAILABLE
    accuracy = payload.get("accuracy_m")
    try:
        accuracy = float(accuracy) if accuracy is not None else None
    except (TypeError, ValueError):
        accuracy = None
    captured_at = payload.get("captured_at")
    from django.utils.dateparse import parse_datetime

    if isinstance(captured_at, str):
        captured_at = parse_datetime(captured_at)
    if captured_at is not None and timezone.is_naive(captured_at):
        captured_at = timezone.make_aware(captured_at, timezone.get_current_timezone())
    mode = payload.get("capture_mode") or CaptureMode.ONLINE
    if mode not in CaptureMode.values:
        mode = CaptureMode.ONLINE

    site = visit.site
    reference = site.location
    distance = None
    if position is not None and reference is not None:
        located = type(site).objects.filter(pk=site.pk).annotate(gap=Distance("location", position)).first()
        if located is not None and located.gap is not None:
            distance = float(located.gap.m)

    if error != GpsError.NONE or position is None:
        status = GpsStatus.SIN_UBICACION
        review = ReviewStatus.PENDIENTE
    elif reference is None:
        status = GpsStatus.SIN_REFERENCIA
        review = ReviewStatus.NO_REQUERIDA
        if accuracy is not None and accuracy <= max_accuracy:
            site.location = position
            site.location_source = LocationSource.GPS_DEVICE
            site.location_accuracy_m = accuracy
            site.location_set_by = visit.rtc
            site.location_set_at = now
            site.save(update_fields=["location", "location_source", "location_accuracy_m", "location_set_by", "location_set_at", "updated_at"])
    elif accuracy is None or accuracy > max_accuracy:
        status = GpsStatus.PRECISION_BAJA
        review = ReviewStatus.PENDIENTE
    elif distance is not None and distance <= tolerance:
        status = GpsStatus.VERIFICADA
        review = ReviewStatus.NO_REQUERIDA
        if not site.location_locked:
            site.location_locked = True
            site.save(update_fields=["location_locked", "updated_at"])
    else:
        status = GpsStatus.FUERA_DE_RANGO
        review = ReviewStatus.PENDIENTE

    flags: list[str] = []
    if accuracy is not None and accuracy < 3:
        flags.append(GpsFlag.ACCURACY_TOO_PERFECT)
    if mode == CaptureMode.ONLINE and captured_at is not None and abs(now - captured_at) > timedelta(minutes=skew_min):
        flags.append(GpsFlag.CLOCK_SKEW)
    if captured_at is not None and visit.started_at is not None and captured_at < visit.started_at:
        flags.append(GpsFlag.STALE_FIX)
    if position is not None:
        earlier = GpsCheck.objects.filter(
            visit__rtc_id=visit.rtc_id,
            kind=GpsKind.CLOSE,
            position__isnull=False,
            received_at__date=timezone.localdate(),
        ).exclude(visit__client_id=visit.client_id)
        near = earlier.filter(position__dwithin=(position, 5)).select_related("visit__site").first()
        if near is not None and near.visit.site.location is not None and reference is not None:
            apart = type(site).objects.filter(pk=site.pk).annotate(gap=Distance("location", near.visit.site.location)).first()
            if apart is not None and apart.gap is not None and float(apart.gap.m) > 2000:
                flags.append(GpsFlag.SAME_POINT_REPEATED)
        previous = (
            GpsCheck.objects.filter(visit__rtc_id=visit.rtc_id, kind=GpsKind.CLOSE, position__isnull=False, received_at__lt=now)
            .annotate(gap=Distance("position", position))
            .order_by("-received_at")
            .first()
        )
        if previous is not None and previous.gap is not None:
            hours = (now - previous.received_at).total_seconds() / 3600
            if hours > 0 and (float(previous.gap.m) / 1000) / hours > 120:
                flags.append(GpsFlag.IMPOSSIBLE_SPEED)

    return GpsCheck.objects.create(
        visit=visit,
        kind=kind,
        position=position,
        accuracy_m=accuracy,
        altitude_m=payload.get("altitude_m"),
        captured_at=captured_at or now,
        received_at=now,
        capture_mode=mode,
        error=error,
        reference_location=reference,
        tolerance_m=tolerance,
        distance_m=distance,
        status=status,
        flags=flags,
        review_status=review,
        created_by=visit.rtc,
        updated_by=visit.rtc,
    )
