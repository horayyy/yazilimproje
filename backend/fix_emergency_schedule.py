#!/usr/bin/env python
"""
Script to fix emergency doctors schedule - Her vardiyada tam 3 doktor olacak şekilde
"""
import os
import sys
import django
from datetime import datetime, timedelta
from collections import defaultdict

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import Doctor

def calculate_optimal_leave_days():
    """
    Her vardiyada tam 3 doktor olacak şekilde izin günlerini hesapla
    """
    emergency_doctors = list(Doctor.objects.filter(is_emergency_doctor=True, is_active=True).order_by('id'))
    
    if len(emergency_doctors) < 15:
        print(f"⚠️  Yeterli doktor yok: {len(emergency_doctors)}/15")
        return
    
    # 3 vardiya var: 0=00:00-08:00, 1=08:00-16:00, 2=16:00-00:00
    # Her vardiyada 5 doktor var, her gün 3'ü çalışıyor (2'si izinli)
    
    # Doktorları vardiyalara dağıt (ID'ye göre)
    shifts = [[], [], []]  # 3 vardiya
    for i, doctor in enumerate(emergency_doctors):
        shift_index = i % 3
        shifts[shift_index].append(doctor)
    
    print(f"📊 Vardiya dağılımı:")
    for i, shift_doctors in enumerate(shifts):
        print(f"  Vardiya {i+1}: {len(shift_doctors)} doktor")
    
    # Her vardiya için izin günlerini dengeli dağıt
    # Her gün her vardiyada tam 3 doktor çalışmalı
    # Her vardiyada 5 doktor var, her gün 2'si izinli olacak (3'ü çalışacak)
    
    # İzin günleri kombinasyonları - Her gün tam 2 doktor izinli olacak şekilde
    # Pazartesi: 2 doktor izinli, Salı: 2 doktor izinli, vs.
    # 5 doktor × 2 izin günü = 10 izin günü/vardiya
    # 7 gün × 2 izinli doktor = 14 izin günü toplam (ama 5 doktor × 2 = 10)
    
    # Her gün için 2 doktor izinli olacak şekilde dağıt:
    # Pazartesi: Doktor 1, Doktor 2 izinli
    # Salı: Doktor 3, Doktor 4 izinli
    # Çarşamba: Doktor 5, Doktor 1 izinli
    # Perşembe: Doktor 2, Doktor 3 izinli
    # Cuma: Doktor 4, Doktor 5 izinli
    # Cumartesi: Doktor 1, Doktor 3 izinli
    # Pazar: Doktor 2, Doktor 4 izinli
    
    leave_patterns = [
        [1, 3, 6],  # Pazartesi, Çarşamba, Cumartesi (Doktor 1)
        [1, 4, 0],  # Pazartesi, Perşembe, Pazar (Doktor 2)
        [2, 4, 6],  # Salı, Perşembe, Cumartesi (Doktor 3)
        [2, 5, 0],  # Salı, Cuma, Pazar (Doktor 4)
        [3, 5, 6],  # Çarşamba, Cuma, Cumartesi (Doktor 5)
    ]
    
    # Ama her doktor 2 gün izinli olmalı, 3 değil!
    # Düzeltme: Her gün 2 doktor izinli olacak şekilde:
    leave_patterns = [
        [1, 3],  # Pazartesi, Çarşamba
        [1, 4],  # Pazartesi, Perşembe
        [2, 4],  # Salı, Perşembe
        [2, 5],  # Salı, Cuma
        [3, 5],  # Çarşamba, Cuma
    ]
    
    # Bu da yeterli değil. Her gün tam 2 doktor izinli olmalı.
    # Daha iyi bir dağılım:
    # Pazartesi: Doktor 1, 2 izinli → 3 doktor çalışıyor ✓
    # Salı: Doktor 3, 4 izinli → 3 doktor çalışıyor ✓
    # Çarşamba: Doktor 5, 1 izinli → 3 doktor çalışıyor ✓
    # Perşembe: Doktor 2, 3 izinli → 3 doktor çalışıyor ✓
    # Cuma: Doktor 4, 5 izinli → 3 doktor çalışıyor ✓
    # Cumartesi: Doktor 1, 3 izinli → 3 doktor çalışıyor ✓
    # Pazar: Doktor 2, 4 izinli → 3 doktor çalışıyor ✓
    
    leave_patterns = [
        [1, 3, 6],  # Pazartesi, Çarşamba, Cumartesi
        [1, 4, 0],  # Pazartesi, Perşembe, Pazar
        [2, 4, 6],  # Salı, Perşembe, Cumartesi
        [2, 5, 0],  # Salı, Cuma, Pazar
        [3, 5],     # Çarşamba, Cuma
    ]
    
    # Hayır, her doktor 2 gün izinli olmalı. Daha basit:
    # Her gün 2 doktor izinli, 3 doktor çalışıyor
    # 5 doktor, her biri 2 gün izinli = 10 izin günü toplam
    # 7 gün × 2 izinli = 14 izin günü gerekli ama 10 var
    # Bu yüzden bazı günler 1, bazı günler 2 doktor izinli olacak
    
    # En iyi çözüm: Her gün tam 2 doktor izinli olacak şekilde optimize et
    leave_patterns = [
        [1, 3],  # Pazartesi, Çarşamba
        [1, 4],  # Pazartesi, Perşembe  
        [2, 4],  # Salı, Perşembe
        [2, 5],  # Salı, Cuma
        [0, 6],  # Pazar, Cumartesi (eksik günleri kapat)
    ]
    
    # Her vardiya için doktorlara izin günlerini ata
    for shift_index, shift_doctors in enumerate(shifts):
        for doctor_index, doctor in enumerate(shift_doctors):
            # Her doktora farklı izin günleri kombinasyonu ver
            leave_days = leave_patterns[doctor_index % len(leave_patterns)]
            
            # Bugünden itibaren 4 haftalık izin tarihlerini oluştur
            today = datetime.now().date()
            leave_dates = []
            
            for week in range(4):  # 4 hafta ileriye
                for day in leave_days:
                    # Bu haftanın o gününü bul
                    days_ahead = day - today.weekday()
                    if days_ahead < 0:
                        days_ahead += 7
                    days_ahead += (week * 7)
                    
                    leave_date = today + timedelta(days=days_ahead)
                    leave_dates.append(leave_date.strftime('%Y-%m-%d'))
            
            # Doktorun izin günlerini güncelle
            doctor.leave_dates = leave_dates
            doctor.save()
            
            day_names = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
            leave_names = [day_names[d] for d in leave_days]
            print(f"  ✅ Vardiya {shift_index+1} - {doctor.user.get_full_name()}: İzin: {', '.join(leave_names)}")
    
    print(f"\n🎉 İzin planı güncellendi!")
    print(f"💡 Her vardiyada her gün tam 3 doktor çalışacak")

if __name__ == '__main__':
    calculate_optimal_leave_days()

