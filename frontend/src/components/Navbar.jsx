import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await apiClient.post('/password/change/', passwordData);
      setPasswordSuccess('Şifreniz başarıyla güncellendi.');
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      if (err.response?.data?.detail) {
        setPasswordError(err.response.data.detail);
      } else {
        setPasswordError('Şifre değiştirme sırasında bir hata oluştu.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getUserDisplayName = () => {
    if (user?.user_type === 3) {
      // Doctor
      return `Dr. ${user?.first_name || user?.username}`;
    }
    return user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User';
  };

  return (
    <>
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Hastane Sistemi</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hoşgeldiniz, {getUserDisplayName()}</span>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors duration-200 text-sm"
              >
                Şifre Değiştir
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors duration-200"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Şifre Değiştirme Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Şifre Değiştir</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    old_password: '',
                    new_password: '',
                    new_password_confirm: '',
                  });
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mevcut Şifre <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="En az 8 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre (Tekrar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordData.new_password_confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      old_password: '',
                      new_password: '',
                      new_password_confirm: '',
                    });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {changingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

