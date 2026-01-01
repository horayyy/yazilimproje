from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser, Department, Doctor, Appointment, EmergencyService, LeaveRequest, MedicalReport


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that includes user_type and user ID"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['user_type'] = user.user_type
        token['user_id'] = user.id
        token['username'] = user.username
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user information to response
        data['user_id'] = self.user.id
        data['username'] = self.user.username
        data['user_type'] = self.user.user_type
        data['user_type_display'] = self.user.get_user_type_display()
        data['email'] = self.user.email
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration (Patient sign up)"""
    
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True, min_length=8)
    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'phone', 'national_id']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields did not match.',
                'password_confirm': 'Password fields did not match.'
            })
        return attrs
    
    def validate_national_id(self, value):
        if value and CustomUser.objects.filter(national_id=value).exists():
            raise serializers.ValidationError('A user with this national ID already exists.')
        return value
    
    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value
    
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Create user with user_type=4 (Patient)
        user = CustomUser.objects.create(
            **validated_data,
            user_type=4,  # Patient
            is_active=True
        )
        user.set_password(password)
        user.save()
        return user


class CustomUserSerializer(serializers.ModelSerializer):
    """Serializer for CustomUser model"""
    
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'user_type', 'user_type_display', 'phone', 'national_id', 
                  'is_staff', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'appointment_fee']


class DoctorSerializer(serializers.ModelSerializer):
    """Serializer for Doctor model"""
    
    doctor_name = serializers.CharField(source='user.get_full_name', read_only=True)
    doctor_username = serializers.CharField(source='user.username', read_only=True)
    department_name = serializers.StringRelatedField(source='department', read_only=True)
    
    # User bilgileri
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = Doctor
        fields = ['id', 'user', 'doctor_name', 'doctor_username', 'department', 
                  'department_name', 'title', 'is_active', 'is_emergency_doctor', 'working_hours', 'leave_dates',
                  'user_email', 'user_first_name', 'user_last_name', 'user_phone']
        read_only_fields = ['id']


class DoctorCreateSerializer(serializers.Serializer):
    """Serializer for creating a doctor with user information"""
    
    # User fields
    username = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    # Doctor fields
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True)
    
    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('Bu kullanıcı adı zaten kullanılıyor.')
        return value
    
    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('Bu e-posta adresi zaten kullanılıyor.')
        return value
    
    def create(self, validated_data):
        # Extract user data
        password = validated_data.pop('password')
        department = validated_data.pop('department', None)
        title = validated_data.pop('title', '')
        
        # Create user
        user = CustomUser.objects.create(
            **validated_data,
            user_type=3,  # Doctor
            is_active=True
        )
        user.set_password(password)
        user.save()
        
        # Create doctor profile (signal will create it automatically, but we update it)
        working_hours = validated_data.pop('working_hours', {}) if 'working_hours' in validated_data else {}
        leave_dates = validated_data.pop('leave_dates', []) if 'leave_dates' in validated_data else []
        is_emergency_doctor = validated_data.pop('is_emergency_doctor', False) if 'is_emergency_doctor' in validated_data else False
        
        doctor, created = Doctor.objects.get_or_create(
            user=user,
            defaults={
                'department': department,
                'title': title,
                'is_active': True,
                'is_emergency_doctor': is_emergency_doctor,
                'working_hours': working_hours,
                'leave_dates': leave_dates
            }
        )
        
        # Update if already exists
        if not created:
            doctor.department = department
            doctor.title = title
            doctor.is_emergency_doctor = is_emergency_doctor
            doctor.working_hours = working_hours if working_hours else doctor.working_hours
            doctor.leave_dates = leave_dates if leave_dates else doctor.leave_dates
            doctor.save()
        
        # Varsayılan çalışma saatlerini ayarla (eğer boşsa)
        if not doctor.working_hours:
            doctor.set_default_working_hours()
        
        return doctor


class AppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Appointment model"""
    
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_username = serializers.CharField(source='doctor.user.username', read_only=True)
    department_name = serializers.StringRelatedField(source='doctor.department', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    has_medical_report = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'patient_name', 'patient_username', 'patient_phone',
                  'doctor', 'doctor_name', 'doctor_username', 'department_name',
                  'date', 'time', 'status', 'notes', 
                  'patient_complaints', 'diagnosis', 'prescription', 'recommendations',
                  'fee', 'created_at', 'has_medical_report']
        read_only_fields = ['id', 'created_at']
    
    def get_has_medical_report(self, obj):
        """Check if appointment has a medical report"""
        return hasattr(obj, 'medical_report')


class PublicAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for public appointment creation (without authentication)"""
    
    # Patient information fields
    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(write_only=True, required=True)
    phone = serializers.CharField(write_only=True, required=True)
    national_id = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    department_name = serializers.StringRelatedField(source='doctor.department', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'national_id',
                  'doctor', 'doctor_name', 'department_name',
                  'date', 'time', 'status', 'notes', 'patient_name', 'fee', 'created_at']
        read_only_fields = ['id', 'status', 'patient_name', 'doctor_name', 'department_name', 'fee', 'created_at']
    
    def validate(self, attrs):
        """Validate appointment against doctor's working hours and leave dates"""
        doctor = attrs.get('doctor')
        date = attrs.get('date')
        time = attrs.get('time')
        
        if doctor and date and time:
            # Hafta sonu kontrolü - hafta sonu randevu alınamaz
            weekday = date.weekday()
            if weekday >= 5:  # Cumartesi (5) veya Pazar (6)
                raise serializers.ValidationError({
                    'date': 'Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.'
                })
            
            # Check if doctor is available on this date
            if not doctor.is_available_on_date(date):
                raise serializers.ValidationError({
                    'date': 'Doktor bu tarihte çalışmıyor veya izinli.'
                })
            
            # Check if time is within working hours
            weekday = date.weekday()
            working_hours = doctor.get_working_hours_for_day(weekday)
            
            if working_hours:
                from datetime import datetime
                appointment_time = datetime.strptime(str(time), '%H:%M:%S').time()
                start_time = datetime.strptime(working_hours['start'], '%H:%M').time()
                end_time = datetime.strptime(working_hours['end'], '%H:%M').time()
                
                if not (start_time <= appointment_time < end_time):
                    raise serializers.ValidationError({
                        'time': f'Randevu saati çalışma saatleri dışında. Çalışma saatleri: {working_hours["start"]} - {working_hours["end"]}'
                    })
            
            # Check if time slot is already taken
            existing = Appointment.objects.filter(
                doctor=doctor,
                date=date,
                time=time,
                status='completed'
            ).exists()
            
            if existing:
                raise serializers.ValidationError({
                    'time': 'Bu saat için zaten bir randevu mevcut.'
                })
        
        return attrs
    
    def create(self, validated_data):
        # Extract patient information
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        email = validated_data.pop('email')
        phone = validated_data.pop('phone')
        national_id = validated_data.pop('national_id', None)
        
        # Get or create patient user
        username = email.split('@')[0]  # Use email prefix as username
        base_username = username
        counter = 1
        
        # Ensure unique username
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Check if user exists by email or national_id
        patient = None
        
        # First, try to get by email
        try:
            patient = CustomUser.objects.get(email=email)
            # Update patient info if user already exists
            patient.first_name = first_name
            patient.last_name = last_name
            patient.phone = phone
            if national_id and not patient.national_id:
                patient.national_id = national_id
            patient.save()
        except CustomUser.DoesNotExist:
            # If national_id provided, check if it already exists
            if national_id:
                try:
                    patient = CustomUser.objects.get(national_id=national_id)
                    # Update existing patient with same national_id
                    patient.first_name = first_name
                    patient.last_name = last_name
                    patient.email = email
                    patient.phone = phone
                    # Update username if needed
                    if patient.username != username:
                        patient.username = username
                    patient.save()
                except CustomUser.DoesNotExist:
                    # Create new patient user
                    patient = CustomUser.objects.create(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        phone=phone,
                        national_id=national_id,
                        user_type=4,  # Patient
                        is_active=True,
                    )
            else:
                # Create new patient user without national_id
                patient = CustomUser.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    national_id=None,
                    user_type=4,  # Patient
                    is_active=True,
                )
        
        # Determine appointment fee - use department fee if available, otherwise default
        doctor = validated_data['doctor']
        fee = 500.00  # Varsayılan ücret
        if doctor.department and doctor.department.appointment_fee:
            fee = doctor.department.appointment_fee
        
        # Create appointment
        from core.utils import generate_cancel_token
        cancel_token = generate_cancel_token()
        
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            date=validated_data['date'],
            time=validated_data['time'],
            notes=validated_data.get('notes', ''),
            status='completed',  # Randevular direkt tamamlandı olarak oluşturuluyor, para hesaba geçiyor
            fee=fee,  # Bölüm ücreti veya varsayılan ücret
            cancel_token=cancel_token,
        )
        
        # Send confirmation email
        try:
            from core.utils import send_appointment_confirmation_email
            send_appointment_confirmation_email(appointment)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Email gönderme hatası: {str(e)}", exc_info=True)
            # Email hatası randevu oluşturmayı engellemez
        
        return appointment


class EmergencyServiceSerializer(serializers.ModelSerializer):
    """Serializer for EmergencyService model"""
    
    class Meta:
        model = EmergencyService
        fields = ['id', 'is_active', 'status', 'phone', 'address', 'notes', 'is_24_7']
        read_only_fields = ['id']


class LeaveRequestSerializer(serializers.ModelSerializer):
    """Serializer for LeaveRequest model"""
    
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_username = serializers.CharField(source='doctor.user.username', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'doctor', 'doctor_name', 'doctor_username', 'requested_date', 
                  'reason', 'status', 'status_display', 'created_at', 'reviewed_at', 
                  'reviewed_by', 'reviewed_by_name', 'admin_notes']
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by', 'status', 'doctor']
        extra_kwargs = {
            'doctor': {'read_only': True},
            'reason': {'required': False, 'allow_blank': True, 'allow_null': True}
        }
    
    def validate_requested_date(self, value):
        """İzin tarihi geçmişte olamaz"""
        from datetime import date
        if isinstance(value, str):
            # Eğer string ise parse et
            try:
                from datetime import datetime
                value = datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError:
                raise serializers.ValidationError('Geçersiz tarih formatı. YYYY-MM-DD formatında olmalı.')
        if value < date.today():
            raise serializers.ValidationError('İzin tarihi geçmişte olamaz.')
        return value


class MedicalReportSerializer(serializers.ModelSerializer):
    """Serializer for MedicalReport model"""
    
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    appointment_date = serializers.DateField(source='appointment.date', read_only=True)
    appointment_time = serializers.TimeField(source='appointment.time', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalReport
        fields = ['id', 'appointment', 'doctor', 'doctor_name', 'patient', 'patient_name',
                  'appointment_date', 'appointment_time', 'report_content', 'pdf_file', 
                  'pdf_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_pdf_url(self, obj):
        """Return PDF file URL if exists"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
        return None