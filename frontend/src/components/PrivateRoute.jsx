import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedUserTypes = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Hasta girişi engellendi
  if (user && user.user_type === 4) {
    return <Navigate to="/login" replace />;
  }

  // If specific user types are required, check if current user type is allowed
  if (allowedUserTypes.length > 0 && user && !allowedUserTypes.includes(user.user_type)) {
    // Redirect to appropriate dashboard based on user type
    switch (user.user_type) {
      case 1: // Admin
        return <Navigate to="/admin" replace />;
      case 2: // Secretary
        return <Navigate to="/secretary" replace />;
      case 3: // Doctor
        return <Navigate to="/doctor" replace />;
      case 4: // Patient - hasta girişi devre dışı
        return <Navigate to="/login" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute;

