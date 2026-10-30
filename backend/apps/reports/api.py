from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.feature_flags import require_feature


class AiReportListView(APIView):
    permission_classes = [requires("ai_reports.view")]

    def get(self, request):
        require_feature("ai_reports")
        return Response({"results": []})
