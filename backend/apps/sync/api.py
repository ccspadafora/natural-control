from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sync.read import bootstrap, pull
from apps.sync.services import apply_mutations


class SyncMutationsView(APIView):
    """Aplica mutaciones encoladas en Campo (idempotente por client_uuid)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        mutations = request.data.get("mutations") or []
        if not isinstance(mutations, list):
            mutations = []
        results = apply_mutations(request.user, mutations)
        return Response({"results": results})


class SyncBootstrapView(APIView):
    """HU-10.1 · snapshot inicial para Campo offline."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(bootstrap(request.user))


class SyncPullView(APIView):
    """HU-10.1 · delta desde cursor opaco."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(pull(request.user, request.query_params.get("cursor")))
