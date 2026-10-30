from django.db.models import Q

from apps.accounts.models import Scope


def scope_queryset(qs, user, *, owner_field: str = "owner"):
    scope = user.effective_scope
    if scope == Scope.ALL:
        return qs
    if scope == Scope.OWN:
        return qs.filter(**{owner_field: user})
    if scope == Scope.TEAM:
        return qs.filter(Q(**{owner_field: user}) | Q(**{f"{owner_field}__team__leader": user}))
    if scope == Scope.ZONE:
        return qs.filter(Q(**{owner_field: user}) | Q(**{f"{owner_field}__zone__in": user.led_zones.all()}))
    return qs.none()
