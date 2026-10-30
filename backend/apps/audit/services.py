def record(actor, action: str, entity, before=None, after=None, request=None) -> None:
    from apps.audit.models import AuditLog

    entity_id = getattr(entity, "id", None)
    AuditLog.objects.create(
        actor=actor if getattr(actor, "pk", None) else None,
        actor_ip=getattr(request, "META", {}).get("REMOTE_ADDR") if request else None,
        action=action,
        entity_type=entity.__class__.__name__ if entity is not None else "",
        entity_id=entity_id,
        before=before,
        after=after,
        request_id=getattr(request, "request_id", ""),
    )
