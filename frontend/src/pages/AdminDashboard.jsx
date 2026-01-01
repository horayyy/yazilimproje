import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentCalendar from '../components/AppointmentCalendar';
import Navbar from '../components/Navbar';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  
  // State for appointments
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  
  // State for departments
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '', appointment_fee: 500.00 });
  const [editingDept, setEditingDept] = useState(null);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false); // Bölüm düzenleme modal'ı için
  const [editDeptForm, setEditDeptForm] = useState({ name: '', description: '', appointment_fee: 500.00 }); // Modal için ayrı form state
  
  // State for doctors
  const [doctors, setDoctors] = useState([]);
  const [newDoctor, setNewDoctor] = useState({ 
    username: '', 
    email: '', 
    first_name: '', 
    last_name: '', 
    phone: '', 
    password: '',
    department: '', 
    title: '',
    is_emergency_doctor: false,
    working_hours: {},
    leave_dates: []
  });
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDoctorForm, setEditDoctorForm] = useState({ 
    username: '', 
    email: '', 
    first_name: '', 
    last_name: '', 
    phone: '', 
    password: '',
    department: '', 
    title: '',
    is_emergency_doctor: false,
    working_hours: {},
    leave_dates: []
  }); // Modal için ayrı form state
  const [showEditModal, setShowEditModal] = useState(false); // Modal gösterimi için
  const [editingLeaveDays, setEditingLeaveDays] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // İzin günlerini düzenleyen doktor
  const [editingWorkingHours, setEditingWorkingHours] = useState(false);
  const [editingLeaveDates, setEditingLeaveDates] = useState(false);
  const [calendarDoctor, setCalendarDoctor] = useState(null); // Takvim görüntülenen doktor
  
  // State for statistics
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
  });
  
  // State for emergency service
  const [emergencyService, setEmergencyService] = useState(null);
  const [emergencyServiceForm, setEmergencyServiceForm] = useState({
    is_active: true,
    status: 'open',
    phone: '',
    address: '',
    notes: '',
    is_24_7: true
  });
  
  // State for leave requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingLeaveRequest, setProcessingLeaveRequest] = useState(null);
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Apply filters whenever appointments or filter values change
  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterStatus]);

  // Auto-hide messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Modal'ı editingDoc null olduğunda kapat
  useEffect(() => {
    if (!editingDoc && showEditModal) {
      setShowEditModal(false);
    }
  }, [editingDoc, showEditModal]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [appointmentsRes, departmentsRes, doctorsRes, emergencyRes, leaveRequestsRes] = await Promise.all([
        apiClient.get('/appointments/'),
        apiClient.get('/departments/'),
        apiClient.get('/doctors/'),
        apiClient.get('/emergency-service/').catch(() => ({ data: [] })), // Optional
        apiClient.get('/leave-requests/').catch(() => ({ data: [] })), // Optional
      ]);
      
      // Handle both array response and paginated response
      const appointmentsData = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : (appointmentsRes.data.results || []);
      const leaveRequestsData = Array.isArray(leaveRequestsRes.data) ? leaveRequestsRes.data : (leaveRequestsRes.data.results || []);
      const departmentsData = Array.isArray(departmentsRes.data) ? departmentsRes.data : (departmentsRes.data.results || []);
      const doctorsData = Array.isArray(doctorsRes.data) ? doctorsRes.data : (doctorsRes.data.results || []);
      
      setAppointments(appointmentsData);
      calculateStats(appointmentsData);
      setLeaveRequests(leaveRequestsData);
      setDepartments(departmentsData);
      setDoctors(doctorsData);
      
      // Emergency service - get first item or create default
      if (emergencyRes.data && emergencyRes.data.length > 0) {
        const emergency = emergencyRes.data[0];
        setEmergencyService(emergency);
        setEmergencyServiceForm({
          is_active: emergency.is_active,
          status: emergency.status,
          phone: emergency.phone || '',
          address: emergency.address || '',
          notes: emergency.notes || '',
          is_24_7: emergency.is_24_7
        });
      } else {
        // Fetch current endpoint
        try {
          const currentRes = await apiClient.get('/emergency-service/current/');
          setEmergencyService(currentRes.data);
          setEmergencyServiceForm({
            is_active: currentRes.data.is_active,
            status: currentRes.data.status,
            phone: currentRes.data.phone || '',
            address: currentRes.data.address || '',
            notes: currentRes.data.notes || '',
            is_24_7: currentRes.data.is_24_7
          });
        } catch (e) {
          console.error('Emergency service fetch error:', e);
        }
      }
    } catch (err) {
      console.error('Hata:', err);
      setError('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (appointmentList) => {
    const stats = {
      totalAppointments: appointmentList.length,
      completedAppointments: appointmentList.filter(a => a.status === 'completed').length,
      cancelledAppointments: appointmentList.filter(a => a.status === 'cancelled').length,
    };
    setStats(stats);
  };

  // Hafta numarasını hesapla (yılın başından itibaren)
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Acil servis doktorları için vardiya hesaplama fonksiyonları
  const calculateShiftSchedule = (doctor, allEmergencyDoctors, targetDate = null) => {
    try {
      if (!doctor || !allEmergencyDoctors || allEmergencyDoctors.length === 0) {
        return null;
      }
      
      // Acil servis doktorlarını sırala (ID'ye göre)
      const sortedDoctors = [...allEmergencyDoctors].sort((a, b) => (a.id || 0) - (b.id || 0));
      const doctorIndex = sortedDoctors.findIndex(d => d.id === doctor.id);
      
      if (doctorIndex === -1) return null;
    
    // Tarih (targetDate varsa onu kullan, yoksa bugün)
    const date = targetDate || new Date();
    const todayDay = date.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
    
    // İzin günleri kontrolü
    const leaveDays = doctor.leave_dates || [];
    
    // Tarihi YYYY-MM-DD formatına çevir (timezone sorununu önlemek için)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Önce spesifik tarih kontrolü yap (YYYY-MM-DD formatında)
    const isSpecificDateLeave = leaveDays.some(leaveDate => {
      if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return leaveDate === dateStr;
      }
      return false;
    });
    
    // Haftalık izin günleri (haftada 2 gün)
    const weeklyLeaveDays = leaveDays
      .map(d => {
        // Eğer string ise ve YYYY-MM-DD formatında değilse, day of week olarak kabul et
        if (typeof d === 'string' && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? parseInt(d) : parsed.getDay();
        } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // YYYY-MM-DD formatındaysa day of week'e çevir
          return new Date(d).getDay();
        } else if (typeof d === 'number') {
          return d;
        }
        return new Date(d).getDay();
      })
      .filter(day => day !== undefined && !isNaN(day));
    
    // Vardiya başlangıç saatleri (8 saatlik vardiyalar)
    const shiftStarts = ['00:00', '08:00', '16:00'];
    const shiftsPerDay = 3; // Günde 3 vardiya (8 saat x 3 = 24 saat)
    
    // Doktorun başlangıç vardiyası (ID'ye göre)
    const baseShiftNumber = doctorIndex % shiftsPerDay;
    
    // Hafta numarasına göre rotasyon (her hafta bir sonraki vardiyaya geç)
    const weekNumber = getWeekNumber(date);
    const shiftNumber = (baseShiftNumber + weekNumber) % shiftsPerDay;
    const shiftStart = shiftStarts[shiftNumber];
    
    // Vardiya bitiş saati (8 saat sonra)
    const shiftEnd = calculateShiftEnd(shiftStart);
    
    // Bugün çalışıyor mu? (spesifik tarih izni veya haftalık izin günü değilse)
    const isWorkingToday = !isSpecificDateLeave && !weeklyLeaveDays.includes(todayDay);
    
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
        // Gece vardiyası (örn: 16:00 - 00:00)
        isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
      } else {
        // Gündüz vardiyası
        isCurrentlyWorking = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
      }
    }
    
      return {
        shiftStart,
        shiftEnd,
        shiftNumber: shiftNumber + 1, // 1, 2, veya 3
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
      // İzin günü, yarınki vardiyayı göster
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow.toLocaleDateString('tr-TR'),
        time: shiftStart
      };
    }
    
    // Bugün çalışıyor, bir sonraki vardiyayı hesapla
    const now = new Date();
    const [startHour] = shiftStart.split(':').map(Number);
    const [endHour] = shiftEnd.split(':').map(Number);
    const currentHour = now.getHours();
    
    if (currentHour < startHour || (endHour < startHour && currentHour >= endHour)) {
      // Henüz vardiya başlamadı
      return {
        date: 'Bugün',
        time: shiftStart
      };
    } else {
      // Vardiya devam ediyor veya bitti, yarınki vardiyayı göster
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        date: tomorrow.toLocaleDateString('tr-TR'),
        time: shiftStart
      };
    }
  };
  
  // Belirli bir gün ve saatte hangi doktorların çalıştığını bul
  const getDoctorsForShift = (date, shiftStart, allEmergencyDoctors) => {
    const dayOfWeek = date.getDay();
    const workingDoctors = [];
    
    // Tarihi YYYY-MM-DD formatına çevir (timezone sorununu önlemek için)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    allEmergencyDoctors.forEach((doctor) => {
      // O tarih için vardiya bilgisini hesapla
      const shiftInfo = calculateShiftSchedule(doctor, allEmergencyDoctors, date);
      if (!shiftInfo) return;
      
      // İzin günü kontrolü
      const leaveDays = doctor.leave_dates || [];
      
      // Önce spesifik tarih kontrolü yap (YYYY-MM-DD formatında)
      const isSpecificDateLeave = leaveDays.some(leaveDate => {
        // Eğer string ise ve YYYY-MM-DD formatındaysa kontrol et
        if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return leaveDate === dateStr;
        }
        return false;
      });
      
      if (isSpecificDateLeave) return; // Spesifik tarih izni
      
      // Haftalık izin günleri kontrolü (day of week)
      const weeklyLeaveDays = leaveDays
        .map(d => {
          // Eğer string ise ve YYYY-MM-DD formatında değilse, day of week olarak kabul et
          if (typeof d === 'string' && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? parseInt(d) : parsed.getDay();
          } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD formatındaysa day of week'e çevir
            return new Date(d).getDay();
          } else if (typeof d === 'number') {
            return d;
          }
          return new Date(d).getDay();
        })
        .filter(d => d !== undefined && !isNaN(d));
      
      if (weeklyLeaveDays.includes(dayOfWeek)) return; // Haftalık izin günü
      
      // Vardiya eşleşmesi kontrolü
      if (shiftInfo.shiftStart === shiftStart) {
        const doctorName = doctor.doctor_name || 
          (doctor.user_first_name && doctor.user_last_name ? `${doctor.user_first_name} ${doctor.user_last_name}` : '') ||
          (doctor.user?.first_name && doctor.user?.last_name ? `${doctor.user.first_name} ${doctor.user.last_name}` : '') ||
          doctor.doctor_username || 
          'İsim bilgisi yok';
        workingDoctors.push(doctorName);
      }
    });
    
    return workingDoctors;
  };

  const getDayName = (dayIndex) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[dayIndex];
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    if (filterDate) {
      filtered = filtered.filter((apt) => apt.date === filterDate);
    }

    if (filterStatus) {
      filtered = filtered.filter((apt) => apt.status === filterStatus);
    }

    setFilteredAppointments(filtered);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.name.trim()) {
      setError('Bölüm adı gereklidir');
      return;
    }

    try {
      // Sadece yeni bölüm ekleme (düzenleme modal'dan yapılıyor)
        await apiClient.post('/departments/', newDepartment);
        setSuccess('Bölüm başarıyla eklendi!');
      setNewDepartment({ name: '', description: '', appointment_fee: 500.00 });
      fetchAllData();
    } catch (err) {
      setError('Bölüm eklenemedi');
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDept(dept);
    setEditDeptForm({ name: dept.name, description: dept.description || '', appointment_fee: dept.appointment_fee || 500.00 });
    setShowEditDeptModal(true);
  };

  const handleCancelEditDept = () => {
    setEditingDept(null);
    setShowEditDeptModal(false);
    setEditDeptForm({ name: '', description: '', appointment_fee: 500.00 });
    setNewDepartment({ name: '', description: '', appointment_fee: 500.00 });
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!editDeptForm.name.trim()) {
      setError('Bölüm adı gereklidir');
      return;
    }

    try {
      await apiClient.patch('/departments/' + editingDept.id + '/', editDeptForm);
      setSuccess('Bölüm başarıyla güncellendi!');
      setEditingDept(null);
      setShowEditDeptModal(false);
      setEditDeptForm({ name: '', description: '', appointment_fee: 500.00 });
      fetchAllData();
    } catch (err) {
      setError('Bölüm güncellenemedi');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Bu bölümü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await apiClient.delete('/departments/' + deptId + '/');
      setSuccess('Bölüm başarıyla silindi!');
      fetchAllData();
    } catch (err) {
      setError('Bölüm silinemedi');
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    // Modal'dan mı yoksa ekleme formundan mı geldiğini kontrol et
    const isFromModal = showEditModal && editingDoc;
    const formData = isFromModal ? editDoctorForm : newDoctor;
    
    if (!formData.username.trim() || !formData.email.trim() || 
        !formData.first_name.trim() || !formData.last_name.trim() || 
        (!editingDoc && !formData.password.trim())) {
      setError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    // Acil servis doktorları tab'ındaysa otomatik olarak is_emergency_doctor = true yap
    const isEmergencyTab = activeTab === 'emergency-doctors';
    const doctorData = {
      ...formData,
      is_emergency_doctor: isEmergencyTab ? true : (formData.is_emergency_doctor || false)
    };

    // Eğer düzenleme modundaysa, editingDoc'u sakla ve modal'ı kapat
    const wasEditing = !!editingDoc;
    const currentEditingDoc = editingDoc; // editingDoc null olmadan ÖNCE sakla
    
    if (wasEditing) {
      setShowEditModal(false);
      setEditingDoc(null);
    }
    
    try {
      if (wasEditing && currentEditingDoc) {
        // Update doctor - update user info and doctor profile
        const updateData = {
          department: (doctorData.department && doctorData.department !== '') ? parseInt(doctorData.department) : null,
          title: doctorData.title || '',
          is_emergency_doctor: doctorData.is_emergency_doctor || false,
          working_hours: doctorData.working_hours || {},
          leave_dates: doctorData.leave_dates || [],
        };
        // User bilgilerini de updateData'ya ekle (backend'de custom update metodu var)
        const fullUpdateData = {
          ...updateData,
          user_first_name: doctorData.first_name,
          user_last_name: doctorData.last_name,
          user_email: doctorData.email,
          user_phone: doctorData.phone || '',
        };
        
        await apiClient.patch('/doctors/' + currentEditingDoc.id + '/', fullUpdateData);
        
        setSuccess('Doktor başarıyla güncellendi!');
        
        // Modal form'unu temizle (arka plandaki ekleme formunu etkileme)
        setEditDoctorForm({ 
          username: '', 
          email: '', 
          first_name: '', 
          last_name: '', 
          phone: '', 
          password: '',
          department: '', 
          title: '',
          is_emergency_doctor: false,
          working_hours: {},
          leave_dates: []
        });
        
        // Verileri yenile - loading göstermeden
        try {
          const [appointmentsRes, departmentsRes, doctorsRes] = await Promise.all([
            apiClient.get('/appointments/'),
            apiClient.get('/departments/'),
            apiClient.get('/doctors/'),
          ]);
          
          // Handle both array response and paginated response
          const appointmentsData = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : (appointmentsRes.data.results || []);
          const departmentsData = Array.isArray(departmentsRes.data) ? departmentsRes.data : (departmentsRes.data.results || []);
          const doctorsData = Array.isArray(doctorsRes.data) ? doctorsRes.data : (doctorsRes.data.results || []);
          
          setAppointments(appointmentsData);
          calculateStats(appointmentsData);
          setDepartments(departmentsData);
          setDoctors(doctorsData);
        } catch (fetchErr) {
          console.error('Fetch error:', fetchErr);
          // Hata olsa bile verileri yeniden yükle
          fetchAllData();
        }
      } else {
        // Create doctor
        await apiClient.post('/doctors/', doctorData);
        setSuccess('Doktor başarıyla eklendi!');
        
        // Form'u temizle
        setNewDoctor({ 
          username: '', 
          email: '', 
          first_name: '', 
          last_name: '', 
          phone: '', 
          password: '',
          department: '', 
          title: '',
          is_emergency_doctor: false,
          working_hours: {},
          leave_dates: []
        });
        
        await fetchAllData();
      }
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Bilinmeyen hata';
      setError(wasEditing ? `Doktor güncellenemedi: ${errorMessage}` : `Doktor eklenemedi: ${errorMessage}`);
      // Hata durumunda modal'ı kapatma, kullanıcı hatayı görebilsin
      if (wasEditing) {
        // Hata durumunda modal'ı tekrar aç
        setShowEditModal(true);
        setEditingDoc(currentEditingDoc);
      }
    }
  };

  const handleEditDoctor = (doc) => {
    setEditingDoc(doc);
    // Modal için ayrı form state kullan, arka plandaki ekleme formunu etkileme
    setEditDoctorForm({
      username: doc.doctor_username || doc.user?.username || '',
      email: doc.user_email || doc.user?.email || '',
      first_name: doc.user_first_name || doc.user?.first_name || '',
      last_name: doc.user_last_name || doc.user?.last_name || '',
      phone: doc.user_phone || doc.user?.phone || '',
      password: '',
      department: doc.department || '',
      title: doc.title || '',
      is_emergency_doctor: doc.is_emergency_doctor || false,
      working_hours: doc.working_hours || {},
      leave_dates: doc.leave_dates || []
    });
    setShowEditModal(true);
  };

  const handleCancelEditDoc = () => {
    setShowEditModal(false);
    setEditingDoc(null);
    setEditDoctorForm({ 
      username: '', 
      email: '', 
      first_name: '', 
      last_name: '', 
      phone: '', 
      password: '',
      department: '', 
      title: '',
      is_emergency_doctor: false,
      working_hours: {},
      leave_dates: []
    });
  };
  
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDoc(null);
  };

  const handleDeleteDoctor = async (docId) => {
    if (!window.confirm('Bu doktoru silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await apiClient.delete('/doctors/' + docId + '/');
      setSuccess('Doktor başarıyla silindi!');
      fetchAllData();
    } catch (err) {
      setError('Doktor silinemedi');
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await apiClient.patch('/appointments/' + appointmentId + '/', {
        status: newStatus,
      });
      setSuccess('Randevu durumu güncellendi!');
      fetchAllData();
    } catch (err) {
      setError('Randevu durumu güncellenemedi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Paneli</h1>
        
          {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'appointments', label: '📅 Randevular' },
                { id: 'revenue', label: '💰 Gelir / Maliye' },
                { id: 'departments', label: '🏥 Bölümler' },
              { id: 'poliklinik-doctors', label: '🏥 Poliklinik Doktorları' },
              { id: 'emergency-doctors', label: '🚨 Acil Servis Doktorları' },
              { id: 'emergency', label: '🚨 Acil Servis' },
              { id: 'leave-requests', label: '📝 İzin İşlemleri' },
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

        {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
                  <div>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Toplam Randevu</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalAppointments}</p>
                  </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Tamamlanan</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completedAppointments}</p>
                  </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">İptal Edilen</p>
                    <p className="text-3xl font-bold text-red-600">{stats.cancelledAppointments}</p>
                </div>
              </div>

            <div className="mb-4 flex gap-4">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Tüm Durumlar</option>
                <option value="completed">Tamamlanan</option>
                <option value="cancelled">İptal Edilen</option>
                    </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Tablo
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Takvim
                </button>
                  </div>
                  </div>

            {viewMode === 'table' ? (
                <AppointmentTable
                  appointments={filteredAppointments}
                  onStatusChange={handleUpdateAppointmentStatus}
                />
            ) : (
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedCalendarDate}
                onDateSelect={setSelectedCalendarDate}
                mode="appointments"
              />
            )}
                </div>
          )}

          {/* REVENUE TAB */}
          {activeTab === 'revenue' && (
            <div>
              {/* Bugünkü ve Toplam Gelir */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bugünkü Değer */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">💰 Randevu Ücretlerinin Bugünkü Değeri</h3>
                      <p className="text-3xl font-bold text-green-700">
                        {(() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const day = String(today.getDate()).padStart(2, '0');
                          const todayStr = `${year}-${month}-${day}`;
                          
                          // Bugün oluşturulan ve tamamlanan randevuları filtrele (created_at'e göre ve status='completed')
                          const todayAppointments = appointments.filter(apt => {
                            if (!apt.created_at) return false;
                            if (apt.status !== 'completed') return false; // Sadece tamamlanan randevular
                            const createdDate = new Date(apt.created_at);
                            const createdYear = createdDate.getFullYear();
                            const createdMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
                            const createdDay = String(createdDate.getDate()).padStart(2, '0');
                            const createdStr = `${createdYear}-${createdMonth}-${createdDay}`;
                            return createdStr === todayStr;
                          });
                          
                          const totalFee = todayAppointments.reduce((sum, apt) => {
                            const fee = apt.fee ? parseFloat(apt.fee) : 500.00;
                            return sum + fee;
                          }, 0);
                          return totalFee.toFixed(2);
                        })()} TL
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Bugün {(() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const day = String(today.getDate()).padStart(2, '0');
                          const todayStr = `${year}-${month}-${day}`;
                          
                          // Bugün oluşturulan ve tamamlanan randevuları filtrele (created_at'e göre ve status='completed')
                          return appointments.filter(apt => {
                            if (!apt.created_at) return false;
                            if (apt.status !== 'completed') return false; // Sadece tamamlanan randevular
                            const createdDate = new Date(apt.created_at);
                            const createdYear = createdDate.getFullYear();
                            const createdMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
                            const createdDay = String(createdDate.getDate()).padStart(2, '0');
                            const createdStr = `${createdYear}-${createdMonth}-${createdDay}`;
                            return createdStr === todayStr;
                          }).length;
                        })()} randevu tamamlandı
                      </p>
                  </div>
                    <div className="text-5xl">💰</div>
                </div>
              </div>

                {/* Toplam Değer */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">💵 Randevu Ücretlerinin Toplam Değeri</h3>
                      <p className="text-3xl font-bold text-blue-700">
                        {(() => {
                          // Tüm zamanların toplamı - sadece tamamlanan randevular
                          const completedAppointments = appointments.filter(apt => apt.status === 'completed');
                          const totalFee = completedAppointments.reduce((sum, apt) => {
                            const fee = apt.fee ? parseFloat(apt.fee) : 500.00;
                            return sum + fee;
                          }, 0);
                          return totalFee.toFixed(2);
                        })()} TL
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Toplam {appointments.filter(apt => apt.status === 'completed').length} randevu tamamlandı
                      </p>
                  </div>
                    <div className="text-5xl">💵</div>
                  </div>
                </div>
              </div>

              {/* Bölüm Ücretleri Yönetimi */}
              <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">💵 Bölüm Ücretleri Yönetimi</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Her bölüm için randevu ücreti belirleyebilirsiniz. Yeni randevular oluşturulurken doktorun bölümünün ücreti kullanılacaktır.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bölüm Adı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Açıklama
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Randevu Ücreti (TL)
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departments.map((dept) => (
                        <tr key={dept.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {dept.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {dept.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            {dept.appointment_fee ? parseFloat(dept.appointment_fee).toFixed(2) : '500.00'} TL
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                              onClick={() => handleEditDepartment(dept)}
                              className="text-indigo-600 hover:text-indigo-900 font-semibold"
                  >
                              ✏️ Düzenle
                  </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
                
              {/* Gelir Takvimi */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">💰 Günlük Gelir Takvimi</h2>
                <AppointmentCalendar
                  appointments={appointments}
                  selectedDate={selectedCalendarDate}
                  onDateSelect={setSelectedCalendarDate}
                  mode="revenue"
                    />
                  </div>
                  </div>
          )}

          {/* DEPARTMENTS TAB */}
          {activeTab === 'departments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                ➕ Yeni Bölüm Ekle
                </h2>
                <form onSubmit={handleAddDepartment} className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölüm Adı
                    </label>
                    <input
                      type="text"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    rows={3}
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Randevu Ücreti (TL)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDepartment.appointment_fee || 500.00}
                      onChange={(e) => setNewDepartment({ ...newDepartment, appointment_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      placeholder="500.00"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                    >
                      ➕ Bölüm Ekle
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Bölümler ({departments.length})</h2>
                
                {departments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz bölüm eklenmemiştir.</p>
                ) : (
                  <div className="space-y-4">
                    {departments.map((dept) => (
                    <div key={dept.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                            {dept.description && (
                              <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                            )}
                            <p className="text-sm font-semibold text-green-600 mt-2">
                              💵 Randevu Ücreti: {dept.appointment_fee ? parseFloat(dept.appointment_fee).toFixed(2) : '500.00'} TL
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditDepartment(dept)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                            >
                            Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                            >
                            Sil
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

        {/* POLIKLINIK DOCTORS TAB */}
        {activeTab === 'poliklinik-doctors' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Yeni Doktor Ekleme Formu - Sadece ekleme için */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                ➕ Yeni Poliklinik Doktoru Ekle
                </h2>
                <form onSubmit={handleAddDoctor} className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                    value={newDoctor.username}
                    onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                    disabled={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={newDoctor.first_name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={newDoctor.last_name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölüm
                    </label>
                    <select
                      value={newDoctor.department}
                      onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    >
                    <option value="">Bölüm Seçin</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unvan
                  </label>
                  <input
                    type="text"
                    value={newDoctor.title}
                    onChange={(e) => setNewDoctor({ ...newDoctor, title: e.target.value })}
                    placeholder="Örn: Uzman Doktor, Prof. Dr."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  />
                  </div>

                <div className="border-t pt-4 mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">🏥 Poliklinik Doktoru (Otomatik)</span>
                  </label>
                  <p className="text-xs text-blue-600 mt-1 ml-7">
                    Bu bölümde eklenen tüm doktorlar otomatik olarak poliklinik doktoru olarak işaretlenir.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    ➕ Doktor Ekle
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                🏥 Poliklinik Doktorları ({doctors.filter(d => !d.is_emergency_doctor).length})
              </h2>
              
              {doctors.filter(d => !d.is_emergency_doctor).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz poliklinik doktoru eklenmemiştir.</p>
              ) : (
                <div className="space-y-4">
                  {doctors.filter(d => !d.is_emergency_doctor).map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {doc.doctor_name || 
                             (doc.user_first_name && doc.user_last_name ? `${doc.user_first_name} ${doc.user_last_name}` : '') ||
                             (doc.user?.first_name && doc.user?.last_name ? `${doc.user.first_name} ${doc.user.last_name}` : '') ||
                             doc.doctor_username || 
                             'İsim bilgisi yok'}
                            {doc.title && <span className="text-sm text-gray-600 ml-2">({doc.title})</span>}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {doc.department_name || 'Bölüm atanmamış'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            E-posta: {doc.user_email || doc.user?.email || 'Belirtilmemiş'} | Telefon: {doc.user_phone || doc.user?.phone || 'Belirtilmemiş'}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditDoctor(doc)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                          >
                            Sil
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

        {/* Düzenleme Modal - Poliklinik Doktorları */}
        {showEditModal && editingDoc && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelEditDoc}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  ✏️ Poliklinik Doktorunu Düzenle
                </h2>
                <button
                  onClick={handleCancelEditDoc}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={editDoctorForm.username}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kullanıcı adı değiştirilemez</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={editDoctorForm.email}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={editDoctorForm.first_name}
                      onChange={(e) => setEditDoctorForm({ ...editDoctorForm, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={editDoctorForm.last_name}
                      onChange={(e) => setEditDoctorForm({ ...editDoctorForm, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={editDoctorForm.phone}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölüm
                  </label>
                  <select
                    value={editDoctorForm.department}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  >
                    <option value="">Bölüm Seçin</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unvan
                    </label>
                    <input
                      type="text"
                    value={editDoctorForm.title}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, title: e.target.value })}
                    placeholder="Örn: Uzman Doktor, Prof. Dr."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div className="border-t pt-4 mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-blue-700">🏥 Poliklinik Doktoru (Otomatik)</span>
                  </label>
                  <p className="text-xs text-blue-600 mt-1 ml-7">
                    Bu doktor poliklinik doktoru olarak işaretlenmiştir.
                  </p>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    ✅ Güncelle
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditDoc}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                  >
                    ❌ İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EMERGENCY DOCTORS TAB */}
        {activeTab === 'emergency-doctors' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                ➕ Yeni Acil Servis Doktoru Ekle
              </h2>
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={newDoctor.username}
                    onChange={(e) => setNewDoctor({ ...newDoctor, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                    disabled={!!(showEditModal && editingDoc && editingDoc.is_emergency_doctor)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={newDoctor.first_name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={newDoctor.last_name}
                      onChange={(e) => setNewDoctor({ ...newDoctor, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unvan
                  </label>
                  <input
                    type="text"
                      value={newDoctor.title}
                      onChange={(e) => setNewDoctor({ ...newDoctor, title: e.target.value })}
                    placeholder="Örn: Uzman Doktor, Prof. Dr."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                
                <div className="border-t pt-4 mt-4 bg-red-50 p-3 rounded border border-red-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-red-700">🚨 Acil Servis Doktoru (Otomatik)</span>
                  </label>
                  <p className="text-xs text-red-600 mt-1 ml-7">
                    Bu bölümde eklenen tüm doktorlar otomatik olarak acil servis doktoru olarak işaretlenir.
                  </p>
                </div>
                
                <div className="border-t pt-4 mt-4 bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">🚨 Acil Servis Çalışma Saatleri</p>
                  <p className="text-xs text-gray-600">
                    Acil servis doktorları 7-24 çalışır. Çalışma saatleri ayarlanmaz.
                  </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                    >
                    ➕ Acil Servis Doktoru Ekle
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                🚨 Acil Servis Doktorları ({doctors.filter(d => d.is_emergency_doctor).length})
              </h2>
                
              {doctors.filter(d => d.is_emergency_doctor).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz acil servis doktoru eklenmemiştir.</p>
                ) : (
                  <div className="space-y-4">
                  {doctors.filter(d => d.is_emergency_doctor).map((doc) => (
                    <div key={doc.id} className="border border-red-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-red-50/30">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">
                            {doc.doctor_name || 
                             (doc.user_first_name && doc.user_last_name ? `${doc.user_first_name} ${doc.user_last_name}` : '') ||
                             (doc.user?.first_name && doc.user?.last_name ? `${doc.user.first_name} ${doc.user.last_name}` : '') ||
                             doc.doctor_username || 
                             'İsim bilgisi yok'}
                            {doc.title && <span className="text-sm text-gray-600 ml-2">({doc.title})</span>}
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium border border-red-200">
                              🚨 Acil Servis
                            </span>
                            </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            E-posta: {doc.user_email || doc.user?.email || 'Belirtilmemiş'} | Telefon: {doc.user_phone || doc.user?.phone || 'Belirtilmemiş'}
                          </p>
                          
                          {/* Vardiya Bilgileri */}
                          {(() => {
                            try {
                              const shiftInfo = calculateShiftSchedule(doc, doctors.filter(d => d.is_emergency_doctor));
                              if (!shiftInfo) return null;
                              
                              return (
                                <div className="mt-2 mb-3">
                                  <p className="text-xs text-gray-500 mb-1">
                                    <span className="font-medium">Vardiya Bilgileri:</span>
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                      shiftInfo.isCurrentlyWorking 
                                        ? 'bg-green-100 text-green-700 border-green-200' 
                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                    }`}>
                                      {shiftInfo.isCurrentlyWorking ? '🟢 Çalışıyor' : '⚪ Dinleniyor'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">
                                      Vardiya {shiftInfo.shiftNumber}: {shiftInfo.shiftStart} - {shiftInfo.shiftEnd}
                                    </span>
                                    {shiftInfo.weeklyLeaveDays.length > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium border border-yellow-200">
                                        İzin: {shiftInfo.weeklyLeaveDays.map(d => getDayName(d)).join(', ')}
                                      </span>
                                    )}
                          </div>
                                </div>
                              );
                            } catch (error) {
                              console.error('Error rendering shift info:', error);
                              return null;
                            }
                          })()}
                        </div>
                        <div className="flex gap-2 ml-4">
                            <button
                            onClick={() => {
                              setActiveTab('emergency-doctors');
                              handleEditDoctor(doc);
                            }}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => setEditingLeaveDays(doc)}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
                          >
                            İzin Günleri
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doc.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                            >
                            Sil
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

        {/* İzin Günleri Düzenleme Modal */}
        {editingLeaveDays && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  🏖️ İzin Günleri Düzenle
                </h2>
                <button
                  onClick={() => setEditingLeaveDays(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
        </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData(e.target);
                  const selectedDays = [];
                  for (let i = 0; i <= 6; i++) {
                    if (formData.get(`day_${i}`) === 'on') {
                      selectedDays.push(i);
                    }
                  }
                  
                  if (selectedDays.length > 2) {
                    setError('Haftada en fazla 2 gün izin seçebilirsiniz');
                    return;
                  }
                  
                  // Haftalık izin günlerini hesapla (bugünden itibaren 7 gün)
                  const today = new Date();
                  const weeklyLeaveDates = [];
                  
                  for (let i = 0; i < 7; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    const dayOfWeek = date.getDay();
                    
                    if (selectedDays.includes(dayOfWeek)) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      weeklyLeaveDates.push(`${year}-${month}-${day}`);
                    }
                  }
                  
                  // Mevcut izin tarihlerini al ve güncelle
                  const currentLeaveDates = editingLeaveDays.leave_dates || [];
                  const updatedLeaveDates = [...currentLeaveDates, ...weeklyLeaveDates];
                  
                  await apiClient.patch('/doctors/' + editingLeaveDays.id + '/', {
                    leave_dates: updatedLeaveDates
                  });
                  
                  setSuccess('İzin günleri güncellendi!');
                  setEditingLeaveDays(null);
                  await fetchAllData();
                } catch (err) {
                  console.error('Error:', err);
                  setError('İzin günleri güncellenemedi');
                }
              }} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>{editingLeaveDays.doctor_name || (editingLeaveDays.user_first_name + ' ' + editingLeaveDays.user_last_name) || 'Doktor'}</strong> için haftalık izin günlerini seçin (en fazla 2 gün):
                  </p>
                  <div className="space-y-2">
                    {[
                      { value: 1, label: 'Pazartesi' },
                      { value: 2, label: 'Salı' },
                      { value: 3, label: 'Çarşamba' },
                      { value: 4, label: 'Perşembe' },
                      { value: 5, label: 'Cuma' },
                      { value: 6, label: 'Cumartesi' },
                      { value: 0, label: 'Pazar' }
                    ].map((day) => {
                      const currentLeaveDays = editingLeaveDays.leave_dates || [];
                      const today = new Date();
                      const isSelected = currentLeaveDays.some(date => {
                        const dateObj = new Date(date);
                        return dateObj.getDay() === day.value;
                      });
                      
                      return (
                        <label key={day.value} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            name={`day_${day.value}`}
                            defaultChecked={isSelected}
                            className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                          />
                          <span className="text-sm text-gray-700">{day.label}</span>
                        </label>
                      );
                    })}
      </div>
    </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    💾 Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLeaveDays(null)}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                  >
                    ❌ İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EMERGENCY SERVICE TAB */}
        {activeTab === 'emergency' && (
          <div className="space-y-6">
            {/* Acil Servis Doktorları Vardiya Bilgileri */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                👨‍⚕️ Acil Servis Doktorları Vardiya Planı
              </h2>
              
              {doctors.filter(d => d.is_emergency_doctor).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz acil servis doktoru eklenmemiştir.</p>
              ) : (
                <>
                  {/* Vardiya Takvimi Tablosu */}
                  <div className="mb-8 overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">📅 Haftalık Vardiya Takvimi</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            try {
                              const today = new Date();
                              const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                              
                              // Excel verisi hazırla
                              const data = [];
                              
                              // Başlık satırı
                              const header = ['Vardiya'];
                              for (let i = 0; i < 7; i++) {
                                const date = new Date(today);
                                date.setDate(today.getDate() + i);
                                header.push(`${date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} ${dayNames[date.getDay()]}`);
                              }
                              data.push(header);
                              
                              // Vardiya satırları
                              ['00:00', '08:00', '16:00'].forEach((shiftStart, idx) => {
                                const shiftEnd = calculateShiftEnd(shiftStart);
                                const row = [`Vardiya ${idx + 1} (${shiftStart} - ${shiftEnd})`];
                                
                                for (let i = 0; i < 7; i++) {
                                  const date = new Date(today);
                                  date.setDate(today.getDate() + i);
                                  const workingDoctors = getDoctorsForShift(
                                    date, 
                                    shiftStart, 
                                    doctors.filter(d => d.is_emergency_doctor)
                                  );
                                  row.push(workingDoctors.join(', ') || '-');
                                }
                                data.push(row);
                              });
                              
                              // Excel dosyası oluştur
                              const ws = XLSX.utils.aoa_to_sheet(data);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, 'Haftalık Vardiya');
                              
                              // İndir - local date formatı kullan
                              const year = today.getFullYear();
                              const month = String(today.getMonth() + 1).padStart(2, '0');
                              const day = String(today.getDate()).padStart(2, '0');
                              const fileName = `Acil_Servis_Haftalik_Vardiya_${year}-${month}-${day}.xlsx`;
                              XLSX.writeFile(wb, fileName);
                              
                              setSuccess('Haftalık vardiya takvimi Excel olarak indirildi!');
                            } catch (err) {
                              console.error('Error exporting weekly schedule:', err);
                              setError('Takvim indirilemedi');
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          📊 Excel
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const today = new Date();
                              const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                              
                              // PDF oluştur
                              const doc = new jsPDF('landscape', 'mm', 'a4');
                              
                              // Başlık
                              doc.setFontSize(18);
                              doc.setFont(undefined, 'bold');
                              doc.text('Acil Servis Haftalık Vardiya Takvimi', 14, 15);
                              doc.setFontSize(11);
                              doc.setFont(undefined, 'normal');
                              doc.text(`Tarih: ${today.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 22);
                              
                              // Tablo verilerini hazırla
                              const tableData = [];
                              
                              ['00:00', '08:00', '16:00'].forEach((shiftStart, idx) => {
                                const shiftEnd = calculateShiftEnd(shiftStart);
                                const row = [`Vardiya ${idx + 1}\n${shiftStart} - ${shiftEnd}`];
                                
                                for (let i = 0; i < 7; i++) {
                                  const date = new Date(today);
                                  date.setDate(today.getDate() + i);
                                  const workingDoctors = getDoctorsForShift(
                                    date, 
                                    shiftStart, 
                                    doctors.filter(d => d.is_emergency_doctor)
                                  );
                                  
                                  const text = workingDoctors.length > 0 
                                    ? workingDoctors.map(name => name.split(' ').slice(0, 2).join(' ')).join('\n')
                                    : '-';
                                  
                                  row.push(text);
                                }
                                
                                tableData.push(row);
                              });
                              
                              // Tablo başlıkları
                              const headers = ['Vardiya'];
                              for (let i = 0; i < 7; i++) {
                                const date = new Date(today);
                                date.setDate(today.getDate() + i);
                                const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
                                const dayName = dayNames[date.getDay()];
                                headers.push(`${dateStr}\n${dayName}`);
                              }
                              
                              // Tablo oluştur
                              autoTable(doc, {
                                head: [headers],
                                body: tableData,
                                startY: 28,
                                theme: 'grid',
                                headStyles: {
                                  fillColor: [66, 139, 202],
                                  textColor: 255,
                                  fontStyle: 'bold',
                                  fontSize: 9,
                                  halign: 'center',
                                  valign: 'middle'
                                },
                                bodyStyles: {
                                  fontSize: 8,
                                  halign: 'center',
                                  valign: 'middle'
                                },
                                columnStyles: {
                                  0: { cellWidth: 40, fontStyle: 'bold' },
                                  1: { cellWidth: 32 },
                                  2: { cellWidth: 32 },
                                  3: { cellWidth: 32 },
                                  4: { cellWidth: 32 },
                                  5: { cellWidth: 32 },
                                  6: { cellWidth: 32 },
                                  7: { cellWidth: 32 }
                                },
                                styles: {
                                  cellPadding: 3,
                                  lineWidth: 0.1,
                                  lineColor: [200, 200, 200]
                                },
                                margin: { left: 14, right: 14 }
                              });
                              
                              // İndir - local date formatı kullan
                              const year = today.getFullYear();
                              const month = String(today.getMonth() + 1).padStart(2, '0');
                              const day = String(today.getDate()).padStart(2, '0');
                              const fileName = `Acil_Servis_Haftalik_Vardiya_${year}-${month}-${day}.pdf`;
                              doc.save(fileName);
                              
                              setSuccess('Haftalık vardiya takvimi PDF olarak indirildi!');
                            } catch (err) {
                              console.error('Error exporting weekly schedule PDF:', err);
                              setError(`PDF indirilemedi: ${err.message || err.toString()}`);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          📄 PDF
                        </button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Vardiya</th>
                            {(() => {
                              const days = [];
                              const today = new Date();
                              for (let i = 0; i < 7; i++) {
                                const date = new Date(today);
                                date.setDate(today.getDate() + i);
                                const isToday = i === 0;
                                days.push(
                                  <th 
                                    key={i} 
                                    className={`px-3 py-3 text-center font-semibold text-gray-700 border-l border-gray-200 ${
                                      isToday ? 'bg-blue-50' : ''
                                    }`}
                                  >
                                    <div className="text-xs text-gray-500 mb-1">
                                      {date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <div className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                      {date.toLocaleDateString('tr-TR', { weekday: 'short' })}
                                    </div>
                                  </th>
                                );
                              }
                              return days;
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {['00:00', '08:00', '16:00'].map((shiftStart, idx) => {
                            const shiftEnd = calculateShiftEnd(shiftStart);
                            const now = new Date();
                            const currentHour = now.getHours();
                            const currentMinute = now.getMinutes();
                            const [startHour] = shiftStart.split(':').map(Number);
                            const [endHour] = shiftEnd.split(':').map(Number);
                            
                            return (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                                  <div className="text-xs text-gray-500">Vardiya {idx + 1}</div>
                                  <div>{shiftStart} - {shiftEnd}</div>
                                </td>
                                {(() => {
                                  const cells = [];
                                  const today = new Date();
                                  for (let i = 0; i < 7; i++) {
                                    const date = new Date(today);
                                    date.setDate(today.getDate() + i);
                                    const isToday = i === 0;
                                    
                                    // Şu anki saatte bu vardiyada mıyız?
                                    let isCurrentShift = false;
                                    if (isToday) {
                                      const currentTimeMinutes = currentHour * 60 + currentMinute;
                                      const startTimeMinutes = startHour * 60;
                                      let endTimeMinutes = endHour * 60;
                                      
                                      // Gece vardiyası kontrolü (16:00-00:00 gibi)
                                      if (endHour < startHour || endHour === 0) {
                                        // Gece vardiyası: 16:00'dan sonra veya 00:00'dan önce
                                        if (endHour === 0) {
                                          endTimeMinutes = 24 * 60; // 00:00 = 24:00 olarak hesapla
                                        }
                                        isCurrentShift = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
                                      } else {
                                        // Gündüz vardiyası (08:00-16:00 gibi)
                                        isCurrentShift = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
                                      }
                                    }
                                    
                                    const workingDoctors = getDoctorsForShift(
                                      date, 
                                      shiftStart, 
                                      doctors.filter(d => d.is_emergency_doctor)
                                    );
                                    
                                    cells.push(
                                      <td 
                                        key={i}
                                        className={`px-3 py-3 text-center border-l border-gray-200 ${
                                          isToday && isCurrentShift 
                                            ? 'bg-green-100 border-green-300' 
                                            : isToday 
                                            ? 'bg-blue-50' 
                                            : ''
                                        }`}
                                      >
                                        {workingDoctors.length > 0 ? (
                                          <div className="space-y-1">
                                            {workingDoctors.map((name, nameIdx) => (
                                              <div 
                                                key={nameIdx}
                                                className={`text-xs px-2 py-1 rounded ${
                                                  isToday && isCurrentShift
                                                    ? 'bg-green-200 text-green-800 font-medium'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}
                                              >
                                                {name.split(' ').slice(0, 2).join(' ')}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </td>
                                    );
                                  }
                                  return cells;
                                })()}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                        <span>Bugün</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                        <span>Şu anki vardiya</span>
                      </div>
                    </div>
                  </div>

                  {/* Aylık Vardiya Takvimi */}
                  <div className="mt-8 overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold text-gray-700">📆 Aylık Vardiya Takvimi</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newDate = new Date(selectedYear, selectedMonth - 1, 1);
                              setSelectedMonth(newDate.getMonth());
                              setSelectedYear(newDate.getFullYear());
                            }}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                          >
                            ← Önceki Ay
                          </button>
                          <select
                            value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`}
                            onChange={(e) => {
                              const [year, month] = e.target.value.split('-');
                              setSelectedYear(parseInt(year));
                              setSelectedMonth(parseInt(month) - 1);
                            }}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            {(() => {
                              const options = [];
                              const today = new Date();
                              for (let i = -2; i <= 12; i++) {
                                const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
                                const year = date.getFullYear();
                                const month = date.getMonth();
                                const monthName = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                                options.push(
                                  <option key={`${year}-${month}`} value={`${year}-${String(month + 1).padStart(2, '0')}`}>
                                    {monthName}
                                  </option>
                                );
                              }
                              return options;
                            })()}
                          </select>
                          <button
                            onClick={() => {
                              const newDate = new Date(selectedYear, selectedMonth + 1, 1);
                              setSelectedMonth(newDate.getMonth());
                              setSelectedYear(newDate.getFullYear());
                            }}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                          >
                            Sonraki Ay →
                          </button>
                          <button
                            onClick={() => {
                              const today = new Date();
                              setSelectedMonth(today.getMonth());
                              setSelectedYear(today.getFullYear());
                            }}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                          >
                            Bugün
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            try {
                              const currentMonth = selectedMonth;
                              const currentYear = selectedYear;
                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              const date = new Date(currentYear, currentMonth, 1);
                              const monthName = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                              
                              // Excel verisi hazırla
                              const data = [];
                              
                              // Başlık satırı
                              const header = ['Doktor'];
                              for (let day = 1; day <= daysInMonth; day++) {
                                header.push(day.toString());
                              }
                              data.push(header);
                              
                              // Doktor satırları
                              doctors.filter(d => d.is_emergency_doctor).forEach((doc) => {
                                const doctorName = doc.doctor_name || 
                                  (doc.user_first_name && doc.user_last_name ? `${doc.user_first_name} ${doc.user_last_name}` : '') ||
                                  (doc.user?.first_name && doc.user?.last_name ? `${doc.user.first_name} ${doc.user.last_name}` : '') ||
                                  doc.doctor_username || 
                                  'İsim bilgisi yok';
                                
                                const leaveDays = doc.leave_dates || [];
                                
                                const row = [doctorName];
                                
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const date = new Date(currentYear, currentMonth, day);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const dateStr = `${year}-${month}-${day}`;
                                  const dayOfWeek = date.getDay();
                                  
                                  // Spesifik tarih kontrolü
                                  const isSpecificDateLeave = leaveDays.some(leaveDate => {
                                    if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      return leaveDate === dateStr;
                                    }
                                    return false;
                                  });
                                  
                                  // Haftalık izin günleri kontrolü
                                  const weeklyLeaveDays = leaveDays
                                    .map(d => {
                                      if (typeof d === 'string' && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        const parsed = new Date(d);
                                        return isNaN(parsed.getTime()) ? parseInt(d) : parsed.getDay();
                                      } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        return new Date(d).getDay();
                                      } else if (typeof d === 'number') {
                                        return d;
                                      }
                                      return new Date(d).getDay();
                                    })
                                    .filter(d => d !== undefined && !isNaN(d));
                                  
                                  const isLeaveDay = isSpecificDateLeave || weeklyLeaveDays.includes(dayOfWeek);
                                  
                                  if (isLeaveDay) {
                                    row.push('İzin');
                                  } else {
                                    const dayShiftInfo = calculateShiftSchedule(doc, doctors.filter(d => d.is_emergency_doctor), date);
                                    if (dayShiftInfo) {
                                      row.push(`V${dayShiftInfo.shiftNumber} (${dayShiftInfo.shiftStart}-${dayShiftInfo.shiftEnd})`);
                                    } else {
                                      row.push('-');
                                    }
                                  }
                                }
                                data.push(row);
                              });
                              
                              // Excel dosyası oluştur
                              const ws = XLSX.utils.aoa_to_sheet(data);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, 'Aylık Vardiya');
                              
                              // İndir
                              const fileName = `Acil_Servis_Aylik_Vardiya_${monthName.replace(' ', '_')}.xlsx`;
                              XLSX.writeFile(wb, fileName);
                              
                              setSuccess('Aylık vardiya takvimi Excel olarak indirildi!');
                            } catch (err) {
                              console.error('Error exporting monthly schedule:', err);
                              setError('Takvim indirilemedi');
                            }
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          📊 Excel
                        </button>
                        <button
                          onClick={() => {
                            try {
                              const currentMonth = selectedMonth;
                              const currentYear = selectedYear;
                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              const date = new Date(currentYear, currentMonth, 1);
                              const monthName = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                              
                              // PDF oluştur (landscape - yatay)
                              const doc = new jsPDF('landscape', 'mm', 'a4');
                              
                              // Başlık
                              doc.setFontSize(18);
                              doc.setFont(undefined, 'bold');
                              doc.text('Acil Servis Aylık Vardiya Takvimi', 14, 15);
                              doc.setFontSize(11);
                              doc.setFont(undefined, 'normal');
                              doc.text(`Ay: ${monthName}`, 14, 22);
                              
                              // Tablo verilerini hazırla
                              const tableData = [];
                              
                              doctors.filter(d => d.is_emergency_doctor).forEach((docItem) => {
                                const doctorName = docItem.doctor_name || 
                                  (docItem.user_first_name && docItem.user_last_name ? `${docItem.user_first_name} ${docItem.user_last_name}` : '') ||
                                  (docItem.user?.first_name && docItem.user?.last_name ? `${docItem.user.first_name} ${docItem.user.last_name}` : '') ||
                                  docItem.doctor_username || 
                                  'İsim bilgisi yok';
                                
                                const leaveDays = docItem.leave_dates || [];
                                
                                const row = [doctorName.split(' ').slice(0, 2).join(' ')];
                                
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const date = new Date(currentYear, currentMonth, day);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const dateStr = `${year}-${month}-${day}`;
                                  const dayOfWeek = date.getDay();
                                  
                                  // Spesifik tarih kontrolü
                                  const isSpecificDateLeave = leaveDays.some(leaveDate => {
                                    if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      return leaveDate === dateStr;
                                    }
                                    return false;
                                  });
                                  
                                  // Haftalık izin günleri kontrolü
                                  const weeklyLeaveDays = leaveDays
                                    .map(d => {
                                      if (typeof d === 'string' && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        const parsed = new Date(d);
                                        return isNaN(parsed.getTime()) ? parseInt(d) : parsed.getDay();
                                      } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                        return new Date(d).getDay();
                                      } else if (typeof d === 'number') {
                                        return d;
                                      }
                                      return new Date(d).getDay();
                                    })
                                    .filter(d => d !== undefined && !isNaN(d));
                                  
                                  const isLeaveDay = isSpecificDateLeave || weeklyLeaveDays.includes(dayOfWeek);
                                  
                                  if (isLeaveDay) {
                                    row.push('İ');
                                  } else {
                                    const dayShiftInfo = calculateShiftSchedule(docItem, doctors.filter(d => d.is_emergency_doctor), date);
                                    if (dayShiftInfo) {
                                      row.push(`V${dayShiftInfo.shiftNumber}`);
                                    } else {
                                      row.push('-');
                                    }
                                  }
                                }
                                
                                tableData.push(row);
                              });
                              
                              // Tablo başlıkları
                              const headers = ['Doktor'];
                              for (let day = 1; day <= daysInMonth; day++) {
                                headers.push(day.toString());
                              }
                              
                              // Sütun genişliklerini hesapla
                              const pageWidth = 277; // A4 landscape genişliği (mm)
                              const doctorColWidth = 35;
                              const availableWidth = pageWidth - doctorColWidth - 28; // margin'ler için
                              const dayColWidth = availableWidth / daysInMonth;
                              
                              // Tablo oluştur
                              autoTable(doc, {
                                head: [headers],
                                body: tableData,
                                startY: 28,
                                theme: 'grid',
                                headStyles: {
                                  fillColor: [66, 139, 202],
                                  textColor: 255,
                                  fontStyle: 'bold',
                                  fontSize: 7,
                                  halign: 'center',
                                  valign: 'middle'
                                },
                                bodyStyles: {
                                  fontSize: 6,
                                  halign: 'center',
                                  valign: 'middle'
                                },
                                columnStyles: {
                                  0: { cellWidth: doctorColWidth, fontStyle: 'bold', fontSize: 7 }
                                },
                                styles: {
                                  cellPadding: 1.5,
                                  lineWidth: 0.1,
                                  lineColor: [200, 200, 200],
                                  overflow: 'linebreak',
                                  cellWidth: 'wrap'
                                },
                                margin: { left: 14, right: 14 },
                                tableWidth: 'wrap'
                              });
                              
                              // İndir
                              const fileName = `Acil_Servis_Aylik_Vardiya_${monthName.replace(' ', '_')}.pdf`;
                              doc.save(fileName);
                              
                              setSuccess('Aylık vardiya takvimi PDF olarak indirildi!');
                            } catch (err) {
                              console.error('Error exporting monthly schedule PDF:', err);
                              setError(`PDF indirilemedi: ${err.message || err.toString()}`);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          📄 PDF
                        </button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-semibold text-gray-700 text-xs">Doktor</th>
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
                          {doctors.filter(d => d.is_emergency_doctor).map((doc) => {
                            try {
                              const doctorName = doc.doctor_name || 
                                (doc.user_first_name && doc.user_last_name ? `${doc.user_first_name} ${doc.user_last_name}` : '') ||
                                (doc.user?.first_name && doc.user?.last_name ? `${doc.user.first_name} ${doc.user.last_name}` : '') ||
                                doc.doctor_username || 
                                'İsim bilgisi yok';
                              
                              const leaveDays = doc.leave_dates || [];
                              
                              const today = new Date();
                              const currentMonth = selectedMonth;
                              const currentYear = selectedYear;
                              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                              
                              return (
                                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-2 py-2 font-medium text-gray-700 text-xs bg-gray-50 sticky left-0 z-10">
                                    <div className="max-w-[100px] truncate" title={doctorName}>
                                      {doctorName.split(' ').slice(0, 2).join(' ')}
                                    </div>
                                  </td>
                                  {(() => {
                                    const cells = [];
                                    for (let day = 1; day <= daysInMonth; day++) {
                                      const date = new Date(currentYear, currentMonth, day);
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const dayNum = String(date.getDate()).padStart(2, '0');
                                      const dateStr = `${year}-${month}-${dayNum}`;
                                      const dayOfWeek = date.getDay();
                                      const isToday = date.toDateString() === today.toDateString();
                                      
                                      // Spesifik tarih kontrolü
                                      const isSpecificDateLeave = leaveDays.some(leaveDate => {
                                        if (typeof leaveDate === 'string' && leaveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                          return leaveDate === dateStr;
                                        }
                                        return false;
                                      });
                                      
                                      // Haftalık izin günleri kontrolü
                                      const weeklyLeaveDays = leaveDays
                                        .map(d => {
                                          if (typeof d === 'string' && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                            const parsed = new Date(d);
                                            return isNaN(parsed.getTime()) ? parseInt(d) : parsed.getDay();
                                          } else if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                            return new Date(d).getDay();
                                          } else if (typeof d === 'number') {
                                            return d;
                                          }
                                          return new Date(d).getDay();
                                        })
                                        .filter(d => d !== undefined && !isNaN(d));
                                      
                                      const isLeaveDay = isSpecificDateLeave || weeklyLeaveDays.includes(dayOfWeek);
                                      
                                      // Bu tarih için vardiya bilgisini hesapla
                                      const dayShiftInfo = calculateShiftSchedule(doc, doctors.filter(d => d.is_emergency_doctor), date);
                                      if (!dayShiftInfo) {
                                        cells.push(
                                          <td key={day} className="px-1 py-1 text-center border-l border-gray-100">
                                            <span className="text-gray-300">-</span>
                                          </td>
                                        );
                                        continue;
                                      }
                                      
                                      const shiftColors = {
                                        1: 'bg-blue-100 text-blue-700 border-blue-200',
                                        2: 'bg-green-100 text-green-700 border-green-200',
                                        3: 'bg-purple-100 text-purple-700 border-purple-200'
                                      };
                                      
                                      cells.push(
                                        <td 
                                          key={day}
                                          className={`px-1 py-1 text-center border-l border-gray-100 ${
                                            isToday ? 'bg-yellow-50' : ''
                                          }`}
                                        >
                                          {isLeaveDay ? (
                                            <div className="flex flex-col items-center">
                                              <span className="text-yellow-600 text-xs">🏖️</span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center gap-0.5">
                                              <span className={`text-[10px] px-1 py-0.5 rounded border ${shiftColors[dayShiftInfo.shiftNumber] || 'bg-gray-100'}`}>
                                                V{dayShiftInfo.shiftNumber}
                                              </span>
                                              <span className="text-[9px] text-gray-600">
                                                {dayShiftInfo.shiftStart}
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                      );
                                    }
                                    return cells;
                                  })()}
                                </tr>
                              );
                            } catch (error) {
                              console.error('Error rendering monthly schedule:', error);
                              return null;
                            }
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                        <span>Vardiya 1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span>Vardiya 2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
                        <span>Vardiya 3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">🏖️</span>
                        <span>İzin</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></div>
                        <span>Bugün</span>
                      </div>
                    </div>
                  </div>

                  {/* Detaylı Doktor Bilgileri */}
                  <div className="border-t pt-6 mt-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">👨‍⚕️ Doktor Detayları</h3>
                    <div className="space-y-4">
                  {doctors.filter(d => d.is_emergency_doctor).map((doc) => {
                    try {
                      const shiftInfo = calculateShiftSchedule(doc, doctors.filter(d => d.is_emergency_doctor));
                      if (!shiftInfo) return null;
                      
                      return (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {doc.doctor_name || 
                               (doc.user_first_name && doc.user_last_name ? `${doc.user_first_name} ${doc.user_last_name}` : '') ||
                               (doc.user?.first_name && doc.user?.last_name ? `${doc.user.first_name} ${doc.user.last_name}` : '') ||
                               doc.doctor_username || 
                               'İsim bilgisi yok'}
                              {doc.title && <span className="text-sm text-gray-600 ml-2">({doc.title})</span>}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Telefon: {doc.user_phone || doc.user?.phone || 'Belirtilmemiş'}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            shiftInfo.isCurrentlyWorking 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {shiftInfo.isCurrentlyWorking ? '🟢 Çalışıyor' : '⚪ Dinleniyor'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Vardiya Bilgileri */}
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-800 mb-2">📅 Vardiya Bilgileri</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Vardiya:</span> {shiftInfo.shiftNumber}. Vardiya</p>
                              <p><span className="font-medium">Başlangıç:</span> {shiftInfo.shiftStart}</p>
                              <p><span className="font-medium">Bitiş:</span> {shiftInfo.shiftEnd}</p>
                              <p><span className="font-medium">Çalışma Süresi:</span> 8 saat</p>
                              <p><span className="font-medium">Dinlenme Süresi:</span> 16 saat</p>
                            </div>
                          </div>
                          
                          {/* İzin Günleri */}
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-semibold text-yellow-800 mb-2">🏖️ İzin Günleri</h4>
                            {shiftInfo.weeklyLeaveDays.length > 0 ? (
                              <div className="space-y-1 text-sm">
                                {shiftInfo.weeklyLeaveDays.map((day, idx) => (
                                  <p key={idx} className="text-yellow-700">
                                    {getDayName(day)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-yellow-600">İzin günü belirlenmemiş</p>
                            )}
                            <p className="text-xs text-yellow-600 mt-2">
                              Haftada 2 gün izin hakkı var
                            </p>
                          </div>
                        </div>
                        
                        {/* Bugünkü Durum */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Bugünkü Durum:</p>
                          <p className="text-sm text-gray-600">
                            {shiftInfo.isWorkingToday ? (
                              <>
                                <span className="font-medium text-green-700">✓ Çalışıyor</span> - 
                                Vardiya: {shiftInfo.shiftStart} - {shiftInfo.shiftEnd}
                              </>
                            ) : (
                              <span className="font-medium text-orange-700">🏖️ İzin Günü</span>
                            )}
                          </p>
                          {shiftInfo.nextShift && (
                            <p className="text-xs text-gray-500 mt-1">
                              Sonraki Vardiya: {shiftInfo.nextShift.date} {shiftInfo.nextShift.time}
                            </p>
                          )}
      </div>
    </div>
  );
                    } catch (error) {
                      console.error('Error rendering doctor shift info:', error);
                      return null;
                    }
                  })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Acil Servis Ayarları */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                🚨 Acil Servis Yönetimi
              </h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setError('');
                setSuccess('');
                
                let emergencyId = 1;
                if (emergencyService) {
                  emergencyId = emergencyService.id;
                }
                
                const response = await apiClient.patch('/emergency-service/' + emergencyId + '/', emergencyServiceForm);
                setEmergencyService(response.data);
                setSuccess('Acil servis ayarları güncellendi!');
              } catch (err) {
                console.error('Error updating emergency service:', err);
                setError('Acil servis ayarları güncellenemedi: ' + (err.response?.data?.detail || err.message));
              }
            }} className="space-y-6">
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Durum</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emergencyServiceForm.is_active}
                        onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, is_active: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emergencyServiceForm.is_24_7}
                        onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, is_24_7: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        disabled={!emergencyServiceForm.is_active}
                      />
                      <span className="text-sm font-medium text-gray-700">7-24 Açık</span>
                    </label>
        </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durum
                    </label>
                    <select
                      value={emergencyServiceForm.status}
                      onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, status: e.target.value })}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                      disabled={!emergencyServiceForm.is_active}
                    >
                      <option value="open">Açık</option>
                      <option value="closed">Kapalı</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">İletişim Bilgileri</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={emergencyServiceForm.phone}
                      onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, phone: e.target.value })}
                      placeholder="Örn: 0212 123 45 67"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adres
                    </label>
                    <textarea
                      value={emergencyServiceForm.address}
                      onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, address: e.target.value })}
                      placeholder="Acil servis adresi"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Notlar/Açıklamalar</h3>
                <textarea
                  value={emergencyServiceForm.notes}
                  onChange={(e) => setEmergencyServiceForm({ ...emergencyServiceForm, notes: e.target.value })}
                  placeholder="Acil servis hakkında notlar (ör: Özel durumlar, talimatlar vb.)"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  💾 Kaydet
                </button>
              </div>
            </form>
            
            {emergencyService && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Mevcut Durum:</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${emergencyService.is_active && emergencyService.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {emergencyService.is_active && emergencyService.status === 'open' ? 'Acil Servis Açık' : 'Acil Servis Kapalı'}
                    {emergencyService.is_24_7 && <span> - 7-24 Hizmet</span>}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* LEAVE REQUESTS TAB */}
        {activeTab === 'leave-requests' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 İzin Talepleri</h2>
              
              {leaveRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doktor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Tarihi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Neden</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {leaveRequests.map((request) => (
                        <tr key={request.id} className={request.status === 'pending' ? 'bg-yellow-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.doctor_name || request.doctor_username}
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {request.status === 'pending' ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (request.status !== 'pending') {
                                      console.warn('İzin talebi zaten işleme alınmış:', request.status);
                                      return;
                                    }
                                    
                                    if (processingLeaveRequest === request.id) {
                                      console.warn('İşlem zaten devam ediyor');
                                      return;
                                    }
                                    
                                    setProcessingLeaveRequest(request.id);
                                    setError('');
                                    setSuccess('');
                                    
                                    try {
                                      const requestId = request.id;
                                      const url = '/leave-requests/' + requestId + '/approve/';
                                      
                                      console.log('=== İZİN TALEBİ ONAYLANIYOR ===');
                                      console.log('Request ID:', requestId);
                                      console.log('Request URL:', url);
                                      console.log('Full URL:', 'http://127.0.0.1:8000/api' + url);
                                      console.log('Request Status:', request.status);
                                      console.log('Admin Notes:', adminNotes || '(boş)');
                                      
                                      const response = await apiClient.post(url, {
                                        admin_notes: adminNotes || ''
                                      });
                                      
                                      console.log('✅ İzin talebi onaylandı!');
                                      console.log('Response data:', response.data);
                                      console.log('Response status:', response.status);
                                      
                                      setSuccess('İzin talebi onaylandı!');
                                      setAdminNotes('');
                                      
                                      // Hemen verileri yenile
                                      try {
                                        const [leaveRequestsRes, doctorsRes] = await Promise.all([
                                          apiClient.get('/leave-requests/'),
                                          apiClient.get('/doctors/')
                                        ]);
                                        console.log('Veriler yenilendi');
                                        setLeaveRequests(leaveRequestsRes.data || []);
                                        if (doctorsRes.data) {
                                          setDoctors(doctorsRes.data);
                                        }
                                      } catch (refreshErr) {
                                        console.error('Veri yenileme hatası:', refreshErr);
                                        // Veri yenileme hatası olsa bile başarı mesajı gösterildi
                                      }
                                    } catch (err) {
                                      console.error('❌ İZİN ONAYLAMA HATASI');
                                      console.error('Error object:', err);
                                      console.error('Error message:', err.message);
                                      console.error('Error response:', err.response);
                                      console.error('Error response data:', err.response?.data);
                                      console.error('Error response status:', err.response?.status);
                                      console.error('Error response headers:', err.response?.headers);
                                      
                                      let errorMessage = 'İzin onaylanamadı';
                                      
                                      if (err.response) {
                                        if (err.response.data) {
                                          errorMessage = err.response.data.error || 
                                                        err.response.data.detail || 
                                                        JSON.stringify(err.response.data);
                                        } else {
                                          errorMessage = `HTTP ${err.response.status}: ${err.response.statusText || 'Bilinmeyen hata'}`;
                                        }
                                      } else if (err.message) {
                                        errorMessage = err.message;
                                      }
                                      
                                      setError(`İzin onaylanamadı: ${errorMessage}`);
                                    } finally {
                                      setProcessingLeaveRequest(null);
                                    }
                                  }}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={request.status !== 'pending' || processingLeaveRequest === request.id}
                                >
                                  {processingLeaveRequest === request.id ? '⏳ İşleniyor...' : '✓ Onayla'}
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    try {
                                      console.log('İzin talebi reddediliyor:', request.id);
                                      console.log('Request URL:', '/leave-requests/' + request.id + '/reject/');
                                      
                                      const response = await apiClient.post('/leave-requests/' + request.id + '/reject/', {
                                        admin_notes: adminNotes || ''
                                      });
                                      
                                      console.log('İzin talebi reddedildi:', response.data);
                                      setSuccess('İzin talebi reddedildi!');
                                      setAdminNotes('');
                                      
                                      // Kısa bir gecikme sonrası verileri yenile
                                      setTimeout(async () => {
                                        try {
                                          const leaveRequestsRes = await apiClient.get('/leave-requests/').catch(() => ({ data: [] }));
                                          setLeaveRequests(leaveRequestsRes.data || []);
                                        } catch (refreshErr) {
                                          console.error('Veri yenileme hatası:', refreshErr);
                                        }
                                      }, 500);
                                    } catch (err) {
                                      console.error('İzin reddetme hatası:', err);
                                      console.error('Hata response:', err.response);
                                      console.error('Hata detayları:', err.response?.data);
                                      console.error('Hata status:', err.response?.status);
                                      
                                      const errorMessage = err.response?.data?.error || 
                                                          err.response?.data?.detail ||
                                                          (err.response?.status === 404 ? 'İzin talebi bulunamadı' : '') ||
                                                          (err.response?.status === 403 ? 'Yetkiniz yok' : '') ||
                                                          (err.response?.status === 400 ? 'Geçersiz istek' : '') ||
                                                          err.message || 
                                                          'İzin reddedilemedi';
                                      setError(errorMessage);
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors ml-2"
                                  disabled={request.status !== 'pending'}
                                >
                                  ✗ Reddet
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                {request.reviewed_by_name && `İnceleyen: ${request.reviewed_by_name}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Henüz izin talebi bulunmamaktadır.</p>
              )}
            </div>
          </div>
        )}

        {/* Bölüm Düzenleme Modal */}
        {showEditDeptModal && editingDept && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelEditDept}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  ✏️ Bölümü Düzenle
                </h2>
                <button
                  onClick={handleCancelEditDept}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdateDepartment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bölüm Adı
                  </label>
                  <input
                    type="text"
                    value={editDeptForm.name}
                    onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={editDeptForm.description}
                    onChange={(e) => setEditDeptForm({ ...editDeptForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Randevu Ücreti (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDeptForm.appointment_fee || 500.00}
                    onChange={(e) => setEditDeptForm({ ...editDeptForm, appointment_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    placeholder="500.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bu bölümden randevu alan hastalardan alınacak ücret
                  </p>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    ✅ Güncelle
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditDept}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                  >
                    ❌ İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;