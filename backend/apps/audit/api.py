from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.audit.models import AuditLog


def _row(entry: AuditLog) -> dict:
    return {
        "id": entry.id,
        "at": entry.at.isoformat(),
        "action": entry.action,
        "entity_type": entry.entity_type,
        "entity_id": str(entry.entity_id) if entry.entity_id else None,
        "actor_id": str(entry.actor_id) if entry.actor_id else None,
        "actor_email": entry.actor.email if entry.actor_id else None,
    }


class AuditLogListView(APIView):
    permission_classes = [requires("audit.view")]

    def get(self, request):
        page_size = min(max(int(request.query_params.get("page_size", 50)), 1), 200)
        cursor = request.query_params.get("cursor")
        qs = AuditLog.objects.select_related("actor").order_by("-at", "-id")
        if cursor:
            try:
                cursor_id = int(cursor)
            except ValueError:
                cursor_id = None
            if cursor_id is not None:
                qs = qs.filter(id__lt=cursor_id)
        rows = list(qs[: page_size + 1])
        has_next = len(rows) > page_size
        if has_next:
            rows = rows[:page_size]
        next_cursor = str(rows[-1].id) if has_next and rows else None
        return Response(
            {
                "next": f"?cursor={next_cursor}&page_size={page_size}" if next_cursor else None,
                "previous": None,
                "results": [_row(item) for item in rows],
            }
        )
