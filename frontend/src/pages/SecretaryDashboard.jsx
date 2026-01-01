import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentCalendar from '../components/AppointmentCalendar';
import Navbar from '../components/Navbar';

const SecretaryDashboard = () => {
  const { user } = useAuth();
  
  // State for appointments
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  
  // Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // View mode
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  
  // Appointment creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all appointments on component mount
  useEffect(() => {
    fetchAppointments();
    fetchDepartments();
    fetchDoctors();
  }, []);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/departments/');
      // Handle both array response and paginated response
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch doctors (only poliklinik doctors, not emergency)
  const fetchDoctors = async () => {
    try {
      const response = await apiClient.get('/doctors/');
      // Handle both array response and paginated response
      const allDoctors = Array.isArray(response.data) ? response.data : (response.data.results || []);
      // Filter out emergency doctors
      const poliklinikDoctors = allDoctors.filter(doctor => !doctor.is_emergency_doctor);
      setDoctors(poliklinikDoctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // Apply filters whenever appointments or filter values change
  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterDoctor, filterStatus, searchQuery]);

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

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/appointments/');
      // Handle both array response and paginated response
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Randevular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(
        (apt) => apt.date === filterDate
      );
    }

    // Filter by doctor name
    if (filterDoctor) {
      filtered = filtered.filter(
        (apt) =>
          apt.doctor_name?.toLowerCase().includes(filterDoctor.toLowerCase()) ||
          apt.doctor_username?.toLowerCase().includes(filterDoctor.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter((apt) => apt.status === filterStatus);
    }

    // Search query filter (hasta adı, doktor adı, notlar)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.patient_name?.toLowerCase().includes(query) ||
          apt.patient_username?.toLowerCase().includes(query) ||
          apt.doctor_name?.toLowerCase().includes(query) ||
          apt.doctor_username?.toLowerCase().includes(query) ||
          apt.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredAppointments(filtered);
  };

  // Calculate statistics
  const getStatistics = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => apt.date === today);
    const completedCount = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
    const totalCount = appointments.length;

    return {
      today: todayAppointments.length,
      total: totalCount,
      completed: completedCount,
      cancelled: cancelledCount
    };
  };

  const stats = getStatistics();

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setUpdating(appointmentId);
      setError('');
      setSuccess('');

      await apiClient.patch(`/appointments/${appointmentId}/`, {
        status: newStatus,
      });

      setSuccess(`Randevu ${newStatus} başarıyla!`);
      
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

  const clearFilters = () => {
    setFilterDate('');
    setFilterDoctor('');
    setFilterStatus('');
    setSearchQuery('');
  };

  // Get unique doctors for filter dropdown
  const getUniqueDoctors = () => {
    const doctors = appointments
      .map(apt => ({
        name: apt.doctor_name || apt.doctor_username,
        username: apt.doctor_username
      }))
      .filter((doctor, index, self) => 
        index === self.findIndex(d => d.username === doctor.username)
      );
    return doctors;
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

      {/* Toast Notification */}
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
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sekreter Paneli</h1>
            <p className="text-gray-600">Randevu yönetimi ve takibi</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bugünün Randevuları</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.today}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Randevu</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completed}</p>
                </div>
                <div className="bg-emerald-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">İptal Edilen</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cancelled}</p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Create Appointment Button - Prominent */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Yeni Randevu Oluştur</h2>
                  <p className="text-indigo-100 text-sm">Hastalar için poliklinik doktorlarına randevu oluşturun</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Randevu Oluştur
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🔍 Filtrele ve Ara</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Filtreleri Temizle
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4">
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
                Genel Arama
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hasta adı, doktor adı veya notlarda ara..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Filter */}
              <div>
                <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Tarih Filtresi
                </label>
                <input
                  type="date"
                  id="filterDate"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Doctor Name Filter */}
              <div>
                <label htmlFor="filterDoctor" className="block text-sm font-medium text-gray-700 mb-1">
                  👨‍⚕️ Doktor Filtresi
                </label>
                <select
                  id="filterDoctor"
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Tüm Doktorlar</option>
                  {getUniqueDoctors().map((doctor, index) => (
                    <option key={index} value={doctor.username}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  📊 Durum Filtresi
                </label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="completed">✅ Tamamlandı</option>
                  <option value="cancelled">❌ İptal Edildi</option>
                </select>
              </div>
            </div>
          </div>

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
                📋 Liste Görünümü
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
                📅 Takvim Görünümü
              </button>
            </div>
          </div>

          {/* Appointments Section */}
          {viewMode === 'calendar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">📅 Randevu Takvimi</h2>
                  <AppointmentCalendar
                    appointments={filteredAppointments}
                    selectedDate={selectedCalendarDate}
                    onDateSelect={(date) => {
                      setSelectedCalendarDate(date);
                      setFilterDate(date.toISOString().split('T')[0]);
                      setViewMode('table');
                    }}
                  />
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Bugünün Randevuları</h3>
                {filteredAppointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length > 0 ? (
                  <div className="space-y-2">
                    {filteredAppointments
                      .filter(apt => apt.date === new Date().toISOString().split('T')[0])
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map(apt => (
                        <div key={apt.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-500">
                          <p className="font-medium text-gray-900">{apt.patient_name || apt.patient_username}</p>
                          <p className="text-sm text-indigo-600 font-medium mt-1">{apt.time}</p>
                          <p className="text-xs text-gray-500 mt-1">{apt.doctor_name || apt.doctor_username}</p>
                          <span
                            className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                              apt.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {apt.status === 'completed' ? '✅ Tamamlandı' : '❌ İptal Edildi'}
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
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  📋 Tüm Randevular
                  {filteredAppointments.length !== appointments.length && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({filteredAppointments.length} / {appointments.length})
                    </span>
                  )}
                </h2>
                <div className="text-sm text-gray-600">
                  {filteredAppointments.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      {filteredAppointments.length} randevu
                    </span>
                  )}
                </div>
              </div>
              
              {updating && (
                <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  Randevu güncelleniyor...
                </div>
              )}

              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Randevu bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || filterDate || filterDoctor || filterStatus
                      ? 'Filtreleri değiştirerek tekrar deneyin.'
                      : 'Henüz randevu kaydı bulunmamaktadır.'}
                  </p>
                </div>
              ) : (
                <AppointmentTable
                  appointments={filteredAppointments}
                  onStatusChange={handleStatusChange}
                  allowedActions={['approve', 'cancel']}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <CreateAppointmentModal
          departments={departments}
          doctors={doctors}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDepartment('');
            setSelectedDoctor(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedDepartment('');
            setSelectedDoctor(null);
            fetchAppointments();
            setSuccess('Randevu başarıyla oluşturuldu!');
          }}
        />
      )}
    </div>
  );
};

// Create Appointment Modal Component
const CreateAppointmentModal = ({ departments, doctors, selectedDepartment, setSelectedDepartment, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    national_id: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
  });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter doctors by selected department
  const filteredDoctors = selectedDepartment
    ? doctors.filter(doctor => doctor.department === parseInt(selectedDepartment))
    : [];

  // Get appointment fee for selected doctor
  const getAppointmentFee = (doctor) => {
    if (!doctor || !doctor.department) return 500.00;
    const dept = departments.find(d => d.id === doctor.department);
    return dept?.appointment_fee ? parseFloat(dept.appointment_fee) : 500.00;
  };

  // Fetch available slots when date and doctor are selected
  useEffect(() => {
    if (currentStep === 3 && formData.date && selectedDoctor) {
      const selectedDate = new Date(formData.date);
      const weekday = selectedDate.getDay();
      
      // Hafta sonu kontrolü
      if (weekday === 0 || weekday === 6) {
        setError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.');
        setAvailableSlots([]);
        return;
      }
      
      setLoadingSlots(true);
      setError('');
      apiClient.get(`/doctors/${selectedDoctor.id}/available_slots/`, {
        params: { date: formData.date }
      })
        .then(response => {
          setAvailableSlots(response.data.available_slots || []);
          if (formData.time && !response.data.available_slots.includes(formData.time)) {
            setFormData({ ...formData, time: '' });
          }
        })
        .catch(error => {
          console.error('Error fetching available slots:', error);
          if (error.response?.data?.date) {
            setError(error.response.data.date[0] || 'Bu tarih için randevu alınamaz.');
          }
          setAvailableSlots([]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date, selectedDoctor, currentStep]);

  const validateStep1 = () => {
    if (!formData.first_name.trim()) {
      setError('Ad alanı zorunludur.');
      return false;
    }
    if (!formData.last_name.trim()) {
      setError('Soyad alanı zorunludur.');
      return false;
    }
    if (!formData.birth_date) {
      setError('Doğum tarihi zorunludur.');
      return false;
    }
    if (!formData.national_id.trim()) {
      setError('TC Kimlik No zorunludur.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email.trim()) {
      setError('E-posta alanı zorunludur.');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Telefon alanı zorunludur.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!selectedDoctor) {
      setError('Lütfen bir doktor seçin.');
      setLoading(false);
      return;
    }

    if (!formData.date || !formData.time) {
      setError('Lütfen tarih ve saat seçin.');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/public-appointments/', {
        ...formData,
        doctor: selectedDoctor.id,
      });

      onSuccess();
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.values(errorData).flat().join(', ');
          setError(errorMessages);
        } else {
          setError(errorData);
        }
      } else {
        setError('Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Yeni Randevu Oluştur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step ? '✓' : step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 ${currentStep > step ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {currentStep === 1 ? (
          /* STEP 1: Hasta Bilgileri */
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">👤 Hasta Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doğum Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TC Kimlik No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="11 haneli TC Kimlik No"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Devam Et
              </button>
            </div>
          </div>
        ) : currentStep === 2 ? (
          /* STEP 2: İletişim Bilgileri */
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📧 İletişim Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Devam Et
              </button>
            </div>
          </div>
        ) : (
          /* STEP 3: Doktor ve Randevu Seçimi */
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏥 Doktor ve Randevu Seçimi</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bölüm <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedDoctor(null);
                  setFormData({ ...formData, date: '', time: '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Bölüm seçin...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {selectedDepartment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doktor <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedDoctor?.id || ''}
                  onChange={(e) => {
                    const doctor = filteredDoctors.find(d => d.id === parseInt(e.target.value));
                    setSelectedDoctor(doctor);
                    setFormData({ ...formData, date: '', time: '' });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Doktor seçin...</option>
                  {filteredDoctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name || doctor.doctor_username} {doctor.title ? `- ${doctor.title}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDoctor && (
              <>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Seçilen Doktor:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedDoctor.doctor_name || selectedDoctor.doctor_username}
                  </p>
                  {selectedDoctor.department_name && (
                    <p className="text-sm text-indigo-600">{selectedDoctor.department_name}</p>
                  )}
                  <p className="text-sm text-gray-700 mt-2">
                    💰 Randevu Ücreti: <span className="font-bold">{getAppointmentFee(selectedDoctor).toFixed(2)} TL</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tarih <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const weekday = selectedDate.getDay();
                        if (weekday === 0 || weekday === 6) {
                          setError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.');
                          return;
                        }
                        setFormData({ ...formData, date: e.target.value, time: '' });
                        setError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saat <span className="text-red-500">*</span>
                    </label>
                    {loadingSlots ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                        Müsait saatler yükleniyor...
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <select
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Saat seçin</option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    ) : formData.date ? (
                      <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-700">
                        Bu tarihte müsait saat bulunmamaktadır.
                      </div>
                    ) : (
                      <input
                        type="time"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
                        placeholder="Önce tarih seçin"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notlar (Opsiyonel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Geri
              </button>
              <button
                type="submit"
                disabled={loading || !selectedDoctor || !formData.date || !formData.time}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SecretaryDashboard;
