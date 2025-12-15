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


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    """Admin configuration for Doctor model"""
    
    list_display = ('user', 'department', 'title', 'is_active')
    list_filter = ('department', 'is_active', 'title')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'title')
    raw_id_fields = ('user',)


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
