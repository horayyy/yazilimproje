import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import Doctor, CustomUser

def list_doctors():
    print("=" * 60)
    print("MEVCUT DOKTORLAR")
    print("=" * 60)
    
    doctors = Doctor.objects.filter(is_active=True).select_related('user')
    
    if not doctors.exists():
        print("❌ Aktif doktor bulunamadı.")
        return
    
    for i, doctor in enumerate(doctors, 1):
        user = doctor.user
        print(f"\n{i}. Doktor Bilgileri:")
        print(f"   ID: {doctor.id}")
        print(f"   Kullanıcı Adı: {user.username}")
        print(f"   Şifre: (şifreler hash'lenmiş, gösterilemez)")
        print(f"   Ad Soyad: {user.get_full_name()}")
        print(f"   E-posta: {user.email}")
        print(f"   Bölüm: {doctor.department.name if doctor.department else 'Belirtilmemiş'}")
        print(f"   Unvan: {doctor.title or 'Belirtilmemiş'}")
        print(f"   Acil Servis Doktoru: {'Evet' if doctor.is_emergency_doctor else 'Hayır'}")
        print("-" * 60)
    
    print(f"\n✅ Toplam {doctors.count()} aktif doktor bulundu.")
    print("\n💡 Not: Şifreler güvenlik nedeniyle hash'lenmiştir.")
    print("   Yeni bir doktor oluşturmak için admin panelini kullanabilirsiniz.")
    print("   Veya şifreyi sıfırlamak için Django shell kullanabilirsiniz:")

if __name__ == '__main__':
    list_doctors()



