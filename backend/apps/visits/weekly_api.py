from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.visits.models import WeeklyPlanStatus
from apps.visits.weekly import (
    add_item,
    approve_plan,
    compliance,
    current_plan,
    deadline_for,
    delete_item,
    list_plans,
    open_plan,
    reminder_for,
    return_plan,
    set_requirement,
    submit_plan,
    target_period,
    update_item,
    week_bounds,
)


def _item(item, warning=None):
    return {
        "id": str(item.id),
        "client_id": str(item.client_id),
        "client_name": item.client.trade_name or item.client.legal_name,
        "site_id": str(item.site_id),
        "planned_date": item.planned_date.isoformat(),
        "slot": item.slot,
        "reason_id": str(item.reason_id) if item.reason_id else None,
        "reason": item.reason.name if item.reason_id else "",
        "objective": item.objective,
        "visit_id": str(item.visit_id) if item.visit_id else None,
        "warning": warning if warning is not None else getattr(item, "_warning", None),
    }


def _plan(plan, user):
    start, end = week_bounds(plan.iso_year, plan.iso_week)
    items = list(plan.items.select_related("client", "reason").order_by("planned_date", "slot"))
    return {
        "id": str(plan.id),
        "iso_year": plan.iso_year,
        "iso_week": plan.iso_week,
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "status": plan.status,
        "deadline_at": plan.deadline_at.isoformat(),
        "submitted_at": plan.submitted_at.isoformat() if plan.submitted_at else None,
        "is_late": plan.is_late,
        "review_note": plan.review_note,
        "editable": plan.rtc_id == user.id and plan.status in (WeeklyPlanStatus.BORRADOR, WeeklyPlanStatus.DEVUELTA),
        "items": [_item(item) for item in items],
    }


def _current(user, plan):
    year, week = (plan.iso_year, plan.iso_week) if plan else target_period()
    start, end = week_bounds(year, week)
    return {
        "required": user.requires_weekly_plan,
        "reason": user.requires_weekly_plan_reason,
        "reminder": reminder_for(user, plan),
        "iso_year": year,
        "iso_week": week,
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "deadline_at": (plan.deadline_at if plan else deadline_for(year, week)).isoformat(),
        "plan": _plan(plan, user) if plan else None,
    }


class WeeklyPlanCurrentView(APIView):
    def get_permissions(self):
        code = "weekly_plan.submit" if self.request.method == "POST" else "weekly_plan.view"
        return [requires(code)()]

    def get(self, request):
        plan, _year, _week = current_plan(request.user)
        return Response(_current(request.user, plan))

    def post(self, request):
        plan = open_plan(request.user)
        plan = type(plan).objects.prefetch_related("items__client", "items__reason").get(id=plan.id)
        return Response(_current(request.user, plan), status=201)


class WeeklyPlanListView(APIView):
    permission_classes = [requires("weekly_plan.view")]

    def get(self, request):
        rows = list_plans(
            request.user,
            request.query_params.get("iso_year"),
            request.query_params.get("iso_week"),
            request.query_params.get("rtc"),
            request.query_params.get("status"),
        )
        return Response({"results": [_plan(plan, request.user) for plan in rows[:100]]})


class WeeklyPlanSubmitView(APIView):
    permission_classes = [requires("weekly_plan.submit")]

    def post(self, request, plan_id):
        plan, warnings = submit_plan(request.user, plan_id)
        body = _plan(plan, request.user)
        body["warnings"] = warnings
        return Response(body)


class WeeklyPlanApproveView(APIView):
    permission_classes = [requires("weekly_plan.review")]

    def post(self, request, plan_id):
        plan, warnings = approve_plan(request.user, plan_id, request.data.get("note", ""))
        body = _plan(plan, request.user)
        body["warnings"] = warnings
        return Response(body)


class WeeklyPlanReturnView(APIView):
    permission_classes = [requires("weekly_plan.review")]

    def post(self, request, plan_id):
        plan = return_plan(request.user, plan_id, request.data.get("note", ""))
        return Response(_plan(plan, request.user))


class WeeklyPlanItemListView(APIView):
    permission_classes = [requires("weekly_plan.submit")]

    def post(self, request, plan_id):
        item, warning = add_item(request.user, plan_id, request.data)
        return Response(_item(item, warning), status=201)


class WeeklyPlanItemView(APIView):
    permission_classes = [requires("weekly_plan.submit")]

    def patch(self, request, item_id):
        item, warning = update_item(request.user, item_id, request.data)
        return Response(_item(item, warning))

    def delete(self, request, item_id):
        delete_item(request.user, item_id)
        return Response(status=204)


class WeeklyPlanComplianceView(APIView):
    permission_classes = [requires("weekly_plan.review")]

    def get(self, request):
        year = request.query_params.get("iso_year")
        week = request.query_params.get("iso_week")
        return Response(compliance(request.user, int(year) if year else None, int(week) if week else None))


class WeeklyRequirementView(APIView):
    permission_classes = [requires("weekly_plan.require")]

    def put(self, request, user_id):
        user = set_requirement(request.user, user_id, bool(request.data.get("required")), request.data.get("reason", ""))
        return Response(
            {
                "id": str(user.id),
                "required": user.requires_weekly_plan,
                "reason": user.requires_weekly_plan_reason,
            }
        )
