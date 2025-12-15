import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import apiClient from '../api/axios';

const DoctorWorkingCalendar = ({ doctor, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDoctor, setCurrentDoctor] = useState(doctor);

  // Doctor prop'u değiştiğinde güncelle
  useEffect(() => {
    setCurrentDoctor(doctor);
  }, [doctor]);

  // Çalışma günlerini kontrol et
  const isWorkingDay = (date) => {
    // Hafta sonu kontrolü - hafta sonu çalışılmaz
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) { // Pazar veya Cumartesi
      return false;
    }
    
    if (!currentDoctor.working_hours || Object.keys(currentDoctor.working_hours).length === 0) {
      // Varsayılan: Pazartesi-Cuma çalışıyor
      return weekday >= 1 && weekday <= 5; // Pazartesi-Cuma
    }
    
    // Backend'de 0=Pazartesi, 6=Pazar formatı kullanılıyor
    // JavaScript: 0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi
    // Backend: 0=Pazartesi, 1=Salı, 2=Çarşamba, 3=Perşembe, 4=Cuma, 5=Cumartesi, 6=Pazar
    let backendWeekday;
    if (weekday === 0) {
      backendWeekday = 6; // Pazar
    } else {
      backendWeekday = weekday - 1; // Pazartesi=0, Salı=1, ..., Cumartesi=5
    }
    const dayKey = String(backendWeekday);
    const dayData = currentDoctor.working_hours[dayKey];
    return dayData && dayData.enabled;
  };

  // İzin günü mü kontrol et
  const isLeaveDate = (date) => {
    if (!currentDoctor.leave_dates || currentDoctor.leave_dates.length === 0) return false;
    const dateStr = date.toISOString().split('T')[0];
    return doctor.leave_dates.includes(dateStr);
  };

  // Tarih tıklama - izin günü ekle/çıkar
  const handleDateClick = async (date) => {
    const weekday = date.getDay();
    
    // Hafta sonu kontrolü - hafta sonu izin eklenemez
    if (weekday === 0 || weekday === 6) {
      setError('Hastanemiz hafta sonu kapalıdır. Hafta sonu günleri için izin eklenemez.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Geçmiş tarihler için izin eklenemez
    if (date < today) {
      setError('Geçmiş tarihler için izin günü eklenemez.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const currentLeaveDates = [...(currentDoctor.leave_dates || [])];
    const isCurrentlyLeave = currentLeaveDates.includes(dateStr);
    
    let updatedLeaveDates;
    if (isCurrentlyLeave) {
      // İzin gününü kaldır
      updatedLeaveDates = currentLeaveDates.filter(d => d !== dateStr);
    } else {
      // İzin günü ekle
      updatedLeaveDates = [...currentLeaveDates, dateStr].sort();
    }

    try {
      setLoading(true);
      setError('');
      await apiClient.patch(`/doctors/${currentDoctor.id}/`, {
        leave_dates: updatedLeaveDates
      });
      
      // Güncel doktor verisini güncelle
      const updatedDoctor = { ...currentDoctor, leave_dates: updatedLeaveDates };
      setCurrentDoctor(updatedDoctor);
      
      // Parent component'i güncelle
      if (onUpdate) {
        onUpdate(updatedDoctor);
      }
    } catch (err) {
      console.error('Error updating leave dates:', err);
      setError('İzin günü güncellenirken bir hata oluştu.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Custom tile content
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      if (isLeaveDate(date)) {
        return (
          <div className="flex items-center justify-center mt-1">
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              ✕
            </span>
          </div>
        );
      }
      if (isWorkingDay(date)) {
        return (
          <div className="flex items-center justify-center mt-1">
            <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              ✓
            </span>
          </div>
        );
      }
    }
    return null;
  };

  // Custom tile className
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const weekday = date.getDay();
      const classes = [];
      
      // Hafta sonu günleri her zaman devre dışı
      if (weekday === 0 || weekday === 6) {
        classes.push('bg-gray-200 opacity-50 cursor-not-allowed');
      } else if (isLeaveDate(date)) {
        classes.push('bg-red-100 border-2 border-red-400');
      } else if (isWorkingDay(date)) {
        classes.push('bg-green-50 border border-green-300');
      } else {
        classes.push('bg-gray-50 opacity-60');
      }
      
      if (dateStr === today) {
        classes.push('ring-2 ring-blue-500');
      }
      
      return classes.join(' ');
    }
    return null;
  };

  // Seçili tarihin detayları
  const selectedDateInfo = () => {
    if (!selectedDate) return null;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const weekday = selectedDate.getDay();
    let backendWeekday;
    if (weekday === 0) {
      backendWeekday = 6; // Pazar
    } else {
      backendWeekday = weekday - 1; // Pazartesi=0, Salı=1, ..., Cumartesi=5
    }
    const dayKey = String(backendWeekday);
    const dayData = currentDoctor.working_hours?.[dayKey];
    const isLeave = isLeaveDate(selectedDate);
    const isWorking = isWorkingDay(selectedDate);

    return {
      dateStr,
      isLeave,
      isWorking,
      workingHours: dayData ? `${dayData.start || '08:00'} - ${dayData.end || '17:00'}` : null,
      weekday: selectedDate.toLocaleDateString('tr-TR', { weekday: 'long' })
    };
  };

  const dateInfo = selectedDateInfo();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {currentDoctor.title} {currentDoctor.doctor_name || currentDoctor.doctor_username} - Çalışma Takvimi
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Çalışma Günü</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>İzin Günü</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Çalışmıyor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 opacity-50 rounded"></div>
            <span>Hafta Sonu (Kapalı)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
            <span>Bugün</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="react-calendar-wrapper">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className="w-full border-0"
          onClickDay={(date) => {
            const weekday = date.getDay();
            // Hafta sonu günlerine tıklamayı engelle
            if (weekday !== 0 && weekday !== 6) {
              handleDateClick(date);
            }
          }}
          tileDisabled={({ date, view }) => {
            if (view === 'month') {
              const weekday = date.getDay();
              // Hafta sonu günlerini devre dışı bırak
              return weekday === 0 || weekday === 6;
            }
            return false;
          }}
        />
      </div>

      {/* Seçili tarih bilgileri */}
      {dateInfo && (
        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">
            {selectedDate.toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h4>
          
          <div className="space-y-2">
            {dateInfo.isLeave ? (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-red-700 font-medium">🔴 İzin Günü</p>
                <p className="text-sm text-red-600 mt-1">
                  Bu doktor bu tarihte izinli. İzin gününü kaldırmak için takvimde tarihe tıklayın.
                </p>
              </div>
            ) : dateInfo.isWorking ? (
              <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="text-green-700 font-medium">✓ Çalışma Günü</p>
                {dateInfo.workingHours && (
                  <p className="text-sm text-green-600 mt-1">
                    Çalışma Saatleri: <span className="font-semibold">{dateInfo.workingHours}</span>
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  Bu tarihe izin günü eklemek için takvimde tarihe tıklayın.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border-l-4 border-gray-400 rounded">
                <p className="text-gray-700 font-medium">⚪ Çalışmıyor</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const weekday = selectedDate.getDay();
                    if (weekday === 0 || weekday === 6) {
                      return 'Hastanemiz hafta sonu kapalıdır.';
                    }
                    return 'Bu doktor bu gün çalışmıyor.';
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-center text-gray-500 text-sm">
          Güncelleniyor...
        </div>
      )}
    </div>
  );
};

export default DoctorWorkingCalendar;

