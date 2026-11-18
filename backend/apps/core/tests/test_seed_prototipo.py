import pytest
from django.db.models import Sum

from apps.core.prototipo.data import PROTO_RTCS
from apps.core.prototipo.seed import seed_prototipo
from apps.core.seed import seed
from apps.visits.models import PotentialStatus, ProductKind, VisitProduct

pytestmark = pytest.mark.django_db


def test_seed_prototipo_idempotent_and_potential():
    seed()
    seed_prototipo()
    seed_prototipo()
    from django.contrib.auth import get_user_model
    from apps.core.prototipo.data import PROTO_VISITS
    from apps.crm.models import Client

    for row in PROTO_RTCS:
        user = get_user_model().objects.get(email=row["email"])
        has_anchor = any(v["rtc"] == row["id"] for v in PROTO_VISITS) or Client.objects.filter(
            owner=user, is_deleted=False
        ).exists()
        if not has_anchor:
            continue
        total = (
            VisitProduct.objects.filter(
                visit__rtc=user,
                kind=ProductKind.POTENCIAL,
                status=PotentialStatus.ABIERTO,
                is_deleted=False,
            ).aggregate(t=Sum("total_value"))["t"]
            or 0
        )
        assert float(total) == pytest.approx(float(row["pot"]), rel=0.05)
