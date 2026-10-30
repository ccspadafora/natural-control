from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def live(_request):
    return JsonResponse({"status": "ok"})


def ready(_request):
    from django.core.cache import cache
    from django.db import connection

    connection.ensure_connection()
    cache.set("health:ready", "1", 5)
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health/live", live),
    path("api/health/ready", ready),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/v1/", include("apps.accounts.api.urls")),
    path("api/v1/", include("apps.accounts.directory_urls")),
    path("api/v1/", include("apps.crm.urls")),
    path("api/v1/", include("apps.visits.urls")),
    path("api/v1/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.parameters.urls")),
    path("api/v1/", include("apps.sync.urls")),
    path("api/v1/", include("apps.pipeline.urls")),
    path("api/v1/", include("apps.messaging.whatsapp_urls")),
    path("api/v1/", include("apps.automation.urls")),
    path("api/v1/", include("apps.integrations.urls")),
    path("api/v1/", include("apps.reports.urls")),
    path("api/v1/", include("apps.audit.urls")),
    path("api/v1/", include("apps.accounts.devices_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
