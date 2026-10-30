from rest_framework.permissions import BasePermission


def requires(code: str):
    class _Requires(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.has_perm_code(code))

    _Requires.__name__ = f"Requires_{code.replace('.', '_')}"
    return _Requires
