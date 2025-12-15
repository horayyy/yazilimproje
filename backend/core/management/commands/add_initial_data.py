"""
Django management command to add initial departments and doctors.
Usage: python manage.py add_initial_data
"""

from django.core.management.base import BaseCommand
from core.models import CustomUser, Department, Doctor


class Command(BaseCommand):
    help = 'Add initial departments and doctors to the database'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("🏥 Hastane Sistemi - Başlangıç Verileri Ekleme"))
        self.stdout.write("=" * 60)
        self.stdout.write("")

        # Create departments
        self.stdout.write("📋 Bölümler ekleniyor...")
        dept_count = self.create_departments()
        self.stdout.write(self.style.SUCCESS(f"\n✅ {dept_count} yeni bölüm eklendi.\n"))

        # Create doctors
        self.stdout.write("👨‍⚕️ Doktorlar ekleniyor...")
        doc_count = self.create_doctors()
        self.stdout.write(self.style.SUCCESS(f"\n✅ {doc_count} yeni doktor eklendi.\n"))

        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("✨ İşlem tamamlandı!"))
        self.stdout.write("=" * 60)
        self.stdout.write("\n📝 Not: Tüm doktorların şifresi: 'doctor123'")
        self.stdout.write("   (Güvenlik için production'da değiştirmeyi unutmayın!)")

    def create_departments(self):
        """Create initial departments"""
        departments_data = [
            {'name': 'Kardiyoloji', 'description': 'Kalp ve dolaşım sistemi hastalıkları'},
            {'name': 'Nöroloji', 'description': 'Sinir sistemi hastalıkları'},
            {'name': 'Ortopedi', 'description': 'Kemik, eklem ve kas hastalıkları'},
            {'name': 'Dahiliye', 'description': 'İç hastalıkları'},
            {'name': 'Göğüs Hastalıkları', 'description': 'Solunum sistemi hastalıkları'},
            {'name': 'Üroloji', 'description': 'İdrar yolları ve erkek üreme sistemi hastalıkları'},
            {'name': 'Kadın Doğum', 'description': 'Kadın hastalıkları ve doğum'},
            {'name': 'Çocuk Sağlığı', 'description': 'Çocuk hastalıkları'},
            {'name': 'Göz Hastalıkları', 'description': 'Göz ve görme bozuklukları'},
            {'name': 'Kulak Burun Boğaz', 'description': 'KBB hastalıkları'},
        ]
        
        created_count = 0
        for dept_data in departments_data:
            dept, created = Department.objects.get_or_create(
                name=dept_data['name'],
                defaults={'description': dept_data['description']}
            )
            if created:
                created_count += 1
                self.stdout.write(f"  ✅ Bölüm eklendi: {dept.name}")
            else:
                self.stdout.write(f"  ℹ️  Bölüm zaten mevcut: {dept.name}")
        
        return created_count

    def create_doctors(self):
        """Create initial doctors"""
        doctors_data = [
            {
                'username': 'dr.ahmet.yilmaz',
                'email': 'ahmet.yilmaz@hastane.com',
                'first_name': 'Ahmet',
                'last_name': 'Yılmaz',
                'phone': '0555 111 22 33',
                'password': 'doctor123',
                'department_name': 'Kardiyoloji',
                'title': 'Prof. Dr.'
            },
            {
                'username': 'dr.ayse.demir',
                'email': 'ayse.demir@hastane.com',
                'first_name': 'Ayşe',
                'last_name': 'Demir',
                'phone': '0555 222 33 44',
                'password': 'doctor123',
                'department_name': 'Nöroloji',
                'title': 'Doç. Dr.'
            },
            {
                'username': 'dr.mehmet.kaya',
                'email': 'mehmet.kaya@hastane.com',
                'first_name': 'Mehmet',
                'last_name': 'Kaya',
                'phone': '0555 333 44 55',
                'password': 'doctor123',
                'department_name': 'Ortopedi',
                'title': 'Dr.'
            },
            {
                'username': 'dr.fatma.ozturk',
                'email': 'fatma.ozturk@hastane.com',
                'first_name': 'Fatma',
                'last_name': 'Öztürk',
                'phone': '0555 444 55 66',
                'password': 'doctor123',
                'department_name': 'Dahiliye',
                'title': 'Uzm. Dr.'
            },
            {
                'username': 'dr.ali.celik',
                'email': 'ali.celik@hastane.com',
                'first_name': 'Ali',
                'last_name': 'Çelik',
                'phone': '0555 555 66 77',
                'password': 'doctor123',
                'department_name': 'Göğüs Hastalıkları',
                'title': 'Dr.'
            },
            {
                'username': 'dr.zeynep.arslan',
                'email': 'zeynep.arslan@hastane.com',
                'first_name': 'Zeynep',
                'last_name': 'Arslan',
                'phone': '0555 666 77 88',
                'password': 'doctor123',
                'department_name': 'Üroloji',
                'title': 'Prof. Dr.'
            },
            {
                'username': 'dr.mustafa.sahin',
                'email': 'mustafa.sahin@hastane.com',
                'first_name': 'Mustafa',
                'last_name': 'Şahin',
                'phone': '0555 777 88 99',
                'password': 'doctor123',
                'department_name': 'Kadın Doğum',
                'title': 'Doç. Dr.'
            },
            {
                'username': 'dr.elif.yildiz',
                'email': 'elif.yildiz@hastane.com',
                'first_name': 'Elif',
                'last_name': 'Yıldız',
                'phone': '0555 888 99 00',
                'password': 'doctor123',
                'department_name': 'Çocuk Sağlığı',
                'title': 'Uzm. Dr.'
            },
            {
                'username': 'dr.burak.aksoy',
                'email': 'burak.aksoy@hastane.com',
                'first_name': 'Burak',
                'last_name': 'Aksoy',
                'phone': '0555 999 00 11',
                'password': 'doctor123',
                'department_name': 'Göz Hastalıkları',
                'title': 'Dr.'
            },
            {
                'username': 'dr.selin.avci',
                'email': 'selin.avci@hastane.com',
                'first_name': 'Selin',
                'last_name': 'Avcı',
                'phone': '0555 000 11 22',
                'password': 'doctor123',
                'department_name': 'Kulak Burun Boğaz',
                'title': 'Uzm. Dr.'
            },
        ]
        
        created_count = 0
        for doc_data in doctors_data:
            # Check if user already exists
            if CustomUser.objects.filter(username=doc_data['username']).exists():
                self.stdout.write(f"  ℹ️  Doktor zaten mevcut: {doc_data['first_name']} {doc_data['last_name']}")
                continue
            
            # Get department
            try:
                department = Department.objects.get(name=doc_data['department_name'])
            except Department.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"  ❌ Bölüm bulunamadı: {doc_data['department_name']}"))
                continue
            
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
            
            # Create doctor profile
            doctor, created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    'department': department,
                    'title': doc_data['title'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"  ✅ Doktor eklendi: {doc_data['title']} {doc_data['first_name']} {doc_data['last_name']} - {doc_data['department_name']}")
            else:
                self.stdout.write(f"  ℹ️  Doktor profili zaten mevcut: {doc_data['first_name']} {doc_data['last_name']}")
        
        return created_count

