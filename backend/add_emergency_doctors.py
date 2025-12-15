#!/usr/bin/env python
"""
Script to add emergency service doctors to the database
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import CustomUser, Doctor, Department

def create_emergency_doctors():
    """Create emergency service doctors"""
    
    # Acil servis doktorları için 9 doktor ekleyelim (her vardiya için 3 doktor)
    emergency_doctors_data = [
        {
            'username': 'sistemleriniacil.dr.ahmet.yilmaz',
            'email': 'ahmet.yilmaz@acilservis.com',
            'first_name': 'Ahmet',
            'last_name': 'Yılmaz',
            'phone': '0555 111 00 01',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.ayse.demir',
            'email': 'ayse.demir@acilservis.com',
            'first_name': 'Ayşe',
            'last_name': 'Demir',
            'phone': '0555 111 00 02',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.mehmet.kaya',
            'email': 'mehmet.kaya@acilservis.com',
            'first_name': 'Mehmet',
            'last_name': 'Kaya',
            'phone': '0555 111 00 03',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.fatma.oz',
            'email': 'fatma.oz@acilservis.com',
            'first_name': 'Fatma',
            'last_name': 'Öz',
            'phone': '0555 111 00 04',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.mustafa.celik',
            'email': 'mustafa.celik@acilservis.com',
            'first_name': 'Mustafa',
            'last_name': 'Çelik',
            'phone': '0555 111 00 05',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.zeynep.arslan',
            'email': 'zeynep.arslan@acilservis.com',
            'first_name': 'Zeynep',
            'last_name': 'Arslan',
            'phone': '0555 111 00 06',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.ali.sahin',
            'email': 'ali.sahin@acilservis.com',
            'first_name': 'Ali',
            'last_name': 'Şahin',
            'phone': '0555 111 00 07',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.elif.yildiz',
            'email': 'elif.yildiz@acilservis.com',
            'first_name': 'Elif',
            'last_name': 'Yıldız',
            'phone': '0555 111 00 08',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
        {
            'username': 'acil.dr.burak.aksoy',
            'email': 'burak.aksoy@acilservis.com',
            'first_name': 'Burak',
            'last_name': 'Aksoy',
            'phone': '0555 111 00 09',
            'password': 'acil123',
            'title': 'Uzm. Dr.'
        },
    ]
    
    created_count = 0
    skipped_count = 0
    
    print("🚨 Acil Servis Doktorları Ekleniyor...\n")
    
    for doc_data in emergency_doctors_data:
        # Check if user already exists
        if CustomUser.objects.filter(username=doc_data['username']).exists():
            print(f"  ⚠️  Doktor zaten mevcut: {doc_data['first_name']} {doc_data['last_name']}")
            skipped_count += 1
            continue
        
        try:
            # Create user
            user = CustomUser.objects.create_user(
                username=doc_data['username'],
                email=doc_data['email'],
                password=doc_data['password'],
                first_name=doc_data['first_name'],
                last_name=doc_data['last_name'],
                phone=doc_data['phone'],
                user_type=3,  # Doctor
                is_active=True
            )
            
            # Create doctor profile with is_emergency_doctor=True
            doctor, created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'department': None,  # Acil servis doktorları bölüme bağlı değil
                    'title': doc_data['title'],
                    'is_active': True,
                    'is_emergency_doctor': True,  # Acil servis doktoru
                    'working_hours': {},
                    'leave_dates': []
                }
            )
            
            if not created:
                # Update if already exists
                doctor.is_emergency_doctor = True
                doctor.title = doc_data['title']
                doctor.save()
            
            # Set default working hours if not set
            if not doctor.working_hours:
                doctor.set_default_working_hours()
            
            print(f"  ✅ Doktor eklendi: {doc_data['first_name']} {doc_data['last_name']} ({doc_data['username']})")
            created_count += 1
            
        except Exception as e:
            print(f"  ❌ Hata: {doc_data['first_name']} {doc_data['last_name']} - {str(e)}")
    
    print(f"\n📊 Özet:")
    print(f"  ✅ {created_count} doktor eklendi")
    print(f"  ⚠️  {skipped_count} doktor zaten mevcuttu")
    print(f"\n🎉 Acil servis doktorları başarıyla eklendi!")
    print(f"💡 Tüm doktorların şifresi: acil123")

if __name__ == '__main__':
    create_emergency_doctors()

