from django.urls import path

from apps.automation.api import AutomationRuleListView

urlpatterns = [
    path("automation/rules", AutomationRuleListView.as_view()),
]
