from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.core.scoping import scope_queryset
from apps.crm.models import Client


def clients_for(user, query: str = ""):
    qs = scope_queryset(
        Client.objects.filter(is_deleted=False).select_related("client_type", "zone", "price_list", "owner"),
        user,
    )
    term = query.strip()
    if term:
        qs = qs.filter(
            Q(legal_name__unaccent__icontains=term)
            | Q(trade_name__unaccent__icontains=term)
            | Q(document_number__icontains=term)
            | Q(sites__municipality__name__unaccent__icontains=term, sites__is_deleted=False)
        ).distinct()
    return qs.order_by("legal_name")


def client_for(user, client_id) -> Client:
    from apps.core.exceptions import NcError

    client = (
        clients_for(user)
        .filter(id=client_id)
        .prefetch_related("sites__municipality")
        .first()
    )
    if client is None:
        raise NcError("resource.not_found", "No encontramos ese cliente.", status=404)
    return client


def is_new(client: Client) -> bool:
    return client.created_at >= timezone.now() - timedelta(days=7)


def primary_site(client: Client):
    return client.sites.filter(is_deleted=False).order_by("-is_primary", "created_at").first()


def display_name(client: Client) -> str:
    return client.trade_name or client.legal_name
