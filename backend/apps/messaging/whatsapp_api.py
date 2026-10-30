from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.feature_flags import require_feature


class WhatsappConversationListView(APIView):
    permission_classes = [requires("whatsapp.view")]

    def get(self, request):
        require_feature("whatsapp")
        return Response({"results": []})
