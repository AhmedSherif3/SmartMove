from django.urls import path
from .views import (
    CsrfCookieView,
    RegisterView, VerifyEmailView, ResendOTPView,
    LoginView, LogoutView, RefreshView,
    ForgotPasswordView, VerifyForgotOTPView, ResetPasswordView,
    ChangePasswordRequestView, ChangePasswordVerifyView,
    UpdateRegionView, UpdateUserRoleView,
    GoogleAuthView, GoogleAuthSetRegionView,
    MicrosoftAuthView, MicrosoftAuthSetRegionView,
)

urlpatterns = [
    # CSRF bootstrap
    path('csrf/',                  CsrfCookieView.as_view()),

    # Registration & verification
    path('register/',              RegisterView.as_view()),
    path('verify-email/',          VerifyEmailView.as_view()),
    path('resend-otp/',            ResendOTPView.as_view()),

    # Login & logout
    path('login/',                 LoginView.as_view()),
    path('logout/',                LogoutView.as_view()),
    path('refresh/',               RefreshView.as_view()),

    # Forgot password (not logged in)
    path('forgot-password/',       ForgotPasswordView.as_view()),
    path('verify-forgot-otp/',     VerifyForgotOTPView.as_view()),
    path('reset-password/',        ResetPasswordView.as_view()),

    # Change password (logged in)
    path('change-password/request/', ChangePasswordRequestView.as_view()),
    path('change-password/verify/',  ChangePasswordVerifyView.as_view()),

    # Region
    path('region/',                UpdateRegionView.as_view()),

    # Admin
    path('users/<int:user_id>/role/', UpdateUserRoleView.as_view()),

    # Social auth
    path('google/',                GoogleAuthView.as_view()),
    path('google/set-region/',     GoogleAuthSetRegionView.as_view()),
    path('microsoft/',             MicrosoftAuthView.as_view()),
    path('microsoft/set-region/',  MicrosoftAuthSetRegionView.as_view()),
]