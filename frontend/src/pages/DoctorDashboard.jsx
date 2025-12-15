import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentCalendar from '../components/AppointmentCalendar';
import Navbar from '../components/Navbar';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const DoctorDashboard = () => {
  const { user } = useAuth();
  
  // State for appointments
  const [appointments, setAppointments] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'working-schedule', 'leave-requests', or 'patients'
  
  // State for patients
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  
  // State for doctor info
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [allEmergencyDoctors, setAllEmergencyDoctors] = useState([]);
  
  // State for leave requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    requested_date: '',
    reason: ''
  });
  const [showLeaveRequestConfirm, setShowLeaveRequestConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State for monthly calendar (poliklinik doctors)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // SMS gönderme state
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Randevu notları ve raporlar state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState({
    patient_complaints: '',
    diagnosis: '',
    prescription: '',
    recommendations: '',
    notes: ''
  });
  const [savingNotes, setSavingNotes] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);

  // Fetch appointments assigned to the logged-in doctor
  useEffect(() => {
    fetchAppointments();
    fetchDoctorInfo();
    fetchLeaveRequests();
    fetchPatients();
  }, []);
  
  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const response = await apiClient.get('/appointments/my-patients/');
      setPatients(response.data.patients || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Hastalar yüklenemedi');
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      // Tüm doktorları al
      const doctorsResponse = await apiClient.get('/doctors/');
      const allDoctors = doctorsResponse.data;
      
      // Giriş yapan doktoru bul
      const currentDoctor = allDoctors.find(d => 
        d.user?.id === user?.id || 
        d.user_id === user?.id ||
        d.doctor_username === user?.username
      );
      
      if (currentDoctor) {
        setDoctorInfo(currentDoctor);
        
        // Eğer acil servis doktoru ise, tüm acil servis doktorlarını al
        if (currentDoctor.is_emergency_doctor) {
          const emergencyDoctors = allDoctors.filter(d => d.is_emergency_doctor);
          setAllEmergencyDoctors(emergencyDoctors);
        }
      }
    } catch (err) {
      console.error('Error fetching doctor info:', err);
    }
  };

  // Auto-hide messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/appointments/');
      setAppointments(response.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Randevular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await apiClient.get('/leave-requests/');
      setLeaveRequests(response.data);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      // Hata durumunda boş liste bırak, ekran çalışmaya devam etsin
      setLeaveRequests([]);
    }
  };

  const handleSubmitLeaveRequest = async (e) => {
    e.preventDefault();
    try {
      console.log('İzin talebi gönderiliyor:', newLeaveRequest);
      const response = await apiClient.post('/leave-requests/', newLeaveRequest);
      console.log('İzin talebi gönderildi:', response.data);
      setNewLeaveRequest({ requested_date: '', reason: '' });
      setShowLeaveRequestConfirm(true);
      setSuccess('İzin talebi başarıyla gönderildi!');
      fetchLeaveRequests();
    } catch (err) {
      console.error('Error submitting leave request:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      let errorMessage = 'İzin talebi gönderilemedi';
      
      if (err.response?.data) {
        if (err.response.data.details) {
          // Validation errors
          const details = err.response.data.details;
          const errorKeys = Object.keys(details);
          if (errorKeys.length > 0) {
            errorMessage = `Validation hatası: ${details[errorKeys[0]][0] || JSON.stringify(details)}`;
          } else {
            errorMessage = err.response.data.error || errorMessage;
          }
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (typeof err.response.data === 'object') {
          // Try to get first error message
          const firstKey = Object.keys(err.response.data)[0];
          if (firstKey && Array.isArray(err.response.data[firstKey])) {
            errorMessage = `${firstKey}: ${err.response.data[firstKey][0]}`;
          } else {
            errorMessage = JSON.stringify(err.response.data);
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(`İzin talebi gönderilemedi: ${errorMessage}`);
      setShowLeaveRequestConfirm(false);
    }
  };

  // Vardiya hesaplama fonksiyonları (AdminDashboard'dan alındı)
  const calculateShiftEnd = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHours = hours + 8;
    if (endHours >= 24) {
      endHours = endHours - 24;
    }
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getNextShift = (shiftStart, shiftEnd, isWorkingToday) => {
    if (!isWorkingToday) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow.toLocaleDateString('tr-TR'),
        time: shiftStart
      };
    }
    
    const now = new Date();
    const [startHour] = shiftStart.split(':').map(Number);
    const [endHour] = shiftEnd.split(':').map(Number);
    const currentHour = now.getHours();
    
    if (currentHour < startHour || (endHour < startHour && currentHour >= endHour)) {
      return {
        date: 'Bugün',
        time: shiftStart
      };
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow.toLocaleDateString('tr-TR'),
        time: shiftStart
      };
    }
  };

  // Hafta numarasını hesapla (yılın başından itibaren)
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const calculateShiftSchedule = (doctor, allEmergencyDoctors, targetDate = null) => {
    try {
      if (!doctor || !allEmergencyDoctors || allEmergencyDoctors.length === 0) {
        return null;
      }
      
      const sortedDoctors = [...allEmergencyDoctors].sort((a, b) => (a.id || 0) - (b.id || 0));
      const doctorIndex = sortedDoctors.findIndex(d => d.id === doctor.id);
      
      if (doctorIndex === -1) return null;
    
      // Tarih (targetDate varsa onu kullan, yoksa bugün)
      const date = targetDate || new Date();
      const todayDay = date.getDay();
      
      const leaveDays = doctor.leave_dates || [];
      const weeklyLeaveDays = leaveDays
        .map(d => new Date(d).getDay())
        .filter(day => day !== undefined);
      
      const shiftStarts = ['00:00', '08:00', '16:00'];
      const shiftsPerDay = 3;
      
      // Doktorun başlangıç vardiyası (ID'ye göre)
      const baseShiftNumber = doctorIndex % shiftsPerDay;
      
      // Hafta numarasına göre rotasyon (her hafta bir sonraki vardiyaya geç)
      const weekNumber = getWeekNumber(date);
      const shiftNumber = (baseShiftNumber + weekNumber) % shiftsPerDay;
      const shiftStart = shiftStarts[shiftNumber];
      const shiftEnd = calculateShiftEnd(shiftStart);
      
      const isWorkingToday = !weeklyLeaveDays.includes(todayDay);
      
      // Şu anki saat (sadece bugün için kontrol et)
      const now = new Date();
      const isToday = !targetDate || (targetDate.toDateString() === now.toDateString());
      let isCurrentlyWorking = false;
      
      if (isToday && isWorkingToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const [startHour, startMinute] = shiftStart.split(':').map(Number);
        const [endHour, endMinute] = shiftEnd.split(':').map(Number);
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour === 0 ? 24 * 60 : endHour * 60;
        
        if (endHour < startHour || endHour === 0) {
          isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
        } else {
          isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
        }
      }
      
      return {
        shiftStart,
        shiftEnd,
        shiftNumber: shiftNumber + 1,
        isWorkingToday,
        isCurrentlyWorking,
        weeklyLeaveDays,
        nextShift: getNextShift(shiftStart, shiftEnd, isWorkingToday)
      };
    } catch (error) {
      console.error('Error calculating shift schedule:', error);
      return null;
    }
  };

  const handleSendSMS = (appointment) => {
    setSelectedAppointment(appointment);
    setSmsMessage('');
    setShowSMSModal(true);
  };
  
  const handleAddNotes = (appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentNotes({
      patient_complaints: appointment.patient_complaints || '',
      diagnosis: appointment.diagnosis || '',
      prescription: appointment.prescription || '',
      recommendations: appointment.recommendations || '',
      notes: appointment.notes || ''
    });
    setShowNotesModal(true);
  };
  
  const handleSaveNotes = async () => {
    if (!selectedAppointment) return;
    
    try {
      setSavingNotes(true);
      setError('');
      
      const response = await apiClient.patch(`/appointments/${selectedAppointment.id}/add-notes/`, appointmentNotes);
      
      setSuccess('Notlar başarıyla kaydedildi!');
      setShowNotesModal(false);
      fetchAppointments(); // Randevuları yenile
      
      // Bildirimi 3 saniye sonra kapat
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError(err.response?.data?.detail || 'Notlar kaydedilemedi');
    } finally {
      setSavingNotes(false);
    }
  };
  
  const handleCreateReport = async () => {
    if (!selectedAppointment) return;
    
    try {
      setCreatingReport(true);
      setError('');
      
      const response = await apiClient.post(`/appointments/${selectedAppointment.id}/create-report/`, {
        report_content: reportContent || undefined
      });
      
      // Rapor oluşturulduktan sonra, görüntüleme moduna geç
      const reportData = response.data.report || {};
      setReportContent(reportData.report_content || reportContent || '');
      setSelectedAppointment({...selectedAppointment, has_medical_report: true});
      
      setSuccess('Rapor başarıyla oluşturuldu!');
      fetchAppointments(); // Randevuları yenile
      
      // Bildirimi 3 saniye sonra kapat
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err.response?.data?.detail || 'Rapor oluşturulamadı');
    } finally {
      setCreatingReport(false);
    }
  };
  
  const handleViewReport = async (appointment) => {
    try {
      // Önce rapor var mı kontrol et
      const response = await apiClient.get(`/appointments/${appointment.id}/report/`);
      // Rapor varsa görüntüleme modal'ını aç
      setReportContent(response.data.report_content || '');
      setSelectedAppointment({...appointment, has_medical_report: true});
      setShowReportModal(true);
    } catch (err) {
      console.error('Error fetching report:', err);
      if (err.response?.status === 404) {
        // Rapor yoksa, oluşturma modal'ını aç
        setReportContent('');
        setSelectedAppointment({...appointment, has_medical_report: false});
        setShowReportModal(true);
      } else {
        setError(err.response?.data?.detail || 'Rapor yüklenemedi');
      }
    }
  };
  
  const handleSendSMSToPatient = (patient) => {
    // Hasta için SMS gönderme - randevu bilgisi olmadan
    setSelectedAppointment({
      id: null,
      patient: patient.id,
      patient_name: patient.full_name,
      patient_phone: patient.phone,
      patient_username: patient.username
    });
    setSmsMessage('');
    setShowSMSModal(true);
  };

  const handleSendSMSSubmit = async () => {
    if (!smsMessage.trim()) {
      setError('Lütfen SMS mesajını girin.');
      return;
    }

    if (!selectedAppointment) return;

    try {
      setSendingSMS(true);
      setError(''); // Önceki hataları temizle
      
      // Eğer appointment id yoksa (hastadan direkt SMS), önce bir randevu bul veya oluştur
      let appointmentId = selectedAppointment.id;
      if (!appointmentId && selectedAppointment.patient) {
        // Hasta için son randevuyu bul
        const patientAppointments = appointments.filter(apt => 
          apt.patient === selectedAppointment.patient || 
          apt.patient_name === selectedAppointment.patient_name
        );
        if (patientAppointments.length > 0) {
          appointmentId = patientAppointments[0].id;
        }
      }
      
      if (!appointmentId) {
        setError('Randevu bulunamadı. Lütfen önce bir randevu oluşturun.');
        return;
      }
      
      const response = await apiClient.post(`/appointments/${appointmentId}/send-sms/`, {
        message: smsMessage
      });
      
      // Başarı mesajı göster
      setSuccess('✅ SMS başarıyla gönderildi!');
      
      // Modal'ı kapat
      setShowSMSModal(false);
      setSmsMessage('');
      setSelectedAppointment(null);
      
      // Ekranı yenile - randevuları ve hastaları tekrar yükle
      await fetchAppointments();
      await fetchPatients();
    } catch (err) {
      console.error('Error sending SMS:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'SMS gönderilemedi';
      setError(errorMessage);
    } finally {
      setSendingSMS(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setUpdating(appointmentId);
      setError('');
      setSuccess('');

      await apiClient.patch(`/appointments/${appointmentId}/`, {
        status: newStatus,
      });

      setSuccess(`Randevu ${newStatus === 'completed' ? 'tamamlandı' : newStatus} başarıyla!`);
      
      // Refresh appointments list
      await fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.status?.[0] ||
        'Randevu durumu güncelleme başarısız'
      );
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Randevular yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Toast Notification - Ekranın üstünde sabit */}
      {success && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]"
          style={{
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          <h1 className="text-3xl font-bold text-gray-900 mb-6">Doktor Paneli</h1>
          
          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'appointments', label: '📅 Randevularım' },
                { id: 'working-schedule', label: '📆 Çalışma Günlerim' },
                { id: 'patients', label: '👥 Hastalarım' },
                { id: 'leave-requests', label: '📝 İzin Taleplerim' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'appointments' && (
            <>
              {/* View Mode Toggle */}
              <div className="mb-4 flex justify-end">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                      viewMode === 'table'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    📋 Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                      viewMode === 'calendar'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    📅 Takvim
                  </button>
                </div>
              </div>

              {/* Appointments Section */}
          {viewMode === 'calendar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AppointmentCalendar
                  appointments={appointments}
                  selectedDate={selectedCalendarDate}
                  onDateSelect={(date) => {
                    setSelectedCalendarDate(date);
                    setViewMode('table');
                  }}
                />
              </div>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Bugünün Randevuları</h3>
                {appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length > 0 ? (
                  <div className="space-y-2">
                    {appointments
                      .filter(apt => apt.date === new Date().toISOString().split('T')[0])
                      .map(apt => (
                        <div key={apt.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-500">
                          <p className="font-medium text-gray-900">{apt.patient_name || apt.patient_username}</p>
                          <p className="text-sm text-indigo-600 font-medium mt-1">{apt.time}</p>
                          <span
                            className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                              apt.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : apt.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {apt.status === 'completed' && 'Tamamlandı'}
                            {apt.status === 'cancelled' && 'İptal Edildi'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Bugün randevu yok</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Randevu Takvimi */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  📅 Randevu Takvimi
                </h2>
                <AppointmentCalendar
                  appointments={appointments}
                  selectedDate={selectedCalendarDate}
                  onDateSelect={setSelectedCalendarDate}
                  mode="appointments"
                />
              </div>

              {/* Randevu Tablosu */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Randevularım ({appointments.length})
                  </h2>
                </div>
                
                {updating && (
                  <div className="mb-4 text-sm text-gray-600">
                    Randevu güncelleniyor...
                  </div>
                )}

                <AppointmentTable
                  appointments={appointments}
                  onStatusChange={handleStatusChange}
                  allowedActions={['complete']}
                  onSendSMS={handleSendSMS}
                  onAddNotes={handleAddNotes}
                  onViewReport={handleViewReport}
                />
              </div>
            </div>
          )}
            </>
          )}

          {/* Çalışma Günleri Sekmesi */}
          {activeTab === 'working-schedule' && (
            <>
              {/* Poliklinik Doktoru Çalışma Günleri Takvimi */}
              {doctorInfo && !doctorInfo.is_emergency_doctor && (() => {
            // Varsayılan çalışma saatleri (Pazartesi-Cuma: 08:00-17:00, Hafta sonu: Kapalı)
            const defaultWorkingHours = {
              '0': {'start': '08:00', 'end': '17:00', 'enabled': true},  // Pazartesi
              '1': {'start': '08:00', 'end': '17:00', 'enabled': true},  // Salı
              '2': {'start': '08:00', 'end': '17:00', 'enabled': true},  // Çarşamba
              '3': {'start': '08:00', 'end': '17:00', 'enabled': true},  // Perşembe
              '4': {'start': '08:00', 'end': '17:00', 'enabled': true},  // Cuma
              '5': {'start': '08:00', 'end': '17:00', 'enabled': false}, // Cumartesi
              '6': {'start': '08:00', 'end': '17:00', 'enabled': false}  // Pazar
            };
            
            const workingHours = doctorInfo.working_hours && Object.keys(doctorInfo.working_hours).length > 0 
              ? doctorInfo.working_hours 
              : defaultWorkingHours;
            const leaveDays = doctorInfo.leave_dates || [];
            
            // Tarih için çalışma saatlerini al
            const getWorkingHoursForDate = (date) => {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      const dateStr = `${year}-${month}-${day}`;
              const dayOfWeek = date.getDay();
              // JavaScript'te 0=Pazar, ama backend'de 0=Pazartesi
              // Backend'deki format: 0=Pazartesi, 1=Salı, ..., 6=Pazar
              // JavaScript'teki format: 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
              const backendDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              
              // Spesifik tarih izin kontrolü
              const isSpecificDateLeave = leaveDays.some(leaveDate => {
                if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  return leaveDate === dateStr;
                }
                return false;
              });
              
              if (isSpecificDateLeave) return null;
              
              const dayData = workingHours[String(backendDayIndex)];
              if (dayData && dayData.enabled) {
                return {
                  start: dayData.start || '08:00',
                  end: dayData.end || '17:00'
                };
              }
              return null;
            };
            
            const getDayName = (dayIndex) => {
              const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
              return days[dayIndex];
            };
            
            return (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📅 Çalışma Günlerim
                </h2>
                
                {/* Haftalık Takvim */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">📆 Haftalık Çalışma Takvimi</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Gün</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Tarih</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Durum</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Çalışma Saatleri</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = [];
                          const today = new Date();
                          const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                          
                          for (let i = 0; i < 7; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() + i);
                            const dayOfWeek = date.getDay();
                            const isToday = i === 0;
                            const workingHoursForDay = getWorkingHoursForDate(date);
                            const isWorkingDay = workingHoursForDay !== null;
                            
                            // Şu anki saatte çalışıyor mu?
                            let isCurrentlyWorking = false;
                            if (isWorkingDay && isToday) {
                              const now = new Date();
                              const currentHour = now.getHours();
                              const currentMinute = now.getMinutes();
                              const [startHour, startMinute] = workingHoursForDay.start.split(':').map(Number);
                              const [endHour, endMinute] = workingHoursForDay.end.split(':').map(Number);
                              const currentTimeMinutes = currentHour * 60 + currentMinute;
                              const startTimeMinutes = startHour * 60 + startMinute;
                              const endTimeMinutes = endHour * 60 + endMinute;
                              
                              isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
                            }
                            
                            rows.push(
                              <tr 
                                key={i} 
                                className={`border-b border-gray-100 hover:bg-gray-50 ${
                                  isToday ? 'bg-blue-50' : ''
                                }`}
                              >
                                <td className="px-4 py-3 font-medium text-gray-700">
                                  {dayNames[dayOfWeek]}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600 border-l border-gray-200">
                                  {date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                                </td>
                                <td className="px-4 py-3 text-center border-l border-gray-200">
                                  {!isWorkingDay ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium border border-yellow-200">
                                      🏖️ İzin / Kapalı
                                    </span>
                                  ) : isCurrentlyWorking ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium border border-green-200">
                                      🟢 Çalışıyorum
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">
                                      ✓ Çalışıyorum
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-700 font-medium border-l border-gray-200">
                                  {isWorkingDay ? (
                                    <span>{workingHoursForDay.start} - {workingHoursForDay.end}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Aylık Takvim */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                      📆 Aylık Çalışma Takvimi ({new Date(selectedYear, selectedMonth).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedYear, selectedMonth - 1, 1);
                          setSelectedMonth(newDate.getMonth());
                          setSelectedYear(newDate.getFullYear());
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        ← Önceki Ay
                      </button>
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const newMonth = parseInt(e.target.value);
                          setSelectedMonth(newMonth);
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        {Array.from({ length: 15 }, (_, i) => {
                          const date = new Date();
                          date.setMonth(date.getMonth() - 2 + i);
                          return (
                            <option key={i} value={date.getMonth()}>
                              {date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedYear, selectedMonth + 1, 1);
                          setSelectedMonth(newDate.getMonth());
                          setSelectedYear(newDate.getFullYear());
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                      >
                        Sonraki Ay →
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          setSelectedMonth(today.getMonth());
                          setSelectedYear(today.getFullYear());
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                      >
                        Bugün
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs bg-gray-50 sticky left-0 z-10">Gün</th>
                            {(() => {
                              const headers = [];
                              const today = new Date();
                              const currentMonth = selectedMonth;
                              const currentYear = selectedYear;
                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              
                              for (let day = 1; day <= daysInMonth; day++) {
                                const date = new Date(currentYear, currentMonth, day);
                                const isToday = date.toDateString() === today.toDateString();
                                const dayOfWeek = date.getDay();
                                const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                                
                                headers.push(
                                  <th 
                                    key={day}
                                    className={`px-1 py-2 text-center font-semibold text-gray-700 border-l border-gray-200 ${
                                      isToday ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <div className="text-xs">{day}</div>
                                    <div className="text-xs text-gray-500">{dayNames[dayOfWeek]}</div>
                                  </th>
                                );
                              }
                              return headers;
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-2 py-2 font-medium text-gray-700 text-xs bg-gray-50 sticky left-0 z-10">
                              Çalışma Saatleri
                            </td>
                            {(() => {
                              const cells = [];
                              const today = new Date();
                              const currentMonth = selectedMonth;
                              const currentYear = selectedYear;
                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              
                              for (let day = 1; day <= daysInMonth; day++) {
                                const date = new Date(currentYear, currentMonth, day);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const dayNum = String(date.getDate()).padStart(2, '0');
                                const dateStr = `${year}-${month}-${dayNum}`;
                                const isToday = date.toDateString() === today.toDateString();
                                const workingHoursForDay = getWorkingHoursForDate(date);
                                const isWorkingDay = workingHoursForDay !== null;
                                
                                cells.push(
                                  <td 
                                    key={day}
                                    className={`px-1 py-2 text-center border-l border-gray-100 ${
                                      isToday ? 'bg-blue-50' : ''
                                    }`}
                                  >
                                    {isWorkingDay ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                          {workingHoursForDay.start}
                                        </span>
                                        <span className="text-xs text-gray-500">-</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                          {workingHoursForDay.end}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs text-yellow-600">🏖️</span>
                                        <span className="text-xs text-gray-400">İzin</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              }
                              return cells;
                            })()}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

              {/* Acil Servis Doktoru Vardiya Bilgileri */}
              {doctorInfo?.is_emergency_doctor && (() => {
            // Bugün için vardiya bilgisi
            const today = new Date();
            const shiftInfo = calculateShiftSchedule(doctorInfo, allEmergencyDoctors, today);
            if (!shiftInfo) return null;
            
            const getDayName = (dayIndex) => {
              const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
              return days[dayIndex];
            };
            
            // İzin günlerini al
            const leaveDays = doctorInfo.leave_dates || [];
            const weeklyLeaveDays = leaveDays
              .map(date => new Date(date).getDay())
              .filter(day => day !== undefined);
            
            return (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🚨 Acil Servis Vardiya Bilgilerim
                </h2>
                
                {/* Genişletilmiş Vardiya Takvimi (4 Hafta) */}
                <div className="mb-4 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">📅 Vardiya Takvimim (4 Hafta)</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 text-xs">Hafta</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Pzt</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Sal</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Çar</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Per</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Cum</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Cmt</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 text-xs border-l border-gray-200">Paz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = [];
                          const today = new Date();
                          const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                          
                          // 4 hafta göster
                          for (let week = 0; week < 4; week++) {
                            const weekStart = new Date(today);
                            weekStart.setDate(today.getDate() - today.getDay() + 1 + (week * 7)); // Pazartesi'den başla
                            
                            const weekNumber = getWeekNumber(weekStart);
                            const isCurrentWeek = week === 0;
                            
                            const weekDays = [];
                            for (let day = 0; day < 7; day++) {
                              const date = new Date(weekStart);
                              date.setDate(weekStart.getDate() + day);
                              const dayOfWeek = date.getDay();
                              const isToday = date.toDateString() === today.toDateString();
                              const isLeaveDay = weeklyLeaveDays.includes(dayOfWeek);
                              
                              // Bu tarih için vardiya bilgisini hesapla (rotasyon için)
                              const dayShiftInfo = calculateShiftSchedule(doctorInfo, allEmergencyDoctors, date);
                              if (!dayShiftInfo) {
                                weekDays.push(
                                  <td key={day} className="px-2 py-2 text-center border-l border-gray-100">
                                    <span className="text-gray-300">-</span>
                                  </td>
                                );
                                continue;
                              }
                              
                              // Vardiya rengi
                              const shiftColors = {
                                1: 'bg-blue-100 text-blue-700 border-blue-200', // Vardiya 1
                                2: 'bg-green-100 text-green-700 border-green-200', // Vardiya 2
                                3: 'bg-purple-100 text-purple-700 border-purple-200' // Vardiya 3
                              };
                              
                              weekDays.push(
                                <td 
                                  key={day}
                                  className={`px-2 py-2 text-center border-l border-gray-100 ${
                                    isToday ? 'bg-yellow-50' : ''
                                  }`}
                                >
                                  {isLeaveDay ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-yellow-600">🏖️</span>
                                      <span className="text-xs text-gray-400">İzin</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`text-xs px-1.5 py-0.5 rounded border ${shiftColors[dayShiftInfo.shiftNumber] || 'bg-gray-100 text-gray-700'}`}>
                                        V{dayShiftInfo.shiftNumber}
                                      </span>
                                      <span className="text-xs text-gray-600 font-medium">
                                        {dayShiftInfo.shiftStart}-{dayShiftInfo.shiftEnd}
                                      </span>
                                      {isToday && (
                                        <span className="text-xs text-blue-600 font-bold">●</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            }
                            
                            rows.push(
                              <tr 
                                key={week}
                                className={`border-b border-gray-100 hover:bg-gray-50 ${
                                  isCurrentWeek ? 'bg-blue-50' : ''
                                }`}
                              >
                                <td className="px-3 py-2 font-medium text-gray-700 text-xs">
                                  Hafta {weekNumber}
                                  {isCurrentWeek && <span className="ml-1 text-blue-600">●</span>}
                                </td>
                                {weekDays}
                              </tr>
                            );
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                      <span>Vardiya 1 (00:00-08:00)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                      <span>Vardiya 2 (08:00-16:00)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
                      <span>Vardiya 3 (16:00-00:00)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">🏖️</span>
                      <span>İzin Günü</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-bold">●</span>
                      <span>Bugün</span>
                    </div>
                  </div>
                </div>
                
                {/* Bu Hafta Detay Tablosu */}
                <div className="mb-4 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">📋 Bu Hafta Detay</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Gün</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Tarih</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Durum</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">Çalışma Saatleri</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = [];
                          const today = new Date();
                          const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                          
                          for (let i = 0; i < 7; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() + i);
                            const dayOfWeek = date.getDay();
                            const isToday = i === 0;
                            const isLeaveDay = weeklyLeaveDays.includes(dayOfWeek);
                            
                            // Bu tarih için vardiya bilgisini hesapla (rotasyon için)
                            const dayShiftInfo = calculateShiftSchedule(doctorInfo, allEmergencyDoctors, date);
                            if (!dayShiftInfo) continue;
                            
                            // Şu anki saatte çalışıyor mu?
                            let isCurrentlyWorking = false;
                            if (!isLeaveDay && isToday) {
                              const now = new Date();
                              const currentHour = now.getHours();
                              const currentMinute = now.getMinutes();
                              const [startHour] = dayShiftInfo.shiftStart.split(':').map(Number);
                              const [endHour] = dayShiftInfo.shiftEnd.split(':').map(Number);
                              const currentTimeMinutes = currentHour * 60 + currentMinute;
                              const startTimeMinutes = startHour * 60;
                              const endTimeMinutes = endHour === 0 ? 24 * 60 : endHour * 60;
                              
                              if (endHour < startHour || endHour === 0) {
                                isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
                              } else {
                                isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
                              }
                            }
                            
                            rows.push(
                              <tr 
                                key={i} 
                                className={`border-b border-gray-100 hover:bg-gray-50 ${
                                  isToday ? 'bg-blue-50' : ''
                                }`}
                              >
                                <td className="px-4 py-3 font-medium text-gray-700">
                                  {dayNames[dayOfWeek]}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600 border-l border-gray-200">
                                  {date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                                </td>
                                <td className="px-4 py-3 text-center border-l border-gray-200">
                                  {isLeaveDay ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium border border-yellow-200">
                                      🏖️ İzin
                                    </span>
                                  ) : isCurrentlyWorking ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium border border-green-200">
                                      🟢 Çalışıyorum
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">
                                      ✓ Çalışıyorum
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-700 font-medium border-l border-gray-200">
                                  {isLeaveDay ? (
                                    <span className="text-gray-400">-</span>
                                  ) : (
                                    <span>{dayShiftInfo.shiftStart} - {dayShiftInfo.shiftEnd}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Vardiya Özet Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2 text-sm">📅 Vardiya</h3>
                    <p className="text-lg font-bold text-gray-800">{shiftInfo.shiftNumber}. Vardiya</p>
                    <p className="text-xs text-gray-500 mt-1">{shiftInfo.shiftStart} - {shiftInfo.shiftEnd}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2 text-sm">⏱️ Süre</h3>
                    <p className="text-lg font-bold text-gray-800">8 saat</p>
                    <p className="text-xs text-gray-500 mt-1">Çalışma / 16 saat dinlenme</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-2 text-sm">📊 Durum</h3>
                    <p className={`text-sm font-medium ${
                      shiftInfo.isCurrentlyWorking ? 'text-green-700' : 
                      shiftInfo.isWorkingToday ? 'text-blue-700' : 'text-yellow-700'
                    }`}>
                      {shiftInfo.isCurrentlyWorking ? '🟢 Şu anda çalışıyorum' : 
                       shiftInfo.isWorkingToday ? '⚪ Bugün çalışıyorum' : 
                       '🏖️ Bugün izin günüm'}
                    </p>
                    {shiftInfo.nextShift && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sonraki: {shiftInfo.nextShift.date} {shiftInfo.nextShift.time}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
            </>
          )}

          {/* Hastalarım Sekmesi */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  👥 Hastalarım ({patients.length})
                </h2>
                
                {loadingPatients ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Hastalar yükleniyor...</p>
                  </div>
                ) : patients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz hasta bulunmamaktadır.</p>
                ) : (
                  <div className="space-y-4">
                    {patients.map((patient) => (
                      <div key={patient.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {patient.full_name}
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-semibold">📧 Email:</span> {patient.email || 'N/A'}
                              </div>
                              <div>
                                <span className="font-semibold">📱 Telefon:</span> {patient.phone || 'N/A'}
                              </div>
                              <div>
                                <span className="font-semibold">🆔 Kimlik No:</span> {patient.national_id || 'N/A'}
                              </div>
                              <div>
                                <span className="font-semibold">📅 Toplam Randevu:</span> {patient.appointment_count}
                              </div>
                              {patient.last_appointment_date && (
                                <div>
                                  <span className="font-semibold">📆 Son Randevu:</span>{' '}
                                  {new Date(patient.last_appointment_date).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </div>
                            
                            {/* Geçmiş SMS Mesajları */}
                            {patient.sms_messages && patient.sms_messages.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-700 mb-2">📱 Geçmiş SMS Mesajları:</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {patient.sms_messages.map((sms) => (
                                    <div key={sms.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="text-gray-500 text-xs">
                                          {new Date(sms.sent_at).toLocaleString('tr-TR')}
                                        </span>
                                      </div>
                                      <p className="text-gray-800">{sms.message}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-4">
                            <button
                              onClick={() => handleSendSMSToPatient(patient)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                              📱 SMS Gönder
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* İzin Talepleri Sekmesi */}
          {activeTab === 'leave-requests' && (
            <div className="space-y-6">
              {/* Onay Modal */}
              {showLeaveRequestConfirm && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center"
                  onClick={() => setShowLeaveRequestConfirm(false)}
                >
                  <div 
                    className="relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-center w-20 h-20 mx-auto bg-green-100 rounded-full mb-6">
                        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">✅ İzin Talebi Alındı!</h3>
                      <p className="text-gray-700 text-center mb-8 text-lg">
                        İzin talebiniz başarıyla gönderildi.<br />
                        <span className="font-semibold text-indigo-600">Yönetici onayı bekleniyor.</span>
                      </p>
                      <button
                        onClick={() => setShowLeaveRequestConfirm(false)}
                        className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold text-lg transition-colors"
                      >
                        Tamam
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* İzin Talep Formu */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Yeni İzin Talebi</h2>
                <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
                  <div className="relative">
                    <label htmlFor="requested_date" className="block text-sm font-medium text-gray-700 mb-2">
                      İzin Tarihi *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="requested_date"
                        required
                        readOnly
                        value={newLeaveRequest.requested_date ? new Date(newLeaveRequest.requested_date + 'T00:00:00').toLocaleDateString('tr-TR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          weekday: 'long'
                        }) : ''}
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        placeholder="Tarih seçmek için tıklayın"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        📅
                      </button>
                    </div>
                    
                    {showDatePicker && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowDatePicker(false)}
                        ></div>
                        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
                          <Calendar
                            onChange={(date) => {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateStr = `${year}-${month}-${day}`;
                              setNewLeaveRequest({ ...newLeaveRequest, requested_date: dateStr });
                              setShowDatePicker(false);
                            }}
                            value={newLeaveRequest.requested_date ? new Date(newLeaveRequest.requested_date + 'T00:00:00') : new Date()}
                            minDate={new Date()}
                            className="border-0"
                            tileDisabled={({ date }) => {
                              // Geçmiş tarihleri devre dışı bırak
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                          >
                            Kapat
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      İzin Nedeni (Opsiyonel)
                    </label>
                    <textarea
                      id="reason"
                      rows={3}
                      value={newLeaveRequest.reason}
                      onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="İzin nedeninizi belirtin..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    İzin Talebi Gönder
                  </button>
                </form>
              </div>

              {/* İzin Talepleri Listesi */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">İzin Taleplerim</h2>
                {leaveRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neden</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {leaveRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(request.requested_date).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {request.reason || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status === 'approved' ? '✓ Onaylandı' :
                                 request.status === 'rejected' ? '✗ Reddedildi' :
                                 '⏳ Beklemede'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(request.created_at).toLocaleDateString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Henüz izin talebiniz bulunmamaktadır.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SMS Gönderme Modal */}
      {showSMSModal && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSMSModal(false);
            setSmsMessage('');
            setSelectedAppointment(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                📱 SMS Gönder
              </h2>
              <button
                onClick={() => {
                  setShowSMSModal(false);
                  setSmsMessage('');
                  setSelectedAppointment(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Hasta:</p>
                <p className="font-semibold text-gray-900">
                  {selectedAppointment.patient_name || selectedAppointment.patient_username || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Telefon:</p>
                <p className="font-medium text-gray-900">
                  {selectedAppointment.patient_phone || 'Telefon bilgisi yok'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Mesajı
                </label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                  rows={6}
                  placeholder="Örnek: Sayın hasta, şu ilaçları almalısınız: [ilaç adları]. Randevu tarihiniz: [tarih]. İyi günler dileriz."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {smsMessage.length} karakter
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={handleSendSMSSubmit}
                  disabled={sendingSMS || !smsMessage.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {sendingSMS ? '📤 Gönderiliyor...' : '✅ SMS Gönder'}
                </button>
                <button
                  onClick={() => {
                    setShowSMSModal(false);
                    setSmsMessage('');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                >
                  ❌ İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Randevu Notları Modal */}
      {showNotesModal && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNotesModal(false);
            setAppointmentNotes({
              patient_complaints: '',
              diagnosis: '',
              prescription: '',
              recommendations: '',
              notes: ''
            });
            setSelectedAppointment(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                📝 Randevu Notları
              </h2>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setAppointmentNotes({
                    patient_complaints: '',
                    diagnosis: '',
                    prescription: '',
                    recommendations: '',
                    notes: ''
                  });
                  setSelectedAppointment(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Hasta:</p>
                <p className="font-semibold text-gray-900">
                  {selectedAppointment.patient_name || selectedAppointment.patient_username || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Tarih:</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedAppointment.date).toLocaleDateString('tr-TR')} {selectedAppointment.time}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta Şikayetleri
                </label>
                <textarea
                  value={appointmentNotes.patient_complaints}
                  onChange={(e) => setAppointmentNotes({...appointmentNotes, patient_complaints: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Hastanın belirttiği şikayetler..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teşhis
                </label>
                <textarea
                  value={appointmentNotes.diagnosis}
                  onChange={(e) => setAppointmentNotes({...appointmentNotes, diagnosis: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Doktorun koyduğu teşhis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reçete
                </label>
                <textarea
                  value={appointmentNotes.prescription}
                  onChange={(e) => setAppointmentNotes({...appointmentNotes, prescription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Verilen ilaçlar ve dozajları..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öneriler
                </label>
                <textarea
                  value={appointmentNotes.recommendations}
                  onChange={(e) => setAppointmentNotes({...appointmentNotes, recommendations: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Doktorun önerileri ve tavsiyeleri..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genel Notlar
                </label>
                <textarea
                  value={appointmentNotes.notes}
                  onChange={(e) => setAppointmentNotes({...appointmentNotes, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  rows={3}
                  placeholder="Ek notlar..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {savingNotes ? '💾 Kaydediliyor...' : '✅ Notları Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setAppointmentNotes({
                      patient_complaints: '',
                      diagnosis: '',
                      prescription: '',
                      recommendations: '',
                      notes: ''
                    });
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ❌ İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rapor Modal */}
      {showReportModal && selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowReportModal(false);
            setReportContent('');
            setSelectedAppointment(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                📄 Muayene Raporu
              </h2>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportContent('');
                  setSelectedAppointment(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Hasta:</p>
                <p className="font-semibold text-gray-900">
                  {selectedAppointment.patient_name || selectedAppointment.patient_username || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Tarih:</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedAppointment.date).toLocaleDateString('tr-TR')} {selectedAppointment.time}
                </p>
              </div>

              {selectedAppointment.has_medical_report || reportContent ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rapor İçeriği
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 whitespace-pre-wrap min-h-[200px]">
                      {reportContent || 'Rapor içeriği yükleniyor...'}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        // PDF indirme (ileride eklenebilir)
                        window.print();
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      🖨️ Yazdır
                    </button>
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setReportContent('');
                        setSelectedAppointment(null);
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      ❌ Kapat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rapor İçeriği (Opsiyonel - Boş bırakılırsa notlardan oluşturulur)
                    </label>
                    <textarea
                      value={reportContent}
                      onChange={(e) => setReportContent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                      rows={10}
                      placeholder="Rapor içeriğini buraya yazabilirsiniz. Boş bırakılırsa, randevu notlarından otomatik oluşturulur."
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleCreateReport}
                      disabled={creatingReport}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      {creatingReport ? '📄 Oluşturuluyor...' : '✅ Rapor Oluştur'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setReportContent('');
                        setSelectedAppointment(null);
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      ❌ İptal
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
