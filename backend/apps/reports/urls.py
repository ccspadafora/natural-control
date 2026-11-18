from django.urls import path

from apps.reports.api import AiReportListView, ExportCreateView, ExportDetailView, ExportDownloadView

urlpatterns = [
    path("reports/ai", AiReportListView.as_view()),
    path("exports", ExportCreateView.as_view()),
    path("exports/<uuid:export_id>", ExportDetailView.as_view()),
    path("exports/<uuid:export_id>/download", ExportDownloadView.as_view()),
]
