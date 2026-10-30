import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone


def publish_plan(plan) -> None:
    try:
        layer = get_channel_layer()
        if layer is None:
            return
        message = {
            "type": "stream.event",
            "event": "weekly_plan.submitted",
            "id": str(uuid.uuid4()),
            "at": timezone.now().isoformat(),
            "data": {
                "entity_type": "weekly_plan",
                "entity_id": str(plan.id),
                "rtc_id": str(plan.rtc_id),
                "status": plan.status,
                "iso_year": plan.iso_year,
                "iso_week": plan.iso_week,
                "is_late": plan.is_late,
            },
        }
        groups = {f"user.{plan.rtc_id}", "org.all"}
        if plan.rtc.zone_id:
            groups.add(f"zone.{plan.rtc.zone_id}")
        for group in groups:
            async_to_sync(layer.group_send)(group, message)
    except Exception:
        return


def publish_visit(event: str, visit, check=None) -> None:
    try:
        layer = get_channel_layer()
        if layer is None:
            return
        data = {
            "entity_type": "visit",
            "entity_id": str(visit.id),
            "client_name": visit.client.trade_name or visit.client.legal_name,
            "status": visit.status,
            "rtc_id": str(visit.rtc_id),
        }
        if check is not None:
            data["gps_status"] = check.status
            data["distance_m"] = check.distance_m
            data["review_status"] = check.review_status
        message = {
            "type": "stream.event",
            "event": event,
            "id": str(uuid.uuid4()),
            "at": timezone.now().isoformat(),
            "data": data,
        }
        groups = {f"user.{visit.rtc_id}", "org.all"}
        if visit.client.zone_id:
            groups.add(f"zone.{visit.client.zone_id}")
        for group in groups:
            async_to_sync(layer.group_send)(group, message)
    except Exception:
        return
