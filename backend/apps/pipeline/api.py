from datetime import datetime, time, timedelta
from uuid import UUID

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.exceptions import NcError
from apps.core.feature_flags import require_feature
from apps.crm.selectors import client_for, display_name
from apps.pipeline.models import Opportunity, Stage, Task, TaskStatus


def _opp_row(opp: Opportunity) -> dict:
    return {
        "id": str(opp.id),
        "title": opp.title,
        "client_id": str(opp.client_id),
        "client_name": display_name(opp.client),
        "stage_id": str(opp.stage_id),
        "stage_name": opp.stage.name,
        "amount": str(opp.amount),
        "probability": opp.probability,
        "expected_close_date": opp.expected_close_date.isoformat(),
    }


class PipelineOpportunityListView(APIView):
    permission_classes = [requires("pipeline.view")]

    def get(self, request):
        require_feature("pipeline")
        rows = (
            Opportunity.objects.filter(is_deleted=False, owner=request.user)
            .select_related("client", "stage")
            .order_by("-last_activity_at")[:200]
        )
        return Response({"results": [_opp_row(item) for item in rows]})

    def post(self, request):
        require_feature("pipeline")
        if not request.user.has_perm_code("pipeline.edit"):
            raise NcError("auth.forbidden", "No tienes permiso para crear oportunidades.", status=403)
        client_id = request.data.get("client_id")
        title = (request.data.get("title") or "").strip() or "Nueva oportunidad"
        if not client_id:
            raise NcError("request.invalid", "Indica el cliente.", status=400, fields={"client_id": ["required"]})
        client = client_for(request.user, UUID(str(client_id)))
        stage = Stage.objects.filter(is_deleted=False, is_active=True).order_by("order").first()
        if stage is None:
            raise NcError("pipeline.unconfigured", "Aún no hay etapas del embudo.", status=503)
        now = timezone.now()
        probability = int(request.data.get("probability") or stage.probability)
        close_raw = request.data.get("expected_close_date")
        if close_raw:
            expected_close = datetime.fromisoformat(str(close_raw)).date()
        else:
            expected_close = (now + timedelta(days=30)).date()
        opp = Opportunity.objects.create(
            client=client,
            owner=request.user,
            stage=stage,
            title=title,
            amount=request.data.get("amount") or 0,
            probability=probability,
            expected_close_date=expected_close,
            stage_changed_at=now,
            last_activity_at=now,
        )
        return Response(_opp_row(opp), status=201)


class PipelineTaskTodayView(APIView):
    permission_classes = [requires("tasks.view")]

    def get(self, request):
        require_feature("pipeline")
        tz = timezone.get_current_timezone()
        today = timezone.localdate()
        start = timezone.make_aware(datetime.combine(today, time.min), tz)
        end = timezone.make_aware(datetime.combine(today, time.max), tz)
        rows = (
            Task.objects.filter(
                is_deleted=False,
                owner=request.user,
                status=TaskStatus.PENDIENTE,
                due_at__gte=start,
                due_at__lte=end,
            )
            .select_related("client")
            .order_by("due_at")[:200]
        )
        return Response(
            {
                "results": [
                    {
                        "id": str(item.id),
                        "title": item.title,
                        "client_id": str(item.client_id),
                        "client_name": display_name(item.client),
                        "due_at": item.due_at.isoformat(),
                        "kind": item.kind,
                        "status": item.status,
                    }
                    for item in rows
                ]
            }
        )
