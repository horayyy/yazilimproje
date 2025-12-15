#!/usr/bin/env python
"""
Script to approve all pending appointments
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_project.settings')
django.setup()

from core.models import Appointment

def approve_pending_appointments():
    """Approve all pending appointments"""
    pending = Appointment.objects.filter(status='pending')
    count = pending.count()
    
    if count == 0:
        print("✅ Beklemede randevu bulunamadı.")
        return
    
    print(f"⚠️  {count} adet beklemede randevu bulundu:")
    for apt in pending:
        print(f"  - ID: {apt.id}, Hasta: {apt.patient.username}, Tarih: {apt.date}, Saat: {apt.time}")
    
    # Onayla
    updated = pending.update(status='confirmed')
    print(f"\n✅ {updated} adet randevu onaylandı!")

if __name__ == '__main__':
    approve_pending_appointments()

