from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, DoctorViewSet, AppointmentViewSet, RegisterView, PublicAppointmentView,
    EmergencyServiceViewSet, LeaveRequestViewSet, MedicalReportViewSet, cancel_appointment_by_email,
    request_password_reset, reset_password, change_password
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'emergency-service', EmergencyServiceViewSet, basename='emergency-service')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')
router.register(r'medical-reports', MedicalReportViewSet, basename='medical-report')

urlpatterns = [
    # Register endpoint kaldırıldı - hasta kaydı artık alınmıyor
    # path('register/', RegisterView.as_view(), name='register'),
    path('public-appointments/', PublicAppointmentView.as_view(), name='public-appointment'),
    path('cancel-appointment/<int:appointment_id>/', cancel_appointment_by_email, name='cancel-appointment-by-email'),
    path('password-reset/request/', request_password_reset, name='request-password-reset'),
    path('password-reset/reset/', reset_password, name='reset-password'),
    path('password/change/', change_password, name='change-password'),
    path('', include(router.urls)),
]

