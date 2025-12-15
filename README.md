# Hastane Yönetim Sistemi

Bu proje, hastane yönetim sistemi için geliştirilmiş bir full-stack uygulamadır. Backend Django REST Framework ile, frontend ise React ile geliştirilmiştir.

## Proje Yapısı

```
.
├── backend/          # Django REST API
│   ├── core/         # Ana uygulama modülü
│   ├── hospital_project/  # Django proje ayarları
│   ├── manage.py     # Django yönetim scripti
│   ├── db.sqlite3    # Veritabanı
│   └── requirements.txt
│
└── frontend/         # React uygulaması
    ├── src/
    ├── package.json
    └── vite.config.js
```

## Kurulum

### Backend Kurulumu

1. Backend klasörüne gidin:
```bash
cd backend
```

2. Python virtual environment oluşturun (önerilir):
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

6. Django sunucusunu başlatın:
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

Frontend uygulaması `http://localhost:5173` adresinde çalışacaktır (Vite varsayılan portu).

## Özellikler

- **Kullanıcı Rolleri**: Yönetici, Sekreter, Doktor, Hasta
- **Randevu Yönetimi**: Randevu oluşturma, görüntüleme ve yönetimi
- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **RESTful API**: Django REST Framework ile geliştirilmiş API
- **Modern UI**: React ve Tailwind CSS ile geliştirilmiş arayüz

## API Endpoints

API dokümantasyonu için backend sunucusu çalışırken şu adresi ziyaret edin:
- Swagger UI: `http://127.0.0.1:8000/swagger/`
- ReDoc: `http://127.0.0.1:8000/redoc/`

## Teknolojiler

### Backend
- Django 5.2.8
- Django REST Framework
- JWT Authentication
- SQLite (geliştirme için)

### Frontend
- React 18
- Vite
- Tailwind CSS
- Axios
- React Router

## Notlar

- Bu proje geliştirme ortamı için yapılandırılmıştır.
- Production ortamı için güvenlik ayarlarını güncellemeyi unutmayın.
- `SECRET_KEY` ve `DEBUG` ayarlarını production'da değiştirin.

