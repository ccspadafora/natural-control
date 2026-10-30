from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.feature_flags import require_feature
from apps.parameters.services import get_setting


class ErpStatusView(APIView):
    permission_classes = [requires("erp.manage")]

    def get(self, request):
        require_feature("erp")
        return Response({"enabled": bool(get_setting("feature.erp")), "last_run": None})


class ErpUnmatchedView(APIView):
    permission_classes = [requires("erp.manage")]

    def get(self, request):
        require_feature("erp")
        return Response({"results": []})
