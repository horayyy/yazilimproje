import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';

function HomePage() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [emergencyService, setEmergencyService] = useState(null);
  
  // Get appointment fee for a doctor
  const getAppointmentFee = (doctor) => {
    if (!doctor || !doctor.department) return 500.00;
    const dept = departments.find(d => d.id === doctor.department);
    return dept?.appointment_fee ? parseFloat(dept.appointment_fee) : 500.00;
  };

  useEffect(() => {
    // Fetch departments
    apiClient.get('/departments/')
      .then(response => setDepartments(response.data))
      .catch(error => console.error('Error fetching departments:', error));

    // Fetch doctors
    apiClient.get('/doctors/')
      .then(response => setDoctors(response.data))
      .catch(error => console.error('Error fetching doctors:', error));

    // Fetch emergency service info
    apiClient.get('/emergency-service/current/')
      .then(response => setEmergencyService(response.data))
      .catch(error => console.error('Error fetching emergency service:', error));
  }, []);

  // Sadece poliklinik doktorlarını göster (acil servis doktorları hariç)
  const poliklinikDoctors = doctors.filter(doctor => !doctor.is_emergency_doctor);
  
  const filteredDoctors = selectedDepartment
    ? poliklinikDoctors.filter(doctor => doctor.department === parseInt(selectedDepartment))
    : poliklinikDoctors;

  const getInitials = (doctor) => {
    const name = doctor.doctor_name || doctor.doctor_username || '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setShowBookingForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600">🏥 Hastane Randevu Sistemi</h1>
            <div className="space-x-4">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Giriş Yap
              </Link>
              <Link
                to="/admin"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Admin Panel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Randevu Alın, Sağlığınızı Önceliğiniz Yapın
          </h2>
          <p className="text-xl text-gray-600">
            Uzman doktorlarımızdan online randevu alabilirsiniz
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                // scroll to doctors
                const el = document.getElementById('doctors-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg font-medium transition"
            >
              Hemen Randevu Al
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Emergency Service Info Box */}
        {emergencyService && emergencyService.is_active && emergencyService.status === 'open' && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-800 mb-2">
                  🚨 Acil Servis - 7/24 Açık
                </h3>
                <p className="text-red-700 mb-3 font-medium">
                  Acil durumlar için hastanemize direkt gelebilirsiniz. <strong>Online randevu alınmaz.</strong>
                </p>
                {emergencyService.phone && (
                  <p className="text-red-600 mb-1">
                    <strong>Telefon:</strong> {emergencyService.phone}
                  </p>
                )}
                {emergencyService.address && (
                  <p className="text-red-600">
                    <strong>Adres:</strong> {emergencyService.address}
                  </p>
                )}
                {emergencyService.notes && (
                  <p className="text-sm text-red-600 mt-2 italic">
                    {emergencyService.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Department Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bölüm Seçin
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
          >
            <option value="">Tüm Bölümler</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Doctors Grid */}
        <div id="doctors-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map(doctor => (
            <div
              key={doctor.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transform hover:-translate-y-1 transition relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {getInitials(doctor)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {doctor.doctor_name || 'Dr. ' + doctor.doctor_username}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{doctor.title || 'Uzman Doktor'}</p>
                  {doctor.department_name ? (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full font-medium">{doctor.department_name}</span>
                  ) : (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full font-medium">Acil Servis</span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">Deneyimli, hasta odaklı hizmet. Hızlı kayıt ve güvenli randevu.</p>

              <div className="flex">
                <button
                  onClick={() => handleBookAppointment(doctor)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Randevu Al
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDoctors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {selectedDepartment ? 'Bu bölümde doktor bulunamadı.' : 'Doktor bulunamadı.'}
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingForm && selectedDoctor && (
        <AppointmentBookingModal
          doctor={selectedDoctor}
          appointmentFee={getAppointmentFee(selectedDoctor)}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedDoctor(null);
          }}
        />
      )}
    </div>
  );
}

// Appointment Booking Modal Component
function AppointmentBookingModal({ doctor, appointmentFee, onClose }) {
  const [currentStep, setCurrentStep] = useState(1); // 1 veya 2
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Hafta sonu günlerini engelle
  const isWeekend = (date) => {
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6; // Pazar veya Cumartesi
  };

  // Fetch available slots when date changes (only in step 2)
  useEffect(() => {
    if (currentStep === 2 && formData.date) {
      const selectedDate = new Date(formData.date);
      // Hafta sonu kontrolü
      if (isWeekend(selectedDate)) {
        setError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.');
        setAvailableSlots([]);
        setFormData({ ...formData, date: '', time: '' });
        return;
      }
      
      setLoadingSlots(true);
      setError('');
      apiClient.get(`/doctors/${doctor.id}/available_slots/`, {
        params: { date: formData.date }
      })
        .then(response => {
          const slots = response.data.available_slots || [];
          console.log('Müsait saatler:', slots);
          setAvailableSlots(slots);
          // Clear time if current selection is not available
          if (formData.time && !slots.includes(formData.time)) {
            setFormData({ ...formData, time: '' });
          }
        })
        .catch(error => {
          console.error('Error fetching available slots:', error);
          console.error('Error response:', error.response?.data);
          
          // Handle different error types
          if (error.response?.data?.date) {
            setError(error.response.data.date[0] || 'Bu tarih için randevu alınamaz.');
          } else if (error.response?.data?.error) {
            setError(error.response.data.error);
          } else if (error.response?.data) {
            setError('Bu tarihte müsait saat bulunmamaktadır.');
          } else {
            setError('Müsait saatler yüklenirken bir hata oluştu.');
          }
          setAvailableSlots([]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date, doctor.id, currentStep]);

  // Step 1 validation
  const validateStep1 = () => {
    if (!formData.first_name.trim()) {
      setError('Ad alanı zorunludur.');
      return false;
    }
    if (!formData.last_name.trim()) {
      setError('Soyad alanı zorunludur.');
      return false;
    }
    if (!formData.national_id.trim()) {
      setError('TC Kimlik No zorunludur.');
      return false;
    }
    return true;
  };

  // Handle next step
  const handleNextStep = () => {
    setError('');
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/public-appointments/', {
        ...formData,
        doctor: doctor.id,
      });

      setSuccess(true);
      // Otomatik kapanma kaldırıldı - kullanıcı butona basana kadar açık kalacak
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

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Randevu Başarıyla Oluşturuldu!</h3>
            
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-800 mb-2">
                ✅ <strong>Randevu detaylarınız SMS ve E-posta olarak gönderilmiştir.</strong>
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                📧 <strong>24 saat öncesinden hatırlatma SMS'i gelecektir.</strong>
              </p>
              <p className="text-sm text-blue-700 mt-2">
                İsterseniz e-posta adresinize gelen mailden randevunuzu <strong>6 saat kalana dek</strong> iptal edebilirsiniz.
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-lg font-semibold text-yellow-900">
                💰 Randevu Ücreti: <span className="text-2xl">{appointmentFee.toFixed(2)} TL</span>
              </p>
            </div>
            
            <button
              onClick={() => {
                onClose();
                // Reset form
                setFormData({
                  first_name: '',
                  last_name: '',
                  national_id: '',
                  email: '',
                  phone: '',
                  date: '',
                  time: '',
                  notes: '',
                });
                setCurrentStep(1);
                setSuccess(false);
              }}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-lg"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Randevu Oluştur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Doktor:</p>
          <p className="font-semibold text-gray-900">
            {doctor.doctor_name || 'Dr. ' + doctor.doctor_username}
          </p>
          {doctor.department_name && (
            <p className="text-sm text-indigo-600">{doctor.department_name}</p>
          )}
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Kişisel Bilgiler</span>
          </div>
          <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Randevu Detayları</span>
          </div>
        </div>

        {currentStep === 1 ? (
          /* STEP 1: Kişisel Bilgiler */
          <div className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TC Kimlik No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                pattern="[0-9]{11}"
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                placeholder="11 haneli TC Kimlik No"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Devam Et
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Randevu Detayları */
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarih <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={(() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })()}
                value={formData.date}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const weekday = selectedDate.getDay();
                  
                  // Hafta sonu kontrolü
                  if (weekday === 0 || weekday === 6) {
                    setError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.');
                    return;
                  }
                  
                  setFormData({ ...formData, date: e.target.value });
                  setError('');
                }}
                onFocus={(e) => {
                  // Hafta sonu günlerini engelle
                  const input = e.target;
                  input.addEventListener('change', function() {
                    const selectedDate = new Date(this.value);
                    const weekday = selectedDate.getDay();
                    if (weekday === 0 || weekday === 6) {
                      this.value = '';
                      setError('Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.');
                    }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
              />
              {formData.date && (() => {
                const selectedDate = new Date(formData.date);
                const weekday = selectedDate.getDay();
                if (weekday === 0 || weekday === 6) {
                  return (
                    <p className="mt-1 text-sm text-red-600">
                      ⚠️ Hastanemiz hafta sonu kapalıdır. Lütfen hafta içi bir tarih seçin.
                    </p>
                  );
                }
                return null;
              })()}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                >
                  <option value="">Saat seçin</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              ) : formData.date ? (
                <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-700">
                  Bu tarihte müsait saat bulunmamaktadır.
                </div>
              ) : (
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  disabled
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Ücret Bilgisi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-center text-blue-900 font-semibold">
              💰 Randevu Ücreti: <span className="text-xl">{appointmentFee.toFixed(2)} TL</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handlePreviousStep}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Geri
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Randevu Oluştur'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

export default HomePage;

