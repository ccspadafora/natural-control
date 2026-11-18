from django.urls import path

from apps.forecast.api import ForecastView

urlpatterns = [
    path("forecast", ForecastView.as_view()),
]
