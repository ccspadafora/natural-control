from django.urls import path

from apps.accounts.api.views import (
    LoginView,
    LogoutView,
    MeView,
    OtpRequestView,
    OtpVerifyView,
    PasswordResetView,
    RefreshView,
)

urlpatterns = [
    path("auth/login", LoginView.as_view()),
    path("auth/refresh", RefreshView.as_view()),
    path("auth/logout", LogoutView.as_view()),
    path("auth/me", MeView.as_view()),
    path("auth/otp/request", OtpRequestView.as_view()),
    path("auth/otp/verify", OtpVerifyView.as_view()),
    path("auth/password/reset", PasswordResetView.as_view()),
]
