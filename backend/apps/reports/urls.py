from django.urls import path

from apps.reports.api import AiReportListView

urlpatterns = [
    path("reports/ai", AiReportListView.as_view()),
]
