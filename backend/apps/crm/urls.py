from django.urls import path

from apps.crm.api import (
    AgendaView,
    ClientDetailView,
    ClientListView,
    ClientTypeListView,
    CropTypeListView,
    MunicipalityListView,
    ProductListView,
    VisitCreateView,
    VisitReasonListView,
)
from apps.crm.location_api import (
    LocationChangeCreateView,
    LocationChangeDecideView,
    LocationChangeListView,
)

urlpatterns = [
    path("clients", ClientListView.as_view()),
    path("clients/<uuid:client_id>", ClientDetailView.as_view()),
    path("client-types", ClientTypeListView.as_view()),
    path("crop-types", CropTypeListView.as_view()),
    path("municipalities", MunicipalityListView.as_view()),
    path("products", ProductListView.as_view()),
    path("visits/agenda", AgendaView.as_view()),
    path("visits", VisitCreateView.as_view()),
    path("visit-reasons", VisitReasonListView.as_view()),
    path("location-changes", LocationChangeListView.as_view()),
    path("location-changes/create", LocationChangeCreateView.as_view()),
    path("location-changes/<uuid:request_id>/decide", LocationChangeDecideView.as_view()),
]
