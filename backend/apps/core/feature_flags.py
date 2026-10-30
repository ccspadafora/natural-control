from apps.core.exceptions import NcError
from apps.parameters.services import get_setting


def require_feature(name: str) -> None:
    if not get_setting(f"feature.{name}"):
        raise NcError("feature.disabled", "Función apagada", status=404)
