import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
    national_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.password_confirm) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/register/', formData);

      if (response.status === 201) {
        // Redirect to login with success message
        navigate('/login', { 
          state: { message: 'Kayıt başarılı! Lütfen kimlik bilgilerinizle giriş yapın.' } 
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle validation errors
      if (err.response?.data) {
        const errors = err.response.data;
        let errorMessage = 'Registration failed. ';
        
        if (typeof errors === 'object') {
          const errorList = [];
          Object.keys(errors).forEach((key) => {
            if (Array.isArray(errors[key])) {
              errorList.push(`${key}: ${errors[key][0]}`);
            } else if (typeof errors[key] === 'string') {
              errorList.push(`${key}: ${errors[key]}`);
            }
          });
          errorMessage += errorList.join(', ');
        } else if (typeof errors === 'string') {
          errorMessage = errors;
        } else {
          errorMessage = 'Kayıt yapılamadı. Lütfen bilgilerinizi kontrol edin.';
        }
        
        setError(errorMessage);
      } else {
        setError('Kayıt yapılamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hasta Hesabı Oluştur
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Yeni bir hesap için kaydolun
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                Ad <span className="text-red-500">*</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Adınız"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Soyadı <span className="text-red-500">*</span>
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Soyadınız"
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Kullanıcı adınız"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-Posta <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="E-posta adresiniz"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Telefon numaranız"
            />
          </div>

          <div>
            <label htmlFor="national_id" className="block text-sm font-medium text-gray-700">
              T.C. Kimlik No
            </label>
            <input
              id="national_id"
              name="national_id"
              type="text"
              value={formData.national_id}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="T.C. Kimlik numaranız"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Şifre <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Şifre (en az 8 karakter)"
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
              Şifre (Tekrar) <span className="text-red-500">*</span>
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              value={formData.password_confirm}
              onChange={handleChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Şifreyi tekrar girin"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Hesap Oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          <span className="text-gray-600">Zaten hesabınız var mı? </span>
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Giriş Yapın
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

