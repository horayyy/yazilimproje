"""
Utility functions for email sending and password management
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from django.utils import timezone
from datetime import datetime, timedelta
import secrets


def generate_cancel_token():
    """Generate a secure token for appointment cancellation"""
    return secrets.token_urlsafe(32)


def can_cancel_appointment(appointment):
    """Check if appointment can be cancelled (6 hours before)"""
    from datetime import datetime, timedelta
    appointment_datetime = datetime.combine(appointment.date, appointment.time)
    now = datetime.now()
    hours_until_appointment = (appointment_datetime - now).total_seconds() / 3600
    return hours_until_appointment >= 6


def send_appointment_confirmation_email(appointment):
    """Send appointment confirmation email to patient"""
    try:
        patient = appointment.patient
        doctor = appointment.doctor
        doctor_name = doctor.user.get_full_name() or doctor.user.username
        
        # Cancel token oluştur ve kaydet
        if not appointment.cancel_token:
            cancel_token = generate_cancel_token()
            appointment.cancel_token = cancel_token
            appointment.save(update_fields=['cancel_token'])
        else:
            cancel_token = appointment.cancel_token
        
        # Email içeriği
        subject = f'Randevu Onayı - {appointment.date.strftime("%d.%m.%Y")} {appointment.time.strftime("%H:%M")}'
        
        # Cancel URL (6 saat geçerli token ile)
        cancel_url = f"{settings.FRONTEND_URL}/cancel-appointment/{appointment.id}?token={cancel_token}"
        
        # Email template içeriği
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4CAF50;">✅ Randevunuz Başarıyla Oluşturuldu</h2>
                
                <p>Sayın {patient.get_full_name() or patient.username},</p>
                
                <p>Randevunuz başarıyla oluşturulmuştur. Randevu detaylarınız aşağıdadır:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Doktor:</strong> Dr. {doctor_name}</p>
                    <p><strong>Bölüm:</strong> {doctor.department.name if doctor.department else 'Belirtilmemiş'}</p>
                    <p><strong>Tarih:</strong> {appointment.date.strftime("%d.%m.%Y")}</p>
                    <p><strong>Saat:</strong> {appointment.time.strftime("%H:%M")}</p>
                    <p><strong>Durum:</strong> Tamamlandı</p>
                </div>
                
                <p><strong>💰 Randevu Ücreti:</strong> {appointment.fee} TL</p>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p><strong>📧 Hatırlatma:</strong></p>
                    <ul>
                        <li>Randevunuzdan 24 saat önce size SMS ile hatırlatma gönderilecektir.</li>
                        <li>Randevunuzu iptal etmek isterseniz, aşağıdaki linke tıklayarak randevunuzdan 6 saat öncesine kadar iptal edebilirsiniz.</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{cancel_url}" 
                       style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Randevuyu İptal Et
                    </a>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    <strong>Not:</strong> Bu link randevunuzdan 6 saat öncesine kadar geçerlidir. 
                    Randevu saatinden 6 saat kala iptal işlemi yapılamaz.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Bu otomatik bir e-postadır. Lütfen bu e-postaya yanıt vermeyiniz.<br>
                    Hastane Randevu Sistemi
                </p>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        # Email gönder
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@hospital.com',
            recipient_list=[patient.email] if patient.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Email gönderme hatası: {str(e)}", exc_info=True)
        return False


def send_appointment_reminder_email(appointment):
    """Send appointment reminder email 24 hours before"""
    try:
        patient = appointment.patient
        doctor = appointment.doctor
        doctor_name = doctor.user.get_full_name() or doctor.user.username
        
        subject = f'Randevu Hatırlatması - Yarın {appointment.time.strftime("%H:%M")}'
        
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2196F3;">🔔 Randevu Hatırlatması</h2>
                
                <p>Sayın {patient.get_full_name() or patient.username},</p>
                
                <p>Yarın randevunuz bulunmaktadır. Randevu detaylarınız:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Doktor:</strong> Dr. {doctor_name}</p>
                    <p><strong>Bölüm:</strong> {doctor.department.name if doctor.department else 'Belirtilmemiş'}</p>
                    <p><strong>Tarih:</strong> {appointment.date.strftime("%d.%m.%Y")}</p>
                    <p><strong>Saat:</strong> {appointment.time.strftime("%H:%M")}</p>
                </div>
                
                <p style="color: #dc3545;"><strong>⚠️ Önemli:</strong> Randevunuzdan 6 saat öncesine kadar iptal edebilirsiniz.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Hastane Randevu Sistemi
                </p>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@hospital.com',
            recipient_list=[patient.email] if patient.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Email hatırlatma hatası: {str(e)}", exc_info=True)
        return False


def send_password_reset_email(user, reset_token):
    """Send password reset email to user"""
    try:
        from core.models import PasswordResetToken
        
        # Reset URL
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
        
        subject = 'Şifre Sıfırlama Talebi'
        
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2196F3;">🔐 Şifre Sıfırlama</h2>
                
                <p>Sayın {user.get_full_name() or user.username},</p>
                
                <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki linke tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Şifremi Sıfırla
                    </a>
                </div>
                
                <p style="font-size: 12px; color: #666;">
                    <strong>Önemli:</strong> Bu link 24 saat geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.
                </p>
                
                <p style="font-size: 12px; color: #999;">
                    Link çalışmıyorsa, aşağıdaki URL'yi tarayıcınıza kopyalayıp yapıştırabilirsiniz:<br>
                    <span style="word-break: break-all;">{reset_url}</span>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Bu otomatik bir e-postadır. Lütfen bu e-postaya yanıt vermeyiniz.<br>
                    Hastane Randevu Sistemi
                </p>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@hospital.com',
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Şifre sıfırlama email hatası: {str(e)}", exc_info=True)
        return False

