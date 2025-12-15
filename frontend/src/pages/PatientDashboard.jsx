import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import Navbar from '../components/Navbar';

const PatientDashboard = () => {
  const { user } = useAuth();
  
  // State for departments and doctors
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  
  // State for appointment form - Step by step
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // State for appointments list
  const [appointments, setAppointments] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Rapor görüntüleme state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch departments and doctors on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch appointments when component mounts or after successful submission
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter doctors based on selected department
  useEffect(() => {
    if (selectedDepartment) {
      const filtered = doctors.filter(
        (doctor) => doctor.department === parseInt(selectedDepartment)
      );
      setFilteredDoctors(filtered);
      setSelectedDoctor(''); // Reset doctor selection when department changes
    } else {
      setFilteredDoctors([]);
    }
  }, [selectedDepartment, doctors]);

  // Auto-hide success/error messages after 5 seconds
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptsResponse, docsResponse] = await Promise.all([
        apiClient.get('/departments/'),
        apiClient.get('/doctors/'),
      ]);
      
      setDepartments(deptsResponse.data);
      setDoctors(docsResponse.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('İçerik yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await apiClient.get('/appointments/');
      setAppointments(response.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Randevular yüklenemedi');
    }
  };

  // Validation function
  const isFormValid = () => {
    return selectedDepartment && selectedDoctor && appointmentDate && appointmentTime;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!isFormValid()) {
      setError('Lütfen tüm gerekli alanları doldurun');
      return;
    }

    setSubmitting(true);

    try {
      const appointmentData = {
        doctor: parseInt(selectedDoctor),
        date: appointmentDate,
        time: appointmentTime,
        notes: notes.trim() || undefined,
        status: 'confirmed',  // Randevular otomatik onaylanıyor
      };

      await apiClient.post('/appointments/', appointmentData);
      
      setSuccess('Randevu başarıyla oluşturuldu!');
      
      // Reset form
      setSelectedDepartment('');
      setSelectedDoctor('');
      setAppointmentDate('');
      setAppointmentTime('');
      setNotes('');
      
      // Refresh appointments list
      await fetchAppointments();
    } catch (err) {
      console.error('Error booking appointment:', err);
      
      // Handle specific error messages
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.non_field_errors) {
          setError(errorData.non_field_errors[0] || 'Zaman aralığı dolu. Lütfen başka bir saat seçin.');
        } else if (errorData.doctor) {
          setError('Geçersiz doktor seçimi. Lütfen tekrar deneyin.');
        } else {
          setError('Geçersiz randevu bilgileri. Lütfen seçimlerinizi kontrol edin.');
        }
      } else if (err.response?.status === 409) {
        setError('Bu zaman aralığı dolu. Lütfen başka bir saat seçin.');
      } else {
        setError(
          err.response?.data?.detail || 
          'Randevu oluşturulamadı. Lütfen tekrar deneyin.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setCancelling(appointmentId);
      setError('');
      setSuccess('');

      await apiClient.delete(`/appointments/${appointmentId}/`);
      
      setSuccess('Randevu başarıyla iptal edildi!');
      
      // Refresh appointments list
      await fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError('Randevu iptal edilemedi. Lütfen tekrar deneyin.');
    } finally {
      setCancelling(null);
    }
  };
  
  const handleViewReport = async (appointment) => {
    try {
      setLoadingReport(true);
      setError('');
      setSelectedAppointment(appointment);
      
      const response = await apiClient.get(`/appointments/${appointment.id}/report/`);
      setReportContent(response.data.report_content || '');
      setShowReportModal(true);
    } catch (err) {
      console.error('Error fetching report:', err);
      if (err.response?.status === 404) {
        setError('Bu randevu için henüz rapor oluşturulmamış.');
      } else {
        setError(err.response?.data?.detail || 'Rapor yüklenemedi');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  // Check if appointment is in the future
  const isFutureAppointment = (appointment) => {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    return appointmentDateTime > now && appointment.status !== 'cancelled' && appointment.status !== 'completed';
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          statusClasses[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Book Appointment Form - Step by Step */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Randevu Oluştur</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Select Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Adım 1: Bölüm Seç <span className="text-red-500">*</span>
                </label>
                <select
                  id="department"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Bir bölüm seçin...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {selectedDepartment && (
                  <p className="mt-1 text-sm text-green-600">✓ Bölüm seçildi</p>
                )}
              </div>

              {/* Step 2: Select Doctor */}
              <div>
                <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-2">
                  Adım 2: Doktor Seç <span className="text-red-500">*</span>
                </label>
                <select
                  id="doctor"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!selectedDepartment || filteredDoctors.length === 0}
                >
                  <option value="">
                    {!selectedDepartment
                      ? 'Lütfen önce bölüm seçin'
                      : filteredDoctors.length === 0
                      ? 'Bu bölümde doktor yok'
                      : 'Bir doktor seçin...'}
                  </option>
                  {filteredDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name || doctor.doctor_username} 
                      {doctor.title && ` - ${doctor.title}`}
                    </option>
                  ))}
                </select>
                {selectedDoctor && (
                  <p className="mt-1 text-sm text-green-600">✓ Doktor seçildi</p>
                )}
              </div>

              {/* Step 3: Select Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Adım 3: Tarih Seç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  {appointmentDate && (
                    <p className="mt-1 text-sm text-green-600">✓ Tarih seçildi</p>
                  )}
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Saat Seç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                  {appointmentTime && (
                    <p className="mt-1 text-sm text-green-600">✓ Saat seçildi</p>
                  )}
                </div>
              </div>

              {/* Step 4: Add Notes/Symptoms */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Adım 4: Notlar/Semptomlar (İsteğe Bağlı)
                </label>
                <textarea
                  id="notes"
                  rows="4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Semptomlarınızı veya ek bilgiler yazın..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid() || submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Randevu oluşturuluyor...
                  </span>
                ) : (
                  'Randevu Oluştur'
                )}
              </button>
            </form>
          </div>

          {/* My Appointments List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Randevularım</h2>
            
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Randevu bulunamadı. Yukarıda ilk randevunuzu oluşturun!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doktor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bölüm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appointment.doctor_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.department_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(appointment.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(appointment.time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(appointment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {isFutureAppointment(appointment) ? (
                              <button
                                onClick={() => handleCancelAppointment(appointment.id)}
                                disabled={cancelling === appointment.id}
                                className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancelling === appointment.id ? 'İptal Ediliyor...' : 'İptal Et'}
                              </button>
                            ) : null}
                            {appointment.status === 'completed' && (
                              <button
                                onClick={() => handleViewReport(appointment)}
                                disabled={loadingReport}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                📄 Rapor
                              </button>
                            )}
                            {!isFutureAppointment(appointment) && appointment.status !== 'completed' && (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rapor Görüntüleme Modal */}
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
                <p className="text-sm text-gray-600 mb-1">Doktor:</p>
                <p className="font-semibold text-gray-900">
                  {selectedAppointment.doctor_name || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mt-2 mb-1">Tarih:</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedAppointment.date).toLocaleDateString('tr-TR')} {selectedAppointment.time}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rapor İçeriği
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 whitespace-pre-wrap min-h-[200px]">
                  {loadingReport ? 'Rapor yükleniyor...' : (reportContent || 'Rapor içeriği bulunamadı.')}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
