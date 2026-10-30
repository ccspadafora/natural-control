from django.urls import path

from apps.sync.api import SyncMutationsView

urlpatterns = [
    path("sync/mutations", SyncMutationsView.as_view()),
]
