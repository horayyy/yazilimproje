from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.generics import CreateAPIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Department, Doctor, Appointment, CustomUser, EmergencyService, LeaveRequest, SMSMessage, MedicalReport
from .serializers import DepartmentSerializer, DoctorSerializer, AppointmentSerializer, RegisterSerializer, PublicAppointmentSerializer, DoctorCreateSerializer, EmergencyServiceSerializer, LeaveRequestSerializer, MedicalReportSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Department model"""
    
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class DoctorViewSet(viewsets.ModelViewSet):
    """ViewSet for Doctor model - read-only for unauthenticated users"""
    
    queryset = Doctor.objects.filter(is_active=True)
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Filter active doctors by default"""
        queryset = Doctor.objects.filter(is_active=True)
        return queryset
    
    def get_serializer_class(self):
        """Use different serializer for create action"""
        if self.action == 'create':
            return DoctorCreateSerializer
        return DoctorSerializer
    
    def create(self, request, *args, **kwargs):
        """Create doctor with user information"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = serializer.save()
        
        # Return doctor data with user info
        response_serializer = DoctorSerializer(doctor)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update doctor and optionally update user information"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Extract user update fields from request data
        user_update_fields = {}
        user_field_mapping = {
            'user_first_name': 'first_name',
            'user_last_name': 'last_name',
            'user_email': 'email',
            'user_phone': 'phone'
        }
        
        for request_key, user_field in user_field_mapping.items():
            if request_key in request.data:
                user_update_fields[user_field] = request.data.pop(request_key)
        
        # Update doctor using serializer
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Update user information if provided
        if user_update_fields and instance.user:
            for field, value in user_update_fields.items():
                setattr(instance.user, field, value)
            instance.user.save()
        
        # Return updated doctor data
        response_serializer = DoctorSerializer(instance)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['get'])
    def available_slots(self, request, pk=None):
        """Get available time slots for a doctor on a specific date"""
        doctor = self.get_object()
        date_str = request.query_params.get('date', None)
        
        if not date_str:
            return Response(
                {'error': 'date parameter is required (format: YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            slots = doctor.get_available_time_slots(date)
            return Response({'available_slots': slots})
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    


class AppointmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Appointment model - allows creating appointments"""
    
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Filter appointments based on user type"""
        user = self.request.user
        
        # If user is not authenticated, return empty queryset
        if not user.is_authenticated:
            return Appointment.objects.none()
        
        user_type = user.user_type
        
        # Admin (1) or Secretary (2) can see all appointments
        if user_type in [1, 2]:
            return Appointment.objects.all()
        
        # Doctor (3) can only see appointments assigned to them
        elif user_type == 3:
            try:
                doctor = Doctor.objects.get(user=user)
                return Appointment.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return Appointment.objects.none()
        
        # Patient (4) can only see their own appointments
        elif user_type == 4:
            return Appointment.objects.filter(patient=user)
        
        # Default: return empty queryset
        return Appointment.objects.none()
    
    def perform_create(self, serializer):
        """Set patient to current user if not specified and validate working hours"""
        # Hafta sonu kontrolü
        date = serializer.validated_data.get('date')
        if date:
            weekday = date.weekday()
            if weekday >= 5:  # Cumartesi (5) veya Pazar (6)
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'date': 'Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.'
                })
        
        # Determine appointment fee - use department fee if available, otherwise default or provided fee
        doctor = serializer.validated_data.get('doctor')
        fee = serializer.validated_data.get('fee', None)
        if not fee and doctor and doctor.department and doctor.department.appointment_fee:
            fee = doctor.department.appointment_fee
        elif not fee:
            fee = 500.00  # Varsayılan ücret
        
        # Cancel token oluştur
        from core.utils import generate_cancel_token
        cancel_token = generate_cancel_token()
        
        # Randevular direkt tamamlandı olarak oluşturuluyor, para hesaba geçiyor
        if 'patient' not in serializer.validated_data:
            appointment = serializer.save(patient=self.request.user, status='completed', fee=fee, cancel_token=cancel_token)
        else:
            appointment = serializer.save(status='completed', fee=fee, cancel_token=cancel_token)
        
        # Send confirmation email
        try:
            from core.utils import send_appointment_confirmation_email
            send_appointment_confirmation_email(appointment)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Email gönderme hatası: {str(e)}", exc_info=True)
            # Email hatası randevu oluşturmayı engellemez
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='send-sms')
    def send_sms(self, request, pk=None):
        """SMS gönderme endpoint'i"""
        try:
            appointment = self.get_object()
            message = request.data.get('message', '')
            
            if not message:
                return Response(
                    {'detail': 'SMS mesajı boş olamaz.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Doktor kontrolü - sadece kendi randevularına SMS gönderebilir
            user = request.user
            if user.user_type == 3:  # Doctor
                try:
                    doctor = Doctor.objects.get(user=user)
                    if appointment.doctor != doctor:
                        return Response(
                            {'detail': 'Bu randevuya SMS gönderme yetkiniz yok.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Doctor.DoesNotExist:
                    return Response(
                        {'detail': 'Doktor bilgisi bulunamadı.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Hasta bilgileri
            patient = appointment.patient
            patient_name = patient.get_full_name() or patient.username
            patient_phone = patient.phone or 'Telefon numarası kayıtlı değil'
            
            # SMS mesajını veritabanına kaydet
            doctor = appointment.doctor
            sms_message = SMSMessage.objects.create(
                appointment=appointment,
                doctor=doctor,
                patient=patient,
                message=message
            )
            
            # SMS gönderme işlemi (şimdilik log olarak)
            # Gerçek bir SMS servisi entegre edilebilir (Twilio, Netgsm, vs.)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"SMS gönderildi - Hasta: {patient_name}, Telefon: {patient_phone}, Mesaj: {message}")
            
            # TODO: Gerçek SMS servisi entegrasyonu
            # Örnek: Twilio, Netgsm, vs. kullanılabilir
            # if patient.phone:
            #     # Gerçek SMS gönderme kodu buraya gelecek
            #     pass
            
            return Response({
                'detail': 'SMS başarıyla gönderildi.',
                'patient': patient_name,
                'phone': patient_phone,
                'message': message,
                'sms_id': sms_message.id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"SMS gönderme hatası: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'SMS gönderme sırasında bir hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-patients')
    def my_patients(self, request):
        """Doktorun hastalarını listele"""
        try:
            user = request.user
            if user.user_type != 3:  # Sadece doktorlar
                return Response(
                    {'detail': 'Bu işlem için doktor yetkisi gereklidir.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            doctor = Doctor.objects.get(user=user)
            appointments = Appointment.objects.filter(doctor=doctor).select_related('patient', 'doctor')
            
            # Benzersiz hastaları al
            unique_patients = {}
            for appointment in appointments:
                patient = appointment.patient
                if patient.id not in unique_patients:
                    unique_patients[patient.id] = {
                        'id': patient.id,
                        'username': patient.username,
                        'first_name': patient.first_name,
                        'last_name': patient.last_name,
                        'email': patient.email,
                        'phone': patient.phone,
                        'national_id': patient.national_id,
                        'full_name': patient.get_full_name() or patient.username,
                        'appointment_count': 0,
                        'last_appointment_date': None,
                        'sms_messages': []
                    }
                
                unique_patients[patient.id]['appointment_count'] += 1
                if not unique_patients[patient.id]['last_appointment_date'] or appointment.date > unique_patients[patient.id]['last_appointment_date']:
                    unique_patients[patient.id]['last_appointment_date'] = appointment.date
            
            # Her hasta için SMS mesajlarını al
            for patient_id, patient_data in unique_patients.items():
                patient = CustomUser.objects.get(id=patient_id)
                sms_messages = SMSMessage.objects.filter(
                    doctor=doctor,
                    patient=patient
                ).order_by('-sent_at')[:10]  # Son 10 mesaj
                
                patient_data['sms_messages'] = [
                    {
                        'id': sms.id,
                        'message': sms.message,
                        'sent_at': sms.sent_at.isoformat(),
                        'appointment_date': sms.appointment.date.isoformat() if sms.appointment else None
                    }
                    for sms in sms_messages
                ]
            
            return Response({
                'patients': list(unique_patients.values())
            }, status=status.HTTP_200_OK)
        except Doctor.DoesNotExist:
            return Response(
                {'detail': 'Doktor bilgisi bulunamadı.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Hasta listesi hatası: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Hasta listesi alınırken bir hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated], url_path='add-notes')
    def add_notes(self, request, pk=None):
        """Randevu notları ekleme/güncelleme endpoint'i"""
        try:
            appointment = self.get_object()
            user = request.user
            
            # Doktor kontrolü - sadece kendi randevularına not ekleyebilir
            if user.user_type == 3:  # Doctor
                try:
                    doctor = Doctor.objects.get(user=user)
                    if appointment.doctor != doctor:
                        return Response(
                            {'detail': 'Bu randevuya not ekleme yetkiniz yok.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Doctor.DoesNotExist:
                    return Response(
                        {'detail': 'Doktor bilgisi bulunamadı.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif user.user_type not in [1, 2, 3]:  # Admin, Secretary veya Doctor olmalı
                return Response(
                    {'detail': 'Bu işlem için yetkiniz yok.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Notları güncelle
            patient_complaints = request.data.get('patient_complaints', None)
            diagnosis = request.data.get('diagnosis', None)
            prescription = request.data.get('prescription', None)
            recommendations = request.data.get('recommendations', None)
            notes = request.data.get('notes', None)
            
            if patient_complaints is not None:
                appointment.patient_complaints = patient_complaints
            if diagnosis is not None:
                appointment.diagnosis = diagnosis
            if prescription is not None:
                appointment.prescription = prescription
            if recommendations is not None:
                appointment.recommendations = recommendations
            if notes is not None:
                appointment.notes = notes
            
            appointment.save()
            
            serializer = AppointmentSerializer(appointment)
            return Response({
                'detail': 'Notlar başarıyla güncellendi.',
                'appointment': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Not ekleme hatası: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Not ekleme sırasında bir hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='create-report')
    def create_report(self, request, pk=None):
        """Muayene raporu oluşturma endpoint'i"""
        try:
            appointment = self.get_object()
            user = request.user
            
            # Doktor kontrolü - sadece kendi randevularına rapor oluşturabilir
            if user.user_type == 3:  # Doctor
                try:
                    doctor = Doctor.objects.get(user=user)
                    if appointment.doctor != doctor:
                        return Response(
                            {'detail': 'Bu randevu için rapor oluşturma yetkiniz yok.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Doctor.DoesNotExist:
                    return Response(
                        {'detail': 'Doktor bilgisi bulunamadı.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif user.user_type not in [1, 2, 3]:  # Admin, Secretary veya Doctor olmalı
                return Response(
                    {'detail': 'Bu işlem için yetkiniz yok.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Rapor içeriği oluştur
            report_content = request.data.get('report_content', '')
            
            # Eğer report_content yoksa, appointment notlarından oluştur
            if not report_content:
                report_parts = []
                if appointment.patient_complaints:
                    report_parts.append(f"Hasta Şikayetleri:\n{appointment.patient_complaints}\n")
                if appointment.diagnosis:
                    report_parts.append(f"Teşhis:\n{appointment.diagnosis}\n")
                if appointment.prescription:
                    report_parts.append(f"Reçete:\n{appointment.prescription}\n")
                if appointment.recommendations:
                    report_parts.append(f"Öneriler:\n{appointment.recommendations}\n")
                if appointment.notes:
                    report_parts.append(f"Notlar:\n{appointment.notes}\n")
                
                report_content = "\n".join(report_parts) if report_parts else "Rapor içeriği henüz eklenmedi."
            
            # Rapor oluştur veya güncelle
            medical_report, created = MedicalReport.objects.update_or_create(
                appointment=appointment,
                defaults={
                    'doctor': appointment.doctor,
                    'patient': appointment.patient,
                    'report_content': report_content
                }
            )
            
            serializer = MedicalReportSerializer(medical_report, context={'request': request})
            return Response({
                'detail': 'Rapor başarıyla oluşturuldu.' if created else 'Rapor başarıyla güncellendi.',
                'report': serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Rapor oluşturma hatası: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Rapor oluşturma sırasında bir hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='report')
    def get_report(self, request, pk=None):
        """Randevu raporunu getir"""
        try:
            appointment = self.get_object()
            user = request.user
            
            # Yetki kontrolü - doktor, hasta veya admin/secretary görebilir
            can_view = False
            if user.user_type in [1, 2]:  # Admin veya Secretary
                can_view = True
            elif user.user_type == 3:  # Doctor
                try:
                    doctor = Doctor.objects.get(user=user)
                    if appointment.doctor == doctor:
                        can_view = True
                except Doctor.DoesNotExist:
                    pass
            elif user.user_type == 4:  # Patient
                if appointment.patient == user:
                    can_view = True
            
            if not can_view:
                return Response(
                    {'detail': 'Bu raporu görüntüleme yetkiniz yok.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            try:
                medical_report = MedicalReport.objects.get(appointment=appointment)
                serializer = MedicalReportSerializer(medical_report, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            except MedicalReport.DoesNotExist:
                return Response(
                    {'detail': 'Bu randevu için henüz rapor oluşturulmamış.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Rapor getirme hatası: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Rapor getirme sırasında bir hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RegisterView(CreateAPIView):
    """View for patient registration"""
    
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            # Remove password from response
            user_data = response.data
            user_data.pop('password', None)
            user_data.pop('password_confirm', None)
        return response


class PublicAppointmentView(CreateAPIView):
    """View for public appointment creation (without authentication)"""
    
    serializer_class = PublicAppointmentSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        # Email gönderme işlemi serializer içinde yapılıyor
        # Burada sadece response'u döndürüyoruz
        return response


class EmergencyServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for EmergencyService model"""
    
    queryset = EmergencyService.objects.all()
    serializer_class = EmergencyServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Return single emergency service instance (singleton pattern)"""
        # Acil servis tek bir kayıt olmalı, yoksa oluştur
        emergency_service, created = EmergencyService.objects.get_or_create(
            id=1,
            defaults={
                'is_active': True,
                'status': 'open',
                'is_24_7': True
            }
        )
        return EmergencyService.objects.filter(id=emergency_service.id)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def current(self, request):
        """Get current emergency service status (public endpoint)"""
        emergency_service, created = EmergencyService.objects.get_or_create(
            id=1,
            defaults={
                'is_active': True,
                'status': 'open',
                'is_24_7': True
            }
        )
        serializer = self.get_serializer(emergency_service)
        return Response(serializer.data)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for LeaveRequest model"""
    
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter leave requests based on user type"""
        user = self.request.user
        
        if not user.is_authenticated:
            return LeaveRequest.objects.none()
        
        user_type = user.user_type
        
        # Admin (1) can see all leave requests
        if user_type == 1:
            return LeaveRequest.objects.all()
        
        # Doctor (3) can only see their own leave requests
        elif user_type == 3:
            try:
                doctor = Doctor.objects.get(user=user)
                return LeaveRequest.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return LeaveRequest.objects.none()
        
        # Others cannot see leave requests
        return LeaveRequest.objects.none()
    
    def get_object(self):
        """Override get_object to ensure admin can access any leave request"""
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        # Admin can access any leave request, even if not in filtered queryset
        if self.request.user.user_type == 1:
            try:
                return LeaveRequest.objects.get(pk=lookup_value)
            except LeaveRequest.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound('İzin talebi bulunamadı.')
        
        # For non-admin users, use default behavior
        filter_kwargs = {self.lookup_field: lookup_value}
        obj = queryset.filter(**filter_kwargs).first()
        if obj is None:
            from rest_framework.exceptions import NotFound
            raise NotFound('İzin talebi bulunamadı.')
        return obj
    
    def create(self, request, *args, **kwargs):
        """Create leave request for current doctor"""
        user = request.user
        if user.user_type != 3:  # Only doctors can create leave requests
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Sadece doktorlar izin talebi oluşturabilir.')
        
        try:
            doctor = Doctor.objects.get(user=user)
        except Doctor.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Doktor profili bulunamadı.')
        
        # Create serializer and validate (doctor field will be ignored since it's read_only)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)
            return Response({
                'error': 'Validation hatası',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create leave request with doctor
        try:
            leave_request = LeaveRequest.objects.create(
                doctor=doctor,
                requested_date=serializer.validated_data['requested_date'],
                reason=serializer.validated_data.get('reason', '') or ''
            )
        except Exception as e:
            print("Error creating leave request:", str(e))
            return Response({
                'error': 'İzin talebi oluşturulamadı',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response_serializer = self.get_serializer(leave_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve a leave request (admin only)"""
        print(f"Approve request - User: {request.user.username}, User type: {request.user.user_type}, PK: {pk}")
        
        if request.user.user_type != 1:  # Only admins
            print(f"Permission denied - User type: {request.user.user_type}")
            return Response(
                {'error': 'Sadece yöneticiler izin onaylayabilir.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            leave_request = self.get_object()
            print(f"Leave request found - ID: {leave_request.id}, Status: {leave_request.status}")
        except Exception as e:
            print(f"Error getting leave request: {str(e)}")
            return Response(
                {'error': f'İzin talebi bulunamadı: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if leave_request.status != 'pending':
            print(f"Leave request already processed - Status: {leave_request.status}")
            return Response(
                {'error': 'Bu izin talebi zaten işleme alınmış.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            admin_notes = request.data.get('admin_notes', '')
            print(f"Approving leave request - Admin notes: {admin_notes}")
            leave_request.approve(request.user, admin_notes)
            print(f"Leave request approved successfully")
            
            serializer = self.get_serializer(leave_request)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error approving leave request: {str(e)}")
            return Response(
                {'error': f'İzin onaylanırken hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject a leave request (admin only)"""
        print(f"Reject request - User: {request.user.username}, User type: {request.user.user_type}, PK: {pk}")
        
        if request.user.user_type != 1:  # Only admins
            print(f"Permission denied - User type: {request.user.user_type}")
            return Response(
                {'error': 'Sadece yöneticiler izin reddedebilir.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            leave_request = self.get_object()
            print(f"Leave request found - ID: {leave_request.id}, Status: {leave_request.status}")
        except Exception as e:
            print(f"Error getting leave request: {str(e)}")
            return Response(
                {'error': f'İzin talebi bulunamadı: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if leave_request.status != 'pending':
            print(f"Leave request already processed - Status: {leave_request.status}")
            return Response(
                {'error': 'Bu izin talebi zaten işleme alınmış.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            admin_notes = request.data.get('admin_notes', '')
            print(f"Rejecting leave request - Admin notes: {admin_notes}")
            leave_request.reject(request.user, admin_notes)
            print(f"Leave request rejected successfully")
            
            serializer = self.get_serializer(leave_request)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error rejecting leave request: {str(e)}")
            return Response(
                {'error': f'İzin reddedilirken hata oluştu: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MedicalReportViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for MedicalReport model - read-only"""
    
    queryset = MedicalReport.objects.all()
    serializer_class = MedicalReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter reports based on user type"""
        user = self.request.user
        
        if not user.is_authenticated:
            return MedicalReport.objects.none()
        
        user_type = user.user_type
        
        # Admin (1) or Secretary (2) can see all reports
        if user_type in [1, 2]:
            return MedicalReport.objects.all()
        
        # Doctor (3) can only see reports for their appointments
        elif user_type == 3:
            try:
                doctor = Doctor.objects.get(user=user)
                return MedicalReport.objects.filter(doctor=doctor)
            except Doctor.DoesNotExist:
                return MedicalReport.objects.none()
        
        # Patient (4) can only see their own reports
        elif user_type == 4:
            return MedicalReport.objects.filter(patient=user)
        
        # Default: return empty queryset
        return MedicalReport.objects.none()


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def cancel_appointment_by_email(request, appointment_id):
    """Cancel appointment via email link (token required)"""
    try:
        appointment = Appointment.objects.get(id=appointment_id)
        
        # Token kontrolü
        token = request.GET.get('token') or request.data.get('token')
        if not token or appointment.cancel_token != token:
            return Response(
                {'detail': 'Geçersiz veya eksik token.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 6 saat kontrolü
        from core.utils import can_cancel_appointment
        if not can_cancel_appointment(appointment):
            return Response(
                {'detail': 'Randevu saatinden 6 saat kala iptal işlemi yapılamaz.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Randevu zaten iptal edilmiş mi?
        if appointment.status == 'cancelled':
            return Response(
                {'detail': 'Bu randevu zaten iptal edilmiş.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Randevuyu iptal et
        appointment.status = 'cancelled'
        appointment.save(update_fields=['status'])
        
        return Response({
            'detail': 'Randevu başarıyla iptal edildi.',
            'appointment_id': appointment.id,
            'patient': appointment.patient.get_full_name() or appointment.patient.username,
            'date': appointment.date.isoformat(),
            'time': appointment.time.isoformat(),
        }, status=status.HTTP_200_OK)
        
    except Appointment.DoesNotExist:
        return Response(
            {'detail': 'Randevu bulunamadı.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Randevu iptal hatası: {str(e)}", exc_info=True)
        return Response(
            {'detail': f'Randevu iptal edilirken bir hata oluştu: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request password reset - send email with reset link"""
    try:
        email = request.data.get('email', '').strip()
        username = request.data.get('username', '').strip()
        
        if not email and not username:
            return Response(
                {'detail': 'E-posta adresi veya kullanıcı adı gereklidir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kullanıcıyı bul
        try:
            if email:
                user = CustomUser.objects.get(email=email, is_active=True)
            else:
                user = CustomUser.objects.get(username=username, is_active=True)
        except CustomUser.DoesNotExist:
            # Güvenlik nedeniyle aynı mesajı döndür
            return Response(
                {'detail': 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderilmiştir.'},
                status=status.HTTP_200_OK
            )
        
        # Eski token'ları iptal et
        from core.models import PasswordResetToken
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
        
        # Yeni token oluştur
        from core.utils import generate_cancel_token, send_password_reset_email
        token_string = generate_cancel_token()
        expires_at = timezone.now() + timedelta(hours=24)
        
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token_string,
            expires_at=expires_at
        )
        
        # Email gönder
        try:
            send_password_reset_email(user, reset_token)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Email gönderme hatası: {str(e)}", exc_info=True)
            # Email hatası token oluşturmayı engellemez
        
        return Response(
            {'detail': 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderilmiştir.'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Şifre sıfırlama talebi hatası: {str(e)}", exc_info=True)
        return Response(
            {'detail': 'Şifre sıfırlama talebi oluşturulurken bir hata oluştu.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    try:
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '').strip()
        new_password_confirm = request.data.get('new_password_confirm', '').strip()
        
        if not token:
            return Response(
                {'detail': 'Token gereklidir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_password or not new_password_confirm:
            return Response(
                {'detail': 'Yeni şifre gereklidir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != new_password_confirm:
            return Response(
                {'detail': 'Şifreler eşleşmiyor.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'detail': 'Şifre en az 8 karakter olmalıdır.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Token'ı bul ve kontrol et
        from core.models import PasswordResetToken
        try:
            reset_token = PasswordResetToken.objects.get(token=token, used=False)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Geçersiz veya kullanılmış token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reset_token.is_valid():
            return Response(
                {'detail': 'Token süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebinde bulunun.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Şifreyi güncelle
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Token'ı kullanıldı olarak işaretle
        reset_token.used = True
        reset_token.save()
        
        return Response(
            {'detail': 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Şifre sıfırlama hatası: {str(e)}", exc_info=True)
        return Response(
            {'detail': 'Şifre sıfırlama sırasında bir hata oluştu.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for authenticated users"""
    try:
        old_password = request.data.get('old_password', '').strip()
        new_password = request.data.get('new_password', '').strip()
        new_password_confirm = request.data.get('new_password_confirm', '').strip()
        
        if not old_password or not new_password or not new_password_confirm:
            return Response(
                {'detail': 'Tüm alanlar gereklidir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != new_password_confirm:
            return Response(
                {'detail': 'Yeni şifreler eşleşmiyor.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'detail': 'Şifre en az 8 karakter olmalıdır.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eski şifre kontrolü
        user = request.user
        if not user.check_password(old_password):
            return Response(
                {'detail': 'Mevcut şifre yanlış.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Yeni şifre eski şifre ile aynı mı?
        if user.check_password(new_password):
            return Response(
                {'detail': 'Yeni şifre mevcut şifre ile aynı olamaz.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Şifreyi güncelle
        user.set_password(new_password)
        user.save()
        
        return Response(
            {'detail': 'Şifreniz başarıyla güncellendi.'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Şifre değiştirme hatası: {str(e)}", exc_info=True)
        return Response(
            {'detail': 'Şifre değiştirme sırasında bir hata oluştu.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
