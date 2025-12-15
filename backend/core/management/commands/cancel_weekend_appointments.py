from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from core.models import Appointment


class Command(BaseCommand):
    help = 'Cancel all weekend appointments (Saturday and Sunday)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cancelled without actually cancelling',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get all appointments
        appointments = Appointment.objects.filter(
            status='completed'
        )
        
        weekend_appointments = []
        for apt in appointments:
            weekday = apt.date.weekday()
            if weekday >= 5:  # Saturday (5) or Sunday (6)
                weekend_appointments.append(apt)
        
        if not weekend_appointments:
            self.stdout.write(self.style.SUCCESS('Hafta sonu randevusu bulunamadı.'))
            return
        
        self.stdout.write(f'Toplam {len(weekend_appointments)} hafta sonu randevusu bulundu.')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - Randevular iptal edilmeyecek'))
            for apt in weekend_appointments:
                self.stdout.write(
                    f'  - {apt.date.strftime("%Y-%m-%d")} ({apt.date.strftime("%A")}) - '
                    f'{apt.patient.get_full_name()} - {apt.doctor.user.get_full_name()} - {apt.time}'
                )
        else:
            cancelled_count = 0
            for apt in weekend_appointments:
                apt.status = 'cancelled'
                apt.save()
                cancelled_count += 1
                self.stdout.write(
                    f'  ✓ İptal edildi: {apt.date.strftime("%Y-%m-%d")} - '
                    f'{apt.patient.get_full_name()} - {apt.doctor.user.get_full_name()}'
                )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Toplam {cancelled_count} hafta sonu randevusu iptal edildi.'
                )
            )

