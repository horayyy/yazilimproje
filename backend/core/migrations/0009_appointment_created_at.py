# Generated manually

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_appointment_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, blank=True, verbose_name='Oluşturulma Tarihi'),
        ),
    ]

