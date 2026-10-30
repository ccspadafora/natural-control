from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler


class NcError(APIException):
    status_code = 400
    default_code = "request.invalid"
    default_detail = "No se pudo completar la acción."

    def __init__(self, code: str, detail: str, status: int = 400, fields: dict | None = None):
        self.status_code = status
        self.code = code
        self.fields = fields or {}
        super().__init__(detail=detail, code=code)


def nc_exception_handler(exc, context):
    if isinstance(exc, NcError):
        from rest_framework.response import Response

        return Response(
            {"code": exc.code, "detail": str(exc.detail), "fields": exc.fields},
            status=exc.status_code,
        )

    response = exception_handler(exc, context)
    if response is None:
        return None

    status_codes = {401: "auth.unauthorized", 403: "auth.forbidden", 404: "resource.not_found", 429: "request.throttled"}
    code = status_codes.get(response.status_code, "request.invalid")
    data = response.data
    fields: dict = {}
    detail = "No se pudo completar la acción."
    if isinstance(data, dict):
        if "detail" in data:
            detail = str(data["detail"])
            fields = {key: value for key, value in data.items() if key != "detail"}
        else:
            detail = "Revisa los datos e inténtalo de nuevo."
            fields = data
    elif isinstance(data, list):
        detail = " ".join(str(item) for item in data)
    response.data = {"code": code, "detail": detail, "fields": fields}
    return response
