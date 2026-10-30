from django.urls import path

from apps.audit.api import AuditLogListView

urlpatterns = [
    path("audit/logs", AuditLogListView.as_view()),
]
