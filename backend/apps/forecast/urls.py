from django.urls import path

from apps.forecast.api import ForecastDealsView, ForecastView

urlpatterns = [
    path("forecast", ForecastView.as_view()),
    path("forecast/deals", ForecastDealsView.as_view()),
]
