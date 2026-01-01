# 🏥 Hastane Yönetim Sistemi

Modern ve kapsamlı bir hastane randevu ve yönetim sistemi. Backend Django REST Framework, frontend React ile geliştirilmiştir.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Kurulum](#-kurulum)
- [Kullanıcı Rolleri](#-kullanıcı-rolleri)
- [Teknolojiler](#-teknolojiler)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Test Hesapları](#-test-hesapları)

## ✨ Özellikler

### 🔐 Kimlik Doğrulama ve Yetkilendirme
- JWT (JSON Web Token) tabanlı güvenli kimlik doğrulama
- Rol tabanlı erişim kontrolü (RBAC)
- Şifre sıfırlama (email ile)
- Otomatik oturum yönetimi

### 👥 Kullanıcı Yönetimi
- 4 farklı kullanıcı rolü: Yönetici, Sekreter, Doktor, Hasta
- Her rol için özel dashboard ve yetkiler
- Kullanıcı profil yönetimi

### 📅 Randevu Yönetimi
- **Sekreter Paneli**:
  - 3 adımlı randevu oluşturma (Hasta Bilgileri → İletişim → Randevu Detayları)
  - Otomatik doktor müsaitlik kontrolü
  - Hafta sonu randevu engelleme
  - Randevu filtreleme ve arama (tarih, doktor, durum)
  - Tablo ve takvim görünümü
  - Excel ve PDF export
  - Yaklaşan randevular widget'ı
  - Randevu detay görüntüleme

- **Doktor Paneli**:
  - Kendi randevularını görüntüleme
  - Randevu durumu güncelleme (Beklemede → Tamamlandı)
  - SMS gönderme (hastaya)
  - Randevu notları ekleme (şikayet, teşhis, reçete, öneriler)
  - Muayene raporu oluşturma ve görüntüleme
  - Hastalarım listesi (randevu geçmişi ile)

- **Yönetici Paneli**:
  - Tüm randevuları görüntüleme
  - Randevu istatistikleri
  - Excel ve PDF export

### 🏥 Bölüm ve Doktor Yönetimi
- Bölüm ekleme, düzenleme ve silme
- Bölüm bazlı randevu ücreti belirleme
- Doktor ekleme ve düzenleme
- Doktor çalışma saatleri yönetimi
- Doktor izin günleri yönetimi (aylık takvim)
- Poliklinik ve Acil Servis doktor ayrımı

### 🚨 Acil Servis Yönetimi
- Acil servis durumu yönetimi (Açık/Kapalı/Yoğun)
- 7/24 hizmet ayarı
- Acil servis doktor vardiya programı
- Vardiya bazlı randevu yönetimi

### 📝 İzin Yönetimi
- Doktor izin talepleri
- Yönetici onay/red sistemi
- İzin günleri takvimi

### 📧 Bildirimler
- Randevu onay email'i (randevu oluşturulduğunda)
- Randevu hatırlatma email'i (24 saat önce)
- Şifre sıfırlama email'i
- Email ile randevu iptal (güvenli token ile)

### 📊 Raporlama ve Export
- Excel export (filtrelenmiş randevular)
- PDF export (filtrelenmiş randevular)
- Randevu istatistikleri
- Dashboard widget'ları

### 🎨 Kullanıcı Arayüzü
- Modern ve responsive tasarım (Tailwind CSS)
- Tablo ve takvim görünümü
- Mobil uyumlu
- Kullanıcı dostu arayüz
- Gerçek zamanlı güncellemeler

## 🚀 Kurulum

### Gereksinimler
- Python 3.8+
- Node.js 16+
- npm veya yarn

### Backend Kurulumu

1. Backend klasörüne gidin:
```bash
cd backend
```

2. Python virtual environment oluşturun:
```bash
python -m venv venv
```

3. Virtual environment'ı aktif edin:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

5. Veritabanı migration'larını çalıştırın:
```bash
python manage.py migrate
```

6. (Opsiyonel) Başlangıç verilerini ekleyin:
```bash
python manage.py add_initial_data
```

7. Django sunucusunu başlatın:
```bash
python manage.py runserver
```

Backend API `http://127.0.0.1:8000` adresinde çalışacaktır.

### Frontend Kurulumu

1. Frontend klasörüne gidin:
```bash
cd frontend
```

2. Node modüllerini yükleyin:
```bash
npm install
```

3. Development sunucusunu başlatın:
```bash
npm run dev
```

Frontend uygulaması `http://localhost:5173` adresinde çalışacaktır.

## 👤 Kullanıcı Rolleri

### 1. Yönetici (Admin)
- Tüm randevuları görüntüleme ve yönetme
- Bölüm ekleme, düzenleme ve silme
- Doktor ekleme, düzenleme ve silme
- Doktor çalışma saatleri ve izin günleri yönetimi
- Acil servis durumu yönetimi
- Doktor izin taleplerini onaylama/reddetme
- Sistem istatistikleri

### 2. Sekreter
- Hastalar için randevu oluşturma
- Tüm randevuları görüntüleme
- Randevu filtreleme ve arama
- Excel ve PDF export
- Yaklaşan randevuları görüntüleme

### 3. Doktor
- Kendi randevularını görüntüleme
- Randevu durumu güncelleme
- Hastalara SMS gönderme
- Randevu notları ekleme
- Muayene raporu oluşturma
- Çalışma saatlerini yönetme
- İzin talebi oluşturma
- Hastalarım listesi

### 4. Hasta
- Randevu oluşturma (public endpoint)
- Email ile randevu iptal
- Randevu onay ve hatırlatma email'leri alma

## 🛠 Teknolojiler

### Backend
- **Django 5.2.8** - Web framework
- **Django REST Framework 3.16.1** - RESTful API
- **djangorestframework-simplejwt 5.5.1** - JWT Authentication
- **drf-yasg 1.21.11** - API dokümantasyonu (Swagger/ReDoc)
- **django-cors-headers 4.9.0** - CORS yönetimi
- **SQLite** - Veritabanı (geliştirme için)

### Frontend
- **React 18.3.1** - UI library
- **Vite 6.0.7** - Build tool
- **React Router DOM 7.9.6** - Navigation
- **Axios 1.13.2** - API requests
- **JWT Decode 4.0.0** - Token decoding
- **Tailwind CSS 3.4.17** - Styling
- **React Calendar 5.0.0** - Takvim bileşeni
- **jsPDF 3.0.4** - PDF oluşturma
- **xlsx 0.18.5** - Excel export

## 📚 API Dokümantasyonu

Backend sunucusu çalışırken API dokümantasyonuna erişebilirsiniz:

- **Swagger UI**: `http://127.0.0.1:8000/swagger/`
- **ReDoc**: `http://127.0.0.1:8000/redoc/`

## 🔑 Test Hesapları

### Yönetici
- **Kullanıcı Adı**: `admin`
- **Email**: `admin@hospital.com`
- **Şifre**: (Django admin şifresi - `python manage.py createsuperuser` ile oluşturulabilir)

### Sekreter
- **Kullanıcı Adı**: `sekreter`
- **Email**: `sekreter@hospital.com`
- **Şifre**: `sekreter123`

### Doktor (Poliklinik)
- **Kullanıcı Adı**: `dr.ahmet.yilmaz`
- **Email**: `ahmet.yilmaz@hastane.com`
- **Şifre**: `doctor123`

### Doktor (Acil Servis)
- **Kullanıcı Adı**: `acil.dr.ahmet.yilmaz`
- **Email**: `ahmet.yilmaz@acilservis.com`
- **Şifre**: `acil123`

> **Not**: `python manage.py add_initial_data` komutu ile örnek doktorlar ve bölümler eklenebilir.

## 📁 Proje Yapısı

```
.
├── backend/                    # Django REST API
│   ├── core/                  # Ana uygulama modülü
│   │   ├── models.py          # Veritabanı modelleri
│   │   ├── views.py           # API view'ları
│   │   ├── serializers.py     # API serializer'ları
│   │   ├── urls.py            # URL routing
│   │   ├── utils.py           # Yardımcı fonksiyonlar
│   │   └── management/        # Django management komutları
│   ├── hospital_project/      # Django proje ayarları
│   ├── manage.py              # Django yönetim scripti
│   ├── db.sqlite3             # Veritabanı
│   └── requirements.txt       # Python bağımlılıkları
│
└── frontend/                  # React uygulaması
    ├── src/
    │   ├── pages/             # Sayfa bileşenleri
    │   ├── components/        # Yeniden kullanılabilir bileşenler
    │   ├── context/           # React context'leri
    │   ├── api/               # API istemci yapılandırması
    │   └── App.jsx            # Ana uygulama bileşeni
    ├── package.json           # Node.js bağımlılıkları
    └── vite.config.js         # Vite yapılandırması
```

## ⚠️ Önemli Notlar

- Bu proje **geliştirme ortamı** için yapılandırılmıştır.
- Production ortamı için:
  - `SECRET_KEY` değiştirilmeli
  - `DEBUG = False` yapılmalı
  - `CORS_ALLOW_ALL_ORIGINS = False` yapılmalı
  - Veritabanı olarak PostgreSQL veya MySQL kullanılmalı
  - Email ayarları (SMTP) yapılandırılmalı
  - SMS servisi entegre edilmeli (şu anda log olarak kaydediliyor)

## 📝 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

## 👨‍💻 Geliştirici

Proje hakkında sorularınız için issue açabilirsiniz.

