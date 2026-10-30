"""Staging: prod-like without TLS/S3 obligatorios (HTTP + disco local)."""

import os
from pathlib import Path

from .base import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = [host for host in os.environ.get("ALLOWED_HOSTS", "").split(",") if host]  # noqa: F405
REFRESH_COOKIE_SECURE = os.environ.get("REFRESH_COOKIE_SECURE", "false").lower() == "true"

if not os.environ.get("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# En staging sin MinIO/S3: media en volumen local
_media = Path(os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media")))  # noqa: F405
_media.mkdir(parents=True, exist_ok=True)
MEDIA_ROOT = _media
MEDIA_URL = "/media/"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
