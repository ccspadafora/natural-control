from django.urls import path

from apps.accounts.devices_api import DeviceListView, DeviceRevokeView

urlpatterns = [
    path("devices", DeviceListView.as_view()),
    path("devices/<uuid:device_id>/revoke", DeviceRevokeView.as_view()),
]
