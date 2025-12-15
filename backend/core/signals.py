from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, Doctor


@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create Doctor profile when a user with user_type=Doctor is created"""
    
    if created and instance.user_type == 3:  # Doctor user type
        # Check if Doctor profile doesn't already exist
        if not hasattr(instance, 'doctor_profile'):
            doctor = Doctor.objects.create(
                user=instance,
                department=None,  # Can be set later
                is_active=True
            )
            # Varsayılan çalışma saatlerini ayarla
            doctor.set_default_working_hours()

