from django.urls import path

from apps.integrations.api import ErpStatusView, ErpUnmatchedView

urlpatterns = [
    path("erp/status", ErpStatusView.as_view()),
    path("erp/unmatched", ErpUnmatchedView.as_view()),
]
