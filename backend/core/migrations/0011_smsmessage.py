# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_department_appointment_fee'),
    ]

    operations = [
        migrations.CreateModel(
            name='SMSMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField(verbose_name='Mesaj')),
                ('sent_at', models.DateTimeField(auto_now_add=True, verbose_name='Gönderilme Tarihi')),
                ('appointment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sms_messages', to='core.appointment', verbose_name='Randevu')),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_sms', to='core.doctor', verbose_name='Doktor')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_sms', to='core.customuser', verbose_name='Hasta')),
            ],
            options={
                'verbose_name': 'SMS Mesajı',
                'verbose_name_plural': 'SMS Mesajları',
                'ordering': ['-sent_at'],
            },
        ),
    ]

