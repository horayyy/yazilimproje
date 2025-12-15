# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_appointment_created_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='appointment_fee',
            field=models.DecimalField(decimal_places=2, default=500.0, help_text='Bu bölüm için randevu ücreti', max_digits=10, verbose_name='Randevu Ücreti (TL)'),
        ),
    ]

