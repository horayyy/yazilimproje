# 🚀 Projeyi Başlatma Rehberi

## ⚡ Hızlı Başlangıç (İlk Kurulum)

### 1️⃣ Backend'i Başlatma

**Terminal 1 (Backend için):**

```powershell
# Proje kök dizinine gidin
cd "C:\Users\adige\Desktop\Yeni klasör"

# Backend klasörüne gidin
cd backend

# Virtual environment'ı aktif edin (root'taki venv'i kullanıyorsanız)
..\venv\Scripts\activate

# VEYA backend içinde yeni venv oluşturmak isterseniz:
# python -m venv venv
# venv\Scripts\activate

# Gerekli paketleri yükleyin (ilk kez çalıştırıyorsanız)
pip install -r requirements.txt

# Veritabanı migration'larını çalıştırın
python manage.py migrate

# Superuser oluşturun (opsiyonel - admin paneli için)
python manage.py createsuperuser

# Django sunucusunu başlatın
python manage.py runserver
```

**Not:** PowerShell'de `&&` çalışmaz! Komutları tek tek çalıştırın veya `;` kullanın:
```powershell
cd backend; ..\venv\Scripts\activate; python manage.py runserver
```

✅ Backend `http://127.0.0.1:8000` adresinde çalışacak!

---

### 2️⃣ Frontend'i Başlatma

**Terminal 2 (Frontend için - YENİ BİR TERMİNAL):**

```powershell
# Proje kök dizinine gidin
cd "C:\Users\adige\Desktop\Yeni klasör"

# Frontend klasörüne gidin
cd frontend

# Node modüllerini yükleyin (ilk kez çalıştırıyorsanız)
npm install

# Development sunucusunu başlatın
npm run dev
```

✅ Frontend `http://localhost:5173` adresinde çalışacak!

---

## 📝 Önemli Notlar

1. **İki terminal penceresi açık olmalı:**
   - Terminal 1: Backend (Django)
   - Terminal 2: Frontend (React)

2. **Backend önce başlatılmalı** çünkü frontend API'ye bağlanıyor.

3. **İlk kurulumda:**
   - Backend: `pip install -r requirements.txt` çalıştırın
   - Frontend: `npm install` çalıştırın

4. **Sonraki çalıştırmalarda:**
   - Sadece `python manage.py runserver` (backend)
   - Sadece `npm run dev` (frontend)

---

## 🔧 Sorun Giderme

### Backend çalışmıyorsa:
- Virtual environment aktif mi kontrol edin: `venv\Scripts\activate`
- Port 8000 kullanımda mı? Farklı port için: `python manage.py runserver 8001`

### Frontend çalışmıyorsa:
- `node_modules` klasörü var mı? Yoksa `npm install` çalıştırın
- Port 5173 kullanımda mı? Vite otomatik olarak başka port seçer

### API bağlantı hatası:
- Backend çalışıyor mu kontrol edin
- `frontend/src/api/axios.js` dosyasındaki `baseURL` doğru mu?

---

## 🎯 Test Etme

1. Backend API: Tarayıcıda `http://127.0.0.1:8000/api/` adresini açın
2. Swagger Dokümantasyon: `http://127.0.0.1:8000/swagger/`
3. Frontend: `http://localhost:5173`

---

## 🛑 Durdurma

- Her iki terminalde de `Ctrl + C` tuşlarına basın

---

## 📦 Başlangıç Verileri Ekleme

Sisteme örnek bölümler ve doktorlar eklemek için:

1. Backend klasörüne gidin:
```powershell
cd backend
```

2. Virtual environment'ı aktif edin:
```powershell
..\venv\Scripts\activate
```

3. Script'i çalıştırın:
```powershell
python add_initial_data.py
```

Bu script şunları ekler:
- **10 Bölüm**: Kardiyoloji, Nöroloji, Ortopedi, Dahiliye, Göğüs Hastalıkları, Üroloji, Kadın Doğum, Çocuk Sağlığı, Göz Hastalıkları, KBB
- **10 Doktor**: Her bölümden bir doktor

**Not**: Tüm doktorların şifresi: `doctor123`

