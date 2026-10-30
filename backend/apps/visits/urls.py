from django.urls import path

from apps.visits.api import (
    EvidenceUploadView,
    GpsCheckListView,
    GpsReviewView,
    VisitAssignView,
    VisitCloseView,
    VisitDetailView,
    VisitNotDoneView,
    VisitNowView,
    VisitReassignView,
    VisitStartView,
)
from apps.visits.weekly_api import (
    WeeklyPlanApproveView,
    WeeklyPlanComplianceView,
    WeeklyPlanCurrentView,
    WeeklyPlanItemListView,
    WeeklyPlanItemView,
    WeeklyPlanListView,
    WeeklyPlanReturnView,
    WeeklyPlanSubmitView,
)

urlpatterns = [
    path("weekly-plans/current", WeeklyPlanCurrentView.as_view()),
    path("weekly-plans/compliance", WeeklyPlanComplianceView.as_view()),
    path("weekly-plans", WeeklyPlanListView.as_view()),
    path("weekly-plans/<uuid:plan_id>/items", WeeklyPlanItemListView.as_view()),
    path("weekly-plans/<uuid:plan_id>/submit", WeeklyPlanSubmitView.as_view()),
    path("weekly-plans/<uuid:plan_id>/approve", WeeklyPlanApproveView.as_view()),
    path("weekly-plans/<uuid:plan_id>/return", WeeklyPlanReturnView.as_view()),
    path("weekly-plan-items/<uuid:item_id>", WeeklyPlanItemView.as_view()),
    path("visits/now", VisitNowView.as_view()),
    path("visits/assign", VisitAssignView.as_view()),
    path("visits/<uuid:visit_id>/reassign", VisitReassignView.as_view()),
    path("visits/<uuid:visit_id>", VisitDetailView.as_view()),
    path("visits/<uuid:visit_id>/start", VisitStartView.as_view()),
    path("visits/<uuid:visit_id>/close", VisitCloseView.as_view()),
    path("visits/<uuid:visit_id>/not-done", VisitNotDoneView.as_view()),
    path("visits/<uuid:visit_id>/evidence", EvidenceUploadView.as_view()),
    path("gps-checks", GpsCheckListView.as_view()),
    path("gps-checks/<uuid:check_id>/review", GpsReviewView.as_view()),
]
