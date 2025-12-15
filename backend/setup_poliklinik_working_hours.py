#!/usr/bin/env python
"""
Poliklinik doktorlarının varsayılan çalışma saatlerini ayarla
Pazartesi-Cuma: 08:00-17:00
Hafta sonu: Kapalı
"""

import os
import sys
import django

# Django ayarlarını yükle
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import Doctor

def setup_working_hours():
    """Poliklinik doktorlarının varsayılan çalışma saatlerini ayarla"""
    doctors = Doctor.objects.filter(is_emergency_doctor=False)
    updated_count = 0
    
    for doctor in doctors:
        # Eğer working_hours boşsa veya yoksa varsayılan değerleri ayarla
        if not doctor.working_hours or len(doctor.working_hours) == 0:
            doctor.set_default_working_hours()
            updated_count += 1
            print(f"✅ {doctor.user.get_full_name() or doctor.user.username} - Varsayılan çalışma saatleri ayarlandı")
        else:
            print(f"ℹ️  {doctor.user.get_full_name() or doctor.user.username} - Zaten çalışma saatleri var")
    
    print(f"\n✨ Toplam {updated_count} doktor güncellendi!")
    return updated_count

if __name__ == '__main__':
    print("=" * 60)
    print("🏥 Poliklinik Doktorları Çalışma Saatleri Ayarlama")
    print("=" * 60)
    print()
    setup_working_hours()
    print()
    print("=" * 60)
    print("✅ İşlem tamamlandı!")
    print("=" * 60)

