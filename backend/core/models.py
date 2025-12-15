from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
import json


class CustomUser(AbstractUser):
    """Rol tabanlı kullanıcı modeli"""
    
    USER_TYPE_CHOICES = [
        (1, 'Yönetici'),
        (2, 'Sekreter'),
        (3, 'Doktor'),
        (4, 'Hasta'),
    ]
    
    user_type = models.IntegerField(choices=USER_TYPE_CHOICES, default=4, verbose_name='Kullanıcı Tipi')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Telefon')
    national_id = models.CharField(max_length=20, blank=True, null=True, unique=True, verbose_name='Kimlik No')
    
    class Meta:
        verbose_name = 'Kullanıcı'
        verbose_name_plural = 'Kullanıcılar'
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"


class Department(models.Model):
    """Hastane bölümü modeli"""
    
    name = models.CharField(max_length=100, verbose_name='Bölüm Adı')
    description = models.TextField(blank=True, null=True, verbose_name='Açıklama')
    appointment_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=500.00, 
        verbose_name='Randevu Ücreti (TL)',
        help_text='Bu bölüm için randevu ücreti'
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Bölüm'
        verbose_name_plural = 'Bölümler'
    
    def __str__(self):
        return self.name


class Doctor(models.Model):
    """Doktor profili modeli"""
    
    WEEKDAYS = [
        (0, 'Pazartesi'),
        (1, 'Salı'),
        (2, 'Çarşamba'),
        (3, 'Perşembe'),
        (4, 'Cuma'),
        (5, 'Cumartesi'),
        (6, 'Pazar'),
    ]
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 3},
        related_name='doctor_profile',
        verbose_name='Kullanıcı'
    )
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Bölüm')
    title = models.CharField(max_length=100, blank=True, null=True, verbose_name='Unvan')
    is_active = models.BooleanField(default=True, verbose_name='Aktif')
    is_emergency_doctor = models.BooleanField(default=False, verbose_name='Acil Servis Doktoru', help_text='Bu doktor acil serviste çalışıyorsa işaretleyin')
    
    # Çalışma saatleri (JSON formatında: {"0": {"start": "09:00", "end": "17:00", "enabled": true}, ...})
    # 0=Pazartesi, 1=Salı, ..., 6=Pazar
    working_hours = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Çalışma Saatleri',
        help_text='Haftalık çalışma saatleri (JSON formatında)'
    )
    
    # İzin günleri (tarih listesi, JSON formatında: ["2024-12-25", "2024-12-31"])
    leave_dates = models.JSONField(
        default=list,
        blank=True,
        verbose_name='İzin Günleri',
        help_text='İzinli olunan tarihler (JSON formatında)'
    )
    
    class Meta:
        ordering = ['user__last_name', 'user__first_name']
        verbose_name = 'Doktor'
        verbose_name_plural = 'Doktorlar'
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username}"
    
    def set_default_working_hours(self):
        """Varsayılan çalışma saatlerini ayarla: Pazartesi-Cuma 08:00-17:00 (Hafta sonu kapalı)"""
        if not self.working_hours:
            self.working_hours = {
                '0': {'start': '08:00', 'end': '17:00', 'enabled': True},  # Pazartesi
                '1': {'start': '08:00', 'end': '17:00', 'enabled': True},  # Salı
                '2': {'start': '08:00', 'end': '17:00', 'enabled': True},  # Çarşamba
                '3': {'start': '08:00', 'end': '17:00', 'enabled': True},  # Perşembe
                '4': {'start': '08:00', 'end': '17:00', 'enabled': True},  # Cuma
                '5': {'start': '08:00', 'end': '17:00', 'enabled': False},  # Cumartesi - Kapalı
                '6': {'start': '08:00', 'end': '17:00', 'enabled': False},  # Pazar - Kapalı
            }
            self.save(update_fields=['working_hours'])
    
    def get_working_hours_for_day(self, weekday):
        """Belirli bir gün için çalışma saatlerini döndürür (0=Pazartesi, 6=Pazar)"""
        if not self.working_hours:
            return None
        day_data = self.working_hours.get(str(weekday), {})
        if day_data.get('enabled', False):
            return {
                'start': day_data.get('start', '09:00'),
                'end': day_data.get('end', '17:00'),
            }
        return None
    
    def is_available_on_date(self, date):
        """Belirli bir tarihte doktor müsait mi kontrol eder"""
        from datetime import datetime
        
        # Hafta sonu kontrolü - hafta sonu çalışılmaz
        weekday = date.weekday()
        if weekday >= 5:  # Cumartesi (5) veya Pazar (6)
            return False
        
        # İzin günlerinde mi kontrol et
        date_str = date.strftime('%Y-%m-%d')
        if self.leave_dates and date_str in self.leave_dates:
            return False
        
        # Haftanın günü (0=Pazartesi, 4=Cuma)
        working_hours = self.get_working_hours_for_day(weekday)
        
        return working_hours is not None
    
    def get_available_time_slots(self, date, appointment_duration_minutes=30):
        """Belirli bir tarih için müsait saatleri döndürür"""
        from datetime import datetime, timedelta
        
        if not self.is_available_on_date(date):
            return []
        
        weekday = date.weekday()
        working_hours = self.get_working_hours_for_day(weekday)
        if not working_hours:
            return []
        
        # Çalışma saatlerini parse et
        start_time = datetime.strptime(working_hours['start'], '%H:%M').time()
        end_time = datetime.strptime(working_hours['end'], '%H:%M').time()
        
        # Mevcut randevuları al
        existing_appointments = self.appointments.filter(
            date=date,
            status='completed'
        ).values_list('time', flat=True)
        
        # Müsait saatleri oluştur
        available_slots = []
        current = datetime.combine(date, start_time)
        end = datetime.combine(date, end_time)
        
        while current < end:
            time_slot = current.time()
            # Bu saatte randevu var mı kontrol et
            if time_slot not in existing_appointments:
                available_slots.append(time_slot.strftime('%H:%M'))
            current += timedelta(minutes=appointment_duration_minutes)
        
        return available_slots
    
    @staticmethod
    def check_department_availability(department, date):
        """Belirli bir tarihte bölümde müsait doktor var mı kontrol et"""
        from datetime import datetime
        
        if not department:
            return False
        
        # O bölümdeki aktif doktorları al
        doctors = Doctor.objects.filter(
            department=department,
            is_active=True
        )
        
        for doctor in doctors:
            if doctor.is_available_on_date(date):
                return True
        
        return False
    
    @staticmethod
    def get_available_doctors_for_date(department, date):
        """Belirli bir tarihte bölümde müsait doktorları döndür"""
        if not department:
            return Doctor.objects.none()
        
        doctors = Doctor.objects.filter(
            department=department,
            is_active=True
        )
        
        available = []
        for doctor in doctors:
            if doctor.is_available_on_date(date):
                available.append(doctor)
        
        return available


class Appointment(models.Model):
    """Hasta randevu modeli"""
    
    STATUS_CHOICES = [
        ('completed', 'Tamamlandı'),
        ('cancelled', 'İptal Edildi'),
    ]
    
    patient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 4},
        related_name='appointments',
        verbose_name='Hasta'
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments', verbose_name='Doktor')
    date = models.DateField(verbose_name='Tarih')
    time = models.TimeField(verbose_name='Saat')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed', verbose_name='Durum')
    notes = models.TextField(blank=True, null=True, verbose_name='Notlar')
    
    # Detaylı muayene notları
    patient_complaints = models.TextField(blank=True, null=True, verbose_name='Hasta Şikayetleri', help_text='Hastanın belirttiği şikayetler')
    diagnosis = models.TextField(blank=True, null=True, verbose_name='Teşhis', help_text='Doktorun koyduğu teşhis')
    prescription = models.TextField(blank=True, null=True, verbose_name='Reçete', help_text='Verilen ilaçlar ve dozajları')
    recommendations = models.TextField(blank=True, null=True, verbose_name='Öneriler', help_text='Doktorun önerileri ve tavsiyeleri')
    
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00, verbose_name='Randevu Ücreti (TL)')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, verbose_name='Oluşturulma Tarihi')
    cancel_token = models.CharField(max_length=64, blank=True, null=True, verbose_name='İptal Token', help_text='Email ile iptal için güvenli token')
    
    class Meta:
        ordering = ['date', 'time']
        unique_together = [['doctor', 'date', 'time']]
        verbose_name = 'Randevu'
        verbose_name_plural = 'Randevular'
    
    def clean(self):
        """Randevu validasyonu - çalışma saatleri ve izin günleri kontrolü"""
        if self.doctor and self.date and self.time:
            # Hafta sonu kontrolü - hafta sonu randevu alınamaz
            weekday = self.date.weekday()
            if weekday >= 5:  # Cumartesi (5) veya Pazar (6)
                raise ValidationError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.')
            
            # Doktor bu tarihte müsait mi?
            if not self.doctor.is_available_on_date(self.date):
                raise ValidationError('Doktor bu tarihte çalışmıyor veya izinli.')
            
            # Randevu saati çalışma saatleri içinde mi?
            working_hours = self.doctor.get_working_hours_for_day(weekday)
            
            if working_hours:
                from datetime import datetime
                appointment_time = datetime.strptime(str(self.time), '%H:%M:%S').time()
                start_time = datetime.strptime(working_hours['start'], '%H:%M').time()
                end_time = datetime.strptime(working_hours['end'], '%H:%M').time()
                
                if not (start_time <= appointment_time < end_time):
                    raise ValidationError(f'Randevu saati çalışma saatleri dışında. Çalışma saatleri: {working_hours["start"]} - {working_hours["end"]}')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.patient.username} - Dr. {self.doctor.user.get_full_name() or self.doctor.user.username} - {self.date} {self.time}"


class EmergencyService(models.Model):
    """Acil Servis modeli - 7/24 açık"""
    
    STATUS_CHOICES = [
        ('open', 'Açık'),
        ('closed', 'Kapalı'),
    ]
    
    is_active = models.BooleanField(default=True, verbose_name='Aktif')
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='open',
        verbose_name='Durum'
    )
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Telefon')
    address = models.TextField(blank=True, null=True, verbose_name='Adres')
    notes = models.TextField(blank=True, null=True, verbose_name='Notlar/Açıklamalar')
    
    # 7/24 çalışma saatleri (her zaman açık)
    is_24_7 = models.BooleanField(default=True, verbose_name='7/24 Açık')
    
    class Meta:
        verbose_name = 'Acil Servis'
        verbose_name_plural = 'Acil Servis'
    
    def __str__(self):
        status_text = "Açık" if self.is_active and self.status == 'open' else "Kapalı"
        return f"Acil Servis - {status_text}"
    
    def save(self, *args, **kwargs):
        # Acil servis her zaman 7/24 açık olmalı
        if self.is_active:
            self.is_24_7 = True
        super().save(*args, **kwargs)


class LeaveRequest(models.Model):
    """Doktor izin talep modeli"""
    
    STATUS_CHOICES = [
        ('pending', 'Beklemede'),
        ('approved', 'Onaylandı'),
        ('rejected', 'Reddedildi'),
    ]
    
    doctor = models.ForeignKey(
        Doctor,
        on_delete=models.CASCADE,
        related_name='leave_requests',
        verbose_name='Doktor'
    )
    requested_date = models.DateField(verbose_name='İstenen Tarih')
    reason = models.TextField(blank=True, null=True, verbose_name='İzin Nedeni')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Durum'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    reviewed_at = models.DateTimeField(blank=True, null=True, verbose_name='İncelenme Tarihi')
    reviewed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'user_type': 1},  # Sadece adminler
        related_name='reviewed_leave_requests',
        verbose_name='İnceleyen'
    )
    admin_notes = models.TextField(blank=True, null=True, verbose_name='Admin Notları')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'İzin Talebi'
        verbose_name_plural = 'İzin Talepleri'
    
    def __str__(self):
        return f"{self.doctor.user.get_full_name() or self.doctor.user.username} - {self.requested_date} ({self.get_status_display()})"
    
    def approve(self, reviewed_by, admin_notes=None):
        """İzni onayla ve doktorun leave_dates listesine ekle"""
        from datetime import datetime
        
        self.status = 'approved'
        self.reviewed_at = datetime.now()
        self.reviewed_by = reviewed_by
        if admin_notes:
            self.admin_notes = admin_notes
        self.save()
        
        # Doktorun leave_dates listesine ekle
        date_str = self.requested_date.strftime('%Y-%m-%d')
        if not self.doctor.leave_dates:
            self.doctor.leave_dates = []
        if date_str not in self.doctor.leave_dates:
            self.doctor.leave_dates.append(date_str)
            self.doctor.save(update_fields=['leave_dates'])
    
    def reject(self, reviewed_by, admin_notes=None):
        """İzni reddet"""
        from datetime import datetime
        
        self.status = 'rejected'
        self.reviewed_at = datetime.now()
        self.reviewed_by = reviewed_by
        if admin_notes:
            self.admin_notes = admin_notes
        self.save()


class SMSMessage(models.Model):
    """Doktor tarafından gönderilen SMS mesajları"""
    
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='sms_messages', verbose_name='Randevu', null=True, blank=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='sent_sms', verbose_name='Doktor')
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_sms', verbose_name='Hasta')
    message = models.TextField(verbose_name='Mesaj')
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name='Gönderilme Tarihi')
    
    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'SMS Mesajı'
        verbose_name_plural = 'SMS Mesajları'
    
    def __str__(self):
        return f"SMS - {self.patient.username} - {self.sent_at.strftime('%Y-%m-%d %H:%M')}"


class MedicalReport(models.Model):
    """Muayene raporu modeli"""
    
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='medical_report',
        verbose_name='Randevu'
    )
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='medical_reports', verbose_name='Doktor')
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='medical_reports', verbose_name='Hasta')
    
    # Rapor içeriği (JSON formatında saklanabilir veya TextField)
    report_content = models.TextField(blank=True, null=True, verbose_name='Rapor İçeriği')
    
    # PDF dosyası (opsiyonel - dosya yolu veya base64)
    pdf_file = models.FileField(upload_to='medical_reports/', blank=True, null=True, verbose_name='PDF Rapor')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Güncellenme Tarihi')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Muayene Raporu'
        verbose_name_plural = 'Muayene Raporları'
    
    def __str__(self):
        return f"Rapor - {self.patient.username} - {self.appointment.date} - Dr. {self.doctor.user.get_full_name() or self.doctor.user.username}"


class PasswordResetToken(models.Model):
    """Şifre sıfırlama token modeli"""
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Kullanıcı'
    )
    token = models.CharField(max_length=64, unique=True, verbose_name='Token')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Oluşturulma Tarihi')
    expires_at = models.DateTimeField(verbose_name='Son Geçerlilik Tarihi')
    used = models.BooleanField(default=False, verbose_name='Kullanıldı mı?')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Şifre Sıfırlama Token'
        verbose_name_plural = 'Şifre Sıfırlama Tokenları'
    
    def __str__(self):
        return f"Token - {self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def is_valid(self):
        """Token geçerli mi kontrol et"""
        from django.utils import timezone
        return not self.used and timezone.now() < self.expires_at
