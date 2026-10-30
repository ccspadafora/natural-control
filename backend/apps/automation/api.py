from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.feature_flags import require_feature


class AutomationRuleListView(APIView):
    permission_classes = [requires("automation.view")]

    def get(self, request):
        require_feature("automation")
        return Response({"results": []})
