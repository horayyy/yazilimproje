from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, Department, Doctor, Appointment, EmergencyService


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin configuration for CustomUser model"""
    
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_staff', 'is_active', 'is_superuser', 'date_joined')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Information', {'fields': ('user_type', 'phone', 'national_id')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Information', {'fields': ('user_type', 'phone', 'national_id', 'email', 'first_name', 'last_name')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin configuration for Department model"""
    
    list_display = ('name', 'description')
    search_fields = ('name', 'description')


class DoctorAdminForm(forms.ModelForm):
    class Meta:
        model = Doctor
        fields = '__all__'

    def clean(self):
        cleaned = super().clean()
        # If emergency doctor, enforce department = None to keep data consistent
        if cleaned.get('is_emergency_doctor'):
            cleaned['department'] = None
        return cleaned


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    """Admin configuration for Doctor model with department hidden for emergency doctors"""

    form = DoctorAdminForm
    list_display = ('user', 'department', 'title', 'is_emergency_doctor', 'is_active')
    list_filter = ('department', 'is_active', 'title', 'is_emergency_doctor')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'title')
    raw_id_fields = ('user',)

    def get_fields(self, request, obj=None):
        """Hide `department` field when editing an emergency doctor to avoid accidental assignment."""
        fields = list(super().get_fields(request, obj))
        if obj and getattr(obj, 'is_emergency_doctor', False):
            if 'department' in fields:
                fields.remove('department')
        return fields


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """Admin configuration for Appointment model"""
    
    list_display = ('patient', 'doctor', 'date', 'time', 'status')
    list_filter = ('status', 'date', 'doctor__department')
    search_fields = ('patient__username', 'patient__first_name', 'patient__last_name', 
                     'doctor__user__username', 'doctor__user__first_name', 'doctor__user__last_name')
    raw_id_fields = ('patient', 'doctor')
    date_hierarchy = 'date'


@admin.register(EmergencyService)
class EmergencyServiceAdmin(admin.ModelAdmin):
    """Admin configuration for EmergencyService model"""
    
    list_display = ('__str__', 'is_active', 'status', 'is_24_7', 'phone')
    list_filter = ('is_active', 'status', 'is_24_7')
    fieldsets = (
        ('Durum', {
            'fields': ('is_active', 'status', 'is_24_7')
        }),
        ('İletişim Bilgileri', {
            'fields': ('phone', 'address')
        }),
        ('Notlar', {
            'fields': ('notes',)
        }),
    )
