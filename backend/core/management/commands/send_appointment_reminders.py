"""
Management command to send appointment reminder emails 24 hours before
Run this command daily via cron job or scheduled task
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from core.models import Appointment
from core.utils import send_appointment_reminder_email
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send appointment reminder emails 24 hours before appointment time'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # 24 saat sonraki randevuları bul (24 saat ± 1 saat aralığında)
        now = timezone.now()
        tomorrow_start = now + timedelta(hours=23)
        tomorrow_end = now + timedelta(hours=25)
        
        # Sadece tamamlanmış (aktif) randevular
        appointments = Appointment.objects.filter(
            status='completed',
            date__gte=now.date(),
        )
        
        reminders_sent = 0
        reminders_failed = 0
        
        for appointment in appointments:
            # Randevu tarih ve saatini birleştir
            appointment_datetime = timezone.make_aware(
                datetime.combine(appointment.date, appointment.time)
            )
            
            # 24 saat öncesi kontrolü (23-25 saat arası)
            if tomorrow_start <= appointment_datetime <= tomorrow_end:
                patient = appointment.patient
                
                # Email adresi kontrolü
                if not patient.email:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠️  Randevu ID {appointment.id}: Hasta email adresi yok - {patient.username}'
                        )
                    )
                    continue
                
                if dry_run:
                    self.stdout.write(
                        f'  📧 [DRY RUN] Randevu ID {appointment.id}: '
                        f'{patient.get_full_name() or patient.username} - '
                        f'{appointment.date} {appointment.time}'
                    )
                else:
                    try:
                        send_appointment_reminder_email(appointment)
                        reminders_sent += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✅ Randevu ID {appointment.id}: Email gönderildi - '
                                f'{patient.get_full_name() or patient.username}'
                            )
                        )
                    except Exception as e:
                        reminders_failed += 1
                        logger.error(f"Reminder email hatası (Randevu ID {appointment.id}): {str(e)}", exc_info=True)
                        self.stdout.write(
                            self.style.ERROR(
                                f'  ❌ Randevu ID {appointment.id}: Email gönderilemedi - {str(e)}'
                            )
                        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n📊 DRY RUN: {appointments.count()} randevu kontrol edildi'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Toplam {reminders_sent} hatırlatma emaili gönderildi'
                )
            )
            if reminders_failed > 0:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ {reminders_failed} email gönderilemedi'
                    )
                )

