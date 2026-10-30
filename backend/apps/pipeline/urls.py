from django.urls import path

from apps.pipeline.api import PipelineOpportunityListView, PipelineTaskTodayView

urlpatterns = [
    path("pipeline/opportunities", PipelineOpportunityListView.as_view()),
    path("pipeline/tasks", PipelineTaskTodayView.as_view()),
]
