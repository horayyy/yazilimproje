#!/usr/bin/env python
"""
Script to create secretary user
Usage: python create_secretary.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import CustomUser

def create_secretary():
    """Create secretary user"""
    
    username = 'sekreter'
    email = 'sekreter@hospital.com'
    password = 'sekreter123'
    first_name = 'Sekreter'
    last_name = 'Kullanıcı'
    phone = '0555 000 00 00'
    
    # Check if user already exists
    if CustomUser.objects.filter(username=username).exists():
        print(f"⚠️  Sekreter kullanıcısı zaten mevcut: {username}")
        print(f"   Şifre: {password}")
        return
    
    # Create secretary user
    user = CustomUser.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        user_type=2,  # Secretary
        is_active=True,
        is_staff=True
    )
    
    print("=" * 60)
    print("✅ Sekreter kullanıcısı başarıyla oluşturuldu!")
    print("=" * 60)
    print(f"\n📋 Giriş Bilgileri:")
    print(f"   Kullanıcı Adı: {username}")
    print(f"   Şifre: {password}")
    print(f"   Email: {email}")
    print(f"   Rol: Sekreter")
    print("\n⚠️  Not: Production ortamında şifreyi değiştirmeyi unutmayın!")

if __name__ == '__main__':
    create_secretary()

