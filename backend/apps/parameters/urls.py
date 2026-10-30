from django.urls import path

from apps.parameters.api import SettingDetailView, SettingListView

urlpatterns = [
    path("settings", SettingListView.as_view()),
    path("settings/<path:key>", SettingDetailView.as_view()),
]
