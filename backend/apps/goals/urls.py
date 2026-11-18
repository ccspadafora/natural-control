from django.urls import path

from apps.goals.api import (
    LeagueBoardView,
    MyNumbersView,
    ProductDetailMetricsView,
    RtcDetailMetricsView,
    ScorecardView,
    TeamMetricsView,
    ZoneMetricsView,
)

urlpatterns = [
    path("metrics/my-numbers", MyNumbersView.as_view()),
    path("metrics/team", TeamMetricsView.as_view()),
    path("metrics/zones", ZoneMetricsView.as_view()),
    path("metrics/rtcs/<uuid:user_id>/detail", RtcDetailMetricsView.as_view()),
    path("metrics/products/<uuid:product_id>/detail", ProductDetailMetricsView.as_view()),
    path("league", LeagueBoardView.as_view()),
    path("league/scorecards/<str:user_id>", ScorecardView.as_view()),
]
