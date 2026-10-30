from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import services


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.data.get("remember", True)
        remember = raw if isinstance(raw, bool) else str(raw).lower() not in {"false", "0", "no"}
        access, refresh, user = services.login(
            request.data.get("identifier", ""),
            request.data.get("password", ""),
            request,
            remember=remember,
        )
        response = Response({"access": access, "user": user, "mfa_required": False})
        services.set_refresh_cookie(response, refresh, remember=remember)
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        access, refresh, remember = services.refresh_session(request.COOKIES.get(settings.REFRESH_COOKIE_NAME, ""), request)
        response = Response({"access": access})
        services.set_refresh_cookie(response, refresh, remember=remember)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        services.logout(request.COOKIES.get(settings.REFRESH_COOKIE_NAME, ""), request)
        response = Response(status=204)
        services.clear_refresh_cookie(response)
        return response


class MeView(APIView):
    def get(self, request):
        return Response(services.user_payload(request.user))


class OtpRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        purpose = request.data.get("purpose") or "LOGIN"
        if purpose not in {"LOGIN", "PASSWORD_RESET"}:
            purpose = "LOGIN"
        services.request_code(request.data.get("identifier", ""), purpose, request)
        return Response(status=202)


class OtpVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        access, refresh, user = services.verify_otp_login(
            request.data.get("identifier", ""),
            request.data.get("code", ""),
            request,
        )
        response = Response({"access": access, "user": user, "mfa_required": False})
        services.set_refresh_cookie(response, refresh)
        return response


class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        services.reset_password(
            request.data.get("identifier", ""),
            request.data.get("code", ""),
            request.data.get("new_password", ""),
            request,
        )
        return Response(status=204)
