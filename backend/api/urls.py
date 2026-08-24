from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView, LoginView, SendOTPView, VerifyOTPView, AdminDashboardView, UserViewSet, LocationPinViewSet,
    GroupRideViewSet, ChatMessageViewSet, MotorcycleViewSet, ExpenseViewSet,
)

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('pins', LocationPinViewSet, basename='pin')
router.register('rides', GroupRideViewSet, basename='ride')
router.register('messages', ChatMessageViewSet, basename='message')
router.register('motorcycles', MotorcycleViewSet, basename='motorcycle')
router.register('expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('', include(router.urls)),
]

