import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import AppointmentTable from '../components/AppointmentTable';
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
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Apply filters whenever appointments or filter values change
  useEffect(() => {
    applyFilters();
  }, [appointments, filterDate, filterDoctor, filterStatus]);

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
      setAppointments(response.data);
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

    setFilteredAppointments(filtered);
  };

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

          {/* Filter Bar */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Randevuları Filtrele</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Filtreleri Temizle
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Filter */}
              <div>
                <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih Filtresi
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
                  Doktor Adı Filtresi
                </label>
                <input
                  type="text"
                  id="filterDoctor"
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                  placeholder="Doktor adı ara..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Durum Filtresi
                </label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Tüm Randevular
                {filteredAppointments.length !== appointments.length && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({filteredAppointments.length} / {appointments.length})
                  </span>
                )}
              </h2>
            </div>
            
            {updating && (
              <div className="mb-4 text-sm text-gray-600">
                Randevu güncelleniyor...
              </div>
            )}

            <AppointmentTable
              appointments={filteredAppointments}
              onStatusChange={handleStatusChange}
              allowedActions={['approve', 'cancel']}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretaryDashboard;
