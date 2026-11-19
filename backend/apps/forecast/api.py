from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.forecast.selectors import forecast_deals_payload, forecast_payload


class ForecastView(APIView):
    permission_classes = [requires("forecast.view")]

    def get(self, request):
        try:
            months = int(request.query_params.get("months") or 4)
        except ValueError:
            months = 4
        months = max(1, min(months, 12))
        return Response(forecast_payload(request.user, months=months))


class ForecastDealsView(APIView):
    permission_classes = [requires("forecast.view")]

    def get(self, request):
        horizon = (request.query_params.get("horizon") or "").strip().upper() or None
        if horizon and horizon not in {"CORTO", "MEDIANO", "LARGO"}:
            horizon = None
        product_id = (request.query_params.get("product_id") or "").strip() or None
        return Response(
            forecast_deals_payload(request.user, horizon=horizon, product_id=product_id)
        )
