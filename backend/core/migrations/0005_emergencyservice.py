# Generated manually for EmergencyService model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_remove_doctor_weekend_duty'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmergencyService',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=True, verbose_name='Aktif')),
                ('status', models.CharField(choices=[('open', 'Açık'), ('closed', 'Kapalı')], default='open', max_length=10, verbose_name='Durum')),
                ('phone', models.CharField(blank=True, max_length=20, null=True, verbose_name='Telefon')),
                ('address', models.TextField(blank=True, null=True, verbose_name='Adres')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notlar/Açıklamalar')),
                ('is_24_7', models.BooleanField(default=True, verbose_name='7/24 Açık')),
            ],
            options={
                'verbose_name': 'Acil Servis',
                'verbose_name_plural': 'Acil Servis',
            },
        ),
    ]
