import uuid

from django.utils.deprecation import MiddlewareMixin


class RequestIdMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))

    def process_response(self, request, response):
        response["X-Request-Id"] = getattr(request, "request_id", "")
        return response
