import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik token. Lütfen e-posta adresinizdeki linki kullanın.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token bulunamadı.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/password-reset/reset/', {
        token: token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Şifre sıfırlama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Şifre Başarıyla Güncellendi</h2>
            <p className="text-gray-600 mb-6">
              Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Giriş sayfasına yönlendiriliyorsunuz...
            </p>
            <Link
              to="/login"
              className="inline-block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-center"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Yeni Şifre Belirle
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Yeni şifrenizi belirleyin (en az 8 karakter)
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {!token && (
            <div className="rounded-md bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                Token bulunamadı. Lütfen e-posta adresinizdeki linki kullanın.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Yeni Şifre
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="En az 8 karakter"
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                Yeni Şifre (Tekrar)
              </label>
              <input
                id="newPasswordConfirm"
                name="newPasswordConfirm"
                type="password"
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Şifreyi tekrar girin"
                minLength={8}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !token}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              ← Giriş Sayfasına Dön
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

