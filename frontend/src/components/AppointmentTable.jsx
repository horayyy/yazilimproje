const AppointmentTable = ({ appointments, onStatusChange, allowedActions = ['approve', 'complete', 'cancel'], onSendSMS, onAddNotes, onViewReport }) => {
  
  const getStatusBadge = (status) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          statusClasses[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status === 'completed' && 'Tamamlandı'}
        {status === 'cancelled' && 'İptal Edildi'}
        {!['completed', 'cancelled'].includes(status) && status?.charAt(0).toUpperCase() + status?.slice(1)}
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

  const getActionButtons = (appointment) => {
    // Randevular direkt tamamlandı olarak oluşturuluyor, durum değiştirme butonlarına gerek yok
    return <span className="text-gray-400 text-xs">-</span>;
  };

  if (appointments.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">Randevu bulunamadı.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hasta
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Doktor
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
              Notlar
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
                {appointment.patient_name || appointment.patient_username || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {appointment.doctor_name || appointment.doctor_username || 'N/A'}
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
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {appointment.notes || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2 flex-wrap">
                  {onAddNotes && (
                    <button
                      onClick={() => onAddNotes(appointment)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                      title="Notlar Ekle/Düzenle"
                    >
                      📝 Notlar
                    </button>
                  )}
                  {onViewReport && (
                    <button
                      onClick={() => onViewReport(appointment)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md transition-colors"
                      title="Rapor Görüntüle/Oluştur"
                    >
                      📄 Rapor
                    </button>
                  )}
                  {onSendSMS && (
                    <button
                      onClick={() => onSendSMS(appointment)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-md transition-colors"
                      title="Müşteriye SMS Gönder"
                    >
                      📱 SMS
                    </button>
                  )}
                  {!onAddNotes && !onViewReport && !onSendSMS && getActionButtons(appointment)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentTable;

