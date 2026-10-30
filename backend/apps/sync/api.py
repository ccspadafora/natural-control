from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
