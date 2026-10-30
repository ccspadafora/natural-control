from django.urls import path

from apps.accounts.directory_api import (
    ClientReassignView,
    RoleListView,
    UserActiveView,
    UserDetailView,
    UserListView,
    ZoneDetailView,
    ZoneListView,
)
from apps.visits.weekly_api import WeeklyRequirementView

urlpatterns = [
    path("users", UserListView.as_view()),
    path("users/<uuid:user_id>/weekly-plan-requirement", WeeklyRequirementView.as_view()),
    path("users/<uuid:user_id>", UserDetailView.as_view()),
    path("users/<uuid:user_id>/<str:action>", UserActiveView.as_view()),
    path("roles", RoleListView.as_view()),
    path("zones", ZoneListView.as_view()),
    path("zones/<uuid:zone_id>", ZoneDetailView.as_view()),
    path("clients/reassign", ClientReassignView.as_view()),
]
