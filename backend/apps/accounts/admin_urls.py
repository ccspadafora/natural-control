from django.urls import path

from apps.accounts.admin_api import AdminHealthView

urlpatterns = [
    path("admin/health", AdminHealthView.as_view()),
]
