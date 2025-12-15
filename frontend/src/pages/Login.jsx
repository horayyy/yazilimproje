import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the state so message doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      redirectByUserType(user.user_type);
    }
  }, [isAuthenticated, user]);

  const redirectByUserType = (userType) => {
    switch (userType) {
      case 1: // Admin
        navigate('/admin');
        break;
      case 2: // Secretary
        navigate('/secretary');
        break;
      case 3: // Doctor
        navigate('/doctor');
        break;
      case 4: // Patient
        navigate('/patient');
        break;
      default:
        navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    const result = await login(username, password);

    if (result.success && result.user) {
      // Redirect immediately after successful login
      redirectByUserType(result.user.user_type);
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hastane Randevu Sistemi
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hesabınıza giriş yapın
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Kullanıcı Adı"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm space-y-2">
          <div>
            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
              Şifremi Unuttum
            </Link>
          </div>
          <div>
            <p className="text-gray-600 mb-2">📋 Demo Hesapları:</p>
            <p className="font-mono text-gray-600 mb-4">admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

