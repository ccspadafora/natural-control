from calendar import monthrange
from datetime import date
from decimal import Decimal

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Scope
from apps.accounts.permissions import requires
from apps.core.clock import business_today
from apps.core.exceptions import NcError
from apps.goals.league import league_board, scorecard_detail
from apps.goals.metrics import product_detail, rtc_detail, team_metrics, zone_metrics
from apps.goals.models import Goal, PeriodType, ScorecardSnapshot
from apps.visits.models import Visit, VisitStatus


class MyNumbersView(APIView):
    """KPIs de Mis números / Hoy (presupuesto real + avance demo o visitas)."""

    permission_classes = [requires("metrics.view")]

    def get(self, request):
        today = business_today()
        period_start = date(today.year, today.month, 1)
        goal = (
            Goal.objects.filter(
                user=request.user,
                period_type=PeriodType.MES,
                period_start=period_start,
                is_deleted=False,
            ).first()
            or Goal.objects.filter(user=request.user, period_type=PeriodType.MES, is_deleted=False)
            .order_by("-period_start")
            .first()
        )
        snapshot = (
            ScorecardSnapshot.objects.filter(user=request.user, period_start=period_start, is_deleted=False).first()
            or ScorecardSnapshot.objects.filter(user=request.user, is_deleted=False).order_by("-period_start").first()
        )

        budget = Decimal(goal.sales_budget) if goal else Decimal("0")
        visits_target = int(goal.visits_target) if goal else 0
        attrs = (snapshot.attributes if snapshot else {}) or {}
        sales = Decimal(str(attrs.get("sales") or 0))
        deals = int(attrs.get("deals") or 0)
        visits_done = int(attrs.get("visits") or 0)
        if visits_done <= 0:
            visits_done = Visit.objects.filter(
                rtc=request.user,
                is_deleted=False,
                status=VisitStatus.REALIZADA,
                completed_at__date__gte=period_start,
            ).count()

        days_in_month = monthrange(today.year, today.month)[1]
        day = today.day
        expected = float(budget) * (day / days_in_month) if budget else 0
        falta = max(0.0, float(budget) - float(sales))
        return Response(
            {
                "period_start": (goal.period_start if goal else period_start).isoformat(),
                "sales": float(sales),
                "budget": float(budget),
                "expected": expected,
                "falta": falta,
                "visits_done": visits_done,
                "visits_target": visits_target,
                "deals": deals,
                "gen": snapshot.gen if snapshot else None,
                "rank_zone": snapshot.rank_zone if snapshot else None,
                "zone_size": attrs.get("zone_size"),
                "day": day,
                "days_in_month": days_in_month,
            }
        )


class TeamMetricsView(APIView):
    permission_classes = [requires("metrics.view")]

    def get(self, request):
        if request.user.effective_scope == Scope.OWN:
            raise NcError("auth.forbidden", "Las métricas de equipo son para líderes y gerencia.", status=403)
        period = request.query_params.get("period") or "mes"
        if period not in {"mes", "semana", "dia", "anio"}:
            period = "mes"
        return Response(team_metrics(request.user, period=period))


class ZoneMetricsView(APIView):
    permission_classes = [requires("metrics.view")]

    def get(self, request):
        if request.user.effective_scope == Scope.OWN:
            raise NcError("auth.forbidden", "Las métricas de zona son para líderes y gerencia.", status=403)
        return Response(zone_metrics(request.user))


class RtcDetailMetricsView(APIView):
    permission_classes = [requires("metrics.view")]

    def get(self, request, user_id):
        if request.user.effective_scope == Scope.OWN:
            raise NcError("auth.forbidden", "Las métricas de equipo son para líderes y gerencia.", status=403)
        return Response(rtc_detail(request.user, str(user_id)))


class ProductDetailMetricsView(APIView):
    permission_classes = [requires("metrics.view")]

    def get(self, request, product_id):
        if request.user.effective_scope == Scope.OWN:
            raise NcError("auth.forbidden", "Las métricas de equipo son para líderes y gerencia.", status=403)
        return Response(product_detail(request.user, str(product_id)))


class LeagueBoardView(APIView):
    """HU-15.4 · tabla de liga, insignias, tercio inferior y once ideal."""

    permission_classes = [requires("metrics.view")]

    def get(self, request):
        zone = request.query_params.get("zone")
        return Response(league_board(request.user, zone=zone))


class ScorecardView(APIView):
    """HU-15.2 / 15.3 · carta de un comercial (o `me`)."""

    permission_classes = [requires("metrics.view")]

    def get(self, request, user_id="me"):
        return Response(scorecard_detail(request.user, user_id))
