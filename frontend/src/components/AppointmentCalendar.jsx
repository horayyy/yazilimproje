import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const AppointmentCalendar = ({ appointments, onDateSelect, selectedDate, mode = 'appointments' }) => {
  // mode: 'appointments' (randevu sayısı) veya 'revenue' (gelir)

  // Helper function to format date in local timezone (YYYY-MM-DD)
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date) => {
    const dateStr = formatLocalDate(date);
    return appointments.filter(apt => apt.date === dateStr);
  };

  // Get appointment count for a date
  const getAppointmentCount = (date) => {
    return getAppointmentsForDate(date).length;
  };

  // Get total revenue for a specific date (from created_at, only completed appointments)
  const getRevenueForDate = (date) => {
    const dateStr = formatLocalDate(date);
    const dateAppointments = appointments.filter(apt => {
      if (!apt.created_at || apt.status !== 'completed') return false;
      const createdDate = new Date(apt.created_at);
      const createdStr = formatLocalDate(createdDate);
      return createdStr === dateStr;
    });
    
    return dateAppointments.reduce((sum, apt) => {
      const fee = apt.fee ? parseFloat(apt.fee) : 500.00;
      return sum + fee;
    }, 0);
  };

  // Custom tile content - mode'a göre randevu sayısı veya gelir gösterir
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      if (mode === 'appointments') {
        // Randevu sayısı modu
        const count = getAppointmentCount(date);
        if (count > 0) {
          return (
            <div className="flex items-center justify-center mt-1">
              <span className="bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {count}
              </span>
            </div>
          );
        }
      } else if (mode === 'revenue') {
        // Gelir modu
        const revenue = getRevenueForDate(date);
        if (revenue > 0) {
          return (
            <div className="flex items-center justify-center mt-1">
              <span className="text-xs font-semibold text-green-600">
                {revenue.toFixed(0)}₺
              </span>
            </div>
          );
        }
      }
    }
    return null;
  };

  // Custom tile className - mode'a göre vurgulama
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatLocalDate(date);
      const today = formatLocalDate(new Date());
      
      if (mode === 'appointments') {
        const count = getAppointmentCount(date);
        if (count > 0) {
          if (dateStr === today) {
            return 'bg-blue-100 border-2 border-blue-500';
          }
          return 'bg-indigo-50';
        }
      } else if (mode === 'revenue') {
        const revenue = getRevenueForDate(date);
        if (revenue > 0) {
          if (dateStr === today) {
            return 'bg-green-100 border-2 border-green-500';
          }
          return 'bg-green-50';
        }
      }
    }
    return null;
  };

  // Handle date click
  const handleDateChange = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {mode === 'appointments' ? '📅 Randevu Takvimi' : '💰 Gelir Takvimi'}
        </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
          {mode === 'appointments' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
                <span>Randevu var</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                <span>Bugün</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-green-600">500₺</span>
                <span>Gelir var</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                <span>Bugün</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="react-calendar-wrapper">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className="w-full border-0"
        />
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800">
              {selectedDate.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h4>
            {mode === 'revenue' && (() => {
              const revenue = getRevenueForDate(selectedDate);
              if (revenue > 0) {
                return (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                    💰 {revenue.toFixed(2)} TL
                  </div>
                );
              }
              return null;
            })()}
            {mode === 'appointments' && (
              <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                📅 {getAppointmentCount(selectedDate)} randevu
              </div>
            )}
          </div>
          {mode === 'appointments' && getAppointmentsForDate(selectedDate).length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getAppointmentsForDate(selectedDate).map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 bg-gray-50 rounded-lg border-l-4 border-indigo-500"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {apt.patient_name || apt.patient_username || 'Hasta'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {apt.doctor_name || apt.doctor_username || 'Doktor'}
                        {apt.department_name && ` - ${apt.department_name}`}
                      </p>
                      <p className="text-sm text-indigo-600 font-medium mt-1">
                        {apt.time ? new Date(`2000-01-01T${apt.time}`).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        apt.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : apt.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : apt.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {apt.status === 'pending' && 'Beklemede'}
                      {apt.status === 'confirmed' && 'Onaylandı'}
                      {apt.status === 'completed' && 'Tamamlandı'}
                      {apt.status === 'cancelled' && 'İptal Edildi'}
                    </span>
                  </div>
                  {apt.notes && (
                    <p className="text-xs text-gray-500 mt-2">{apt.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Bu tarihte randevu bulunmamaktadır.</p>
          )}
          {mode === 'revenue' && (() => {
            const revenue = getRevenueForDate(selectedDate);
            const dateStr = selectedDate.toISOString().split('T')[0];
            const dateAppointments = appointments.filter(apt => {
              if (!apt.created_at || apt.status !== 'completed') return false;
              const createdDate = new Date(apt.created_at);
              const createdYear = createdDate.getFullYear();
              const createdMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
              const createdDay = String(createdDate.getDate()).padStart(2, '0');
              const createdStr = `${createdYear}-${createdMonth}-${createdDay}`;
              return createdStr === dateStr;
            });
            
            if (revenue > 0) {
              return (
                <div className="space-y-2">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-lg font-semibold text-green-700 mb-2">
                      💰 Toplam Gelir: {revenue.toFixed(2)} TL
                    </p>
                    <p className="text-sm text-gray-600">
                      {dateAppointments.length} randevu tamamlandı
                    </p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dateAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-500"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {apt.patient_name || apt.patient_username || 'Hasta'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {apt.doctor_name || apt.doctor_username || 'Doktor'}
                            </p>
                            <p className="text-sm text-indigo-600 font-medium mt-1">
                              {apt.time ? new Date(`2000-01-01T${apt.time}`).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              {apt.fee ? parseFloat(apt.fee).toFixed(2) : '500.00'} TL
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else {
              return (
                <p className="text-gray-500 text-sm">Bu tarihte gelir bulunmamaktadır.</p>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;

