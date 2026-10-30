from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.parameters.manage import list_settings, update_setting


def _row(setting):
    return {
        "key": setting.key,
        "value": setting.value,
        "value_type": setting.value_type,
        "description": setting.description,
        "module": setting.module,
    }


class SettingListView(APIView):
    permission_classes = [requires("settings.view")]

    def get(self, request):
        return Response({"results": [_row(item) for item in list_settings()]})


class SettingDetailView(APIView):
    permission_classes = [requires("settings.edit")]

    def patch(self, request, key):
        return Response(_row(update_setting(request.user, key, request.data.get("value"))))
