import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [useEmail, setUseEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/password-reset/request/', {
        email: useEmail ? email : '',
        username: useEmail ? '' : username,
      });

      setSuccess(true);
    } catch (err) {
      // Güvenlik nedeniyle backend her zaman başarı mesajı döndürür
      // Ama yine de hata durumlarını kontrol edelim
      if (err.response?.status === 500) {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      } else {
        // Backend güvenlik nedeniyle her zaman başarı mesajı döndürür
        setSuccess(true);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">E-posta Gönderildi</h2>
            <p className="text-gray-600 mb-6">
              Eğer bu {useEmail ? 'e-posta adresi' : 'kullanıcı adı'} kayıtlıysa, şifre sıfırlama linki e-posta adresinize gönderilmiştir.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Lütfen e-posta kutunuzu kontrol edin. E-postayı bulamazsanız spam klasörünüze bakın.
            </p>
            <Link
              to="/login"
              className="inline-block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-center"
            >
              Giriş Sayfasına Dön
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
            Şifremi Unuttum
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Şifre sıfırlama linki için e-posta adresinizi veya kullanıcı adınızı girin
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setUseEmail(true)}
              className={`flex-1 px-4 py-2 rounded-lg transition ${
                useEmail
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              E-posta
            </button>
            <button
              type="button"
              onClick={() => setUseEmail(false)}
              className={`flex-1 px-4 py-2 rounded-lg transition ${
                !useEmail
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Kullanıcı Adı
            </button>
          </div>

          <div>
            {useEmail ? (
              <>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta Adresi
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ornek@email.com"
                />
              </>
            ) : (
              <>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı Adı
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="kullanici_adi"
                />
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
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

export default ForgotPassword;

