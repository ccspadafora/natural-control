from rest_framework_simplejwt.authentication import JWTAuthentication as SimpleJWTAuthentication


class JWTAuthentication(SimpleJWTAuthentication):
    """Access token solo por cabecera Authorization. El refresh vive en la cookie."""
