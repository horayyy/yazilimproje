#!/usr/bin/env python
"""
Script to setup emergency doctors with 2 days off per week schedule
Her doktor haftada 5 gün çalışacak, 2 gün izinli olacak
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import CustomUser, Doctor

def calculate_required_doctors():
    """
    Haftalık vardiya ihtiyacını hesapla:
    - 7 gün × 3 vardiya = 21 vardiya/gün
    - Her vardiyada TAM 3 doktor olmalı
    - Toplam ihtiyaç: 21 × 3 = 63 doktor/vardiya
    - Her doktor 5 gün çalışıyor (2 gün izin)
    - Minimum doktor sayısı: 63 / 5 = 12.6 → 13 doktor
    - Ama daha dengeli dağılım için: 15 doktor (her vardiyada 5 doktor, her gün 3'ü çalışıyor)
    """
    return 15

def generate_leave_dates_for_doctor(doctor_index, total_doctors):
    """
    Doktorların izin günlerini dengeli dağıt
    Her doktor haftada 2 gün izinli olacak
    Her gün her vardiyada en az 3 doktor olmalı
    """
    # Haftanın günleri: 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    # İzin günlerini rotasyonlu olarak dağıt - 15 doktor için optimize edilmiş
    
    # Her doktor için farklı izin günleri kombinasyonu (15 doktor için)
    leave_combinations = [
        [1, 4],  # Pazartesi, Perşembe
        [2, 5],  # Salı, Cuma
        [3, 6],  # Çarşamba, Cumartesi
        [0, 3],  # Pazar, Çarşamba
        [1, 5],  # Pazartesi, Cuma
        [2, 6],  # Salı, Cumartesi
        [0, 4],  # Pazar, Perşembe
        [3, 5],  # Çarşamba, Cuma
        [0, 2],  # Pazar, Salı
        [1, 6],  # Pazartesi, Cumartesi
        [2, 4],  # Salı, Perşembe
        [0, 5],  # Pazar, Cuma
        [1, 3],  # Pazartesi, Çarşamba
        [4, 6],  # Perşembe, Cumartesi
        [0, 1],  # Pazar, Pazartesi
    ]
    
    # Doktor index'ine göre izin günlerini seç
    leave_days = leave_combinations[doctor_index % len(leave_combinations)]
    
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
    
    return leave_dates

def add_extra_doctors_if_needed():
    """Gerekirse ekstra doktorlar ekle"""
    emergency_doctors = Doctor.objects.filter(is_emergency_doctor=True, is_active=True)
    current_count = emergency_doctors.count()
    required_count = calculate_required_doctors()
    
    # Eğer yeterli doktor yoksa, mevcut doktorları da acil servis doktoru yap
    if current_count < required_count:
        needed = required_count - current_count
        print(f"⚠️  {needed} doktor daha gerekiyor...")
        # Acil servis doktoru olmayan doktorları bul
        non_emergency = Doctor.objects.filter(is_emergency_doctor=False, is_active=True)
        converted = 0
        for doctor in non_emergency[:needed]:
            doctor.is_emergency_doctor = True
            doctor.save()
            converted += 1
            print(f"  ✅ Mevcut doktor acil servis doktoru yapıldı: {doctor.user.get_full_name()}")
        
        # Tekrar say
        emergency_doctors = Doctor.objects.filter(is_emergency_doctor=True, is_active=True)
        current_count = emergency_doctors.count()
    
    if current_count >= required_count:
        print(f"✅ Yeterli doktor mevcut: {current_count}/{required_count}")
        return list(emergency_doctors)
    
    # Hala eksikse yeni doktorlar ekle
    needed = required_count - current_count
    print(f"⚠️  {needed} yeni doktor ekleniyor...")
    
    # Yeni doktorlar ekle
    new_doctors_data = [
        {
            'username': 'acil.dr.can.yilmaz',
            'email': 'can.yilmaz@acilservis.com',
            'first_name': 'Can',
            'last_name': 'Yılmaz',
            'phone': '0555 111 00 10',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.selin.kaya',
            'email': 'selin.kaya@acilservis.com',
            'first_name': 'Selin',
            'last_name': 'Kaya',
            'phone': '0555 111 00 11',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.berk.arslan',
            'email': 'berk.arslan@acilservis.com',
            'first_name': 'Berk',
            'last_name': 'Arslan',
            'phone': '0555 111 00 12',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.deniz.aydin',
            'email': 'deniz.aydin@acilservis.com',
            'first_name': 'Deniz',
            'last_name': 'Aydın',
            'phone': '0555 111 00 13',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.emre.koc',
            'email': 'emre.koc@acilservis.com',
            'first_name': 'Emre',
            'last_name': 'Koç',
            'phone': '0555 111 00 14',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.gizem.turk',
            'email': 'gizem.turk@acilservis.com',
            'first_name': 'Gizem',
            'last_name': 'Türk',
            'phone': '0555 111 00 15',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.oguz.yildirim',
            'email': 'oguz.yildirim@acilservis.com',
            'first_name': 'Oğuz',
            'last_name': 'Yıldırım',
            'phone': '0555 111 00 16',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.melisa.ay',
            'email': 'melisa.ay@acilservis.com',
            'first_name': 'Melisa',
            'last_name': 'Ay',
            'phone': '0555 111 00 17',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
    ]
    
    created_doctors = []
    added_count = 0
    for i, doc_data in enumerate(new_doctors_data):
        if added_count >= needed:
            break
            
        if CustomUser.objects.filter(username=doc_data['username']).exists():
            print(f"  ⚠️  Doktor zaten mevcut: {doc_data['first_name']} {doc_data['last_name']}")
            continue
        
        try:
            # Önce user'ı kontrol et
            user, user_created = CustomUser.objects.get_or_create(
                username=doc_data['username'],
                defaults={
                    'email': doc_data['email'],
                    'first_name': doc_data['first_name'],
                    'last_name': doc_data['last_name'],
                    'phone': doc_data['phone'],
                    'user_type': 3,
                    'is_active': True
                }
            )
            
            if user_created:
                user.set_password(doc_data['password'])
                user.save()
            
            # Doctor profilini kontrol et
            doctor, doctor_created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'department': None,
                    'title': doc_data['title'],
                    'is_active': True,
                    'is_emergency_doctor': True,
                    'working_hours': {},
                    'leave_dates': []
                }
            )
            
            if not doctor_created:
                # Zaten var ama acil servis doktoru olarak işaretle
                doctor.is_emergency_doctor = True
                doctor.save()
            
            if not doctor.working_hours:
                doctor.set_default_working_hours()
            
            if doctor_created or user_created:
                created_doctors.append(doctor)
                added_count += 1
                print(f"  ✅ Doktor eklendi/güncellendi: {doc_data['first_name']} {doc_data['last_name']}")
            else:
                print(f"  ⚠️  Doktor zaten mevcut: {doc_data['first_name']} {doc_data['last_name']}")
        except Exception as e:
            print(f"  ❌ Hata: {doc_data['first_name']} {doc_data['last_name']} - {str(e)}")
    
    # Tüm acil servis doktorlarını al
    return list(Doctor.objects.filter(is_emergency_doctor=True, is_active=True))

def setup_leave_schedule():
    """Tüm acil servis doktorlarına izin günlerini ayarla"""
    print("🚨 Acil Servis Doktorları İzin Planı Ayarlanıyor...\n")
    
    # Gerekirse ekstra doktorlar ekle
    all_doctors = add_extra_doctors_if_needed()
    
    # Doktorları ID'ye göre sırala
    sorted_doctors = sorted(all_doctors, key=lambda d: d.id)
    
    print(f"\n📋 {len(sorted_doctors)} doktor için izin planı oluşturuluyor...\n")
    
    updated_count = 0
    for idx, doctor in enumerate(sorted_doctors):
        try:
            # İzin günlerini oluştur
            leave_dates = generate_leave_dates_for_doctor(idx, len(sorted_doctors))
            
            # Doktorun izin günlerini güncelle
            doctor.leave_dates = leave_dates
            doctor.save()
            
            # İzin günlerini göster
            leave_days_of_week = []
            for date_str in leave_dates[:2]:  # İlk 2 günü göster
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                day_names = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
                leave_days_of_week.append(day_names[date_obj.weekday()])
            
            print(f"  ✅ {doctor.user.get_full_name() or doctor.user.username}: İzin günleri: {', '.join(leave_days_of_week)}")
            updated_count += 1
            
        except Exception as e:
            print(f"  ❌ Hata ({doctor.user.get_full_name() or doctor.user.username}): {str(e)}")
    
    print(f"\n📊 Özet:")
    print(f"  ✅ {updated_count} doktorun izin planı güncellendi")
    print(f"  📅 Her doktor haftada 2 gün izinli")
    print(f"  💡 İzin günleri dengeli bir şekilde dağıtıldı")
    print(f"\n🎉 İzin planı başarıyla oluşturuldu!")

if __name__ == '__main__':
    setup_leave_schedule()

