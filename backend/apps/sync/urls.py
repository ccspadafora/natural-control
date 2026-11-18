from django.urls import path

from apps.sync.api import SyncBootstrapView, SyncMutationsView, SyncPullView

urlpatterns = [
    path("sync/mutations", SyncMutationsView.as_view()),
    path("sync/bootstrap", SyncBootstrapView.as_view()),
    path("sync/pull", SyncPullView.as_view()),
]
