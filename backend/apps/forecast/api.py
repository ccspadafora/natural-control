from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.forecast.selectors import forecast_payload


class ForecastView(APIView):
    permission_classes = [requires("forecast.view")]

    def get(self, request):
        try:
            months = int(request.query_params.get("months") or 4)
        except ValueError:
            months = 4
        months = max(1, min(months, 12))
        return Response(forecast_payload(request.user, months=months))
