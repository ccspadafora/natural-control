from .base import *  # noqa: F403

DEBUG = False
REFRESH_COOKIE_SECURE = True
ALLOWED_HOSTS = [host for host in os.environ.get("ALLOWED_HOSTS", "").split(",") if host]  # noqa: F405
