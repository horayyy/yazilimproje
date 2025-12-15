import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';

// Component to handle root redirect based on authentication
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  
  // If not authenticated, show homepage
  if (!isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  
  // Redirect based on user type
  switch (user?.user_type) {
    case 1: // Admin
      return <Navigate to="/admin" replace />;
    case 2: // Secretary
      return <Navigate to="/secretary" replace />;
    case 3: // Doctor
      return <Navigate to="/doctor" replace />;
    case 4: // Patient - hasta girişi devre dışı
      return <Navigate to="/login" replace />;
    default:
      return <Navigate to="/home" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedUserTypes={[1]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/secretary"
            element={
              <PrivateRoute allowedUserTypes={[2]}>
                <SecretaryDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <PrivateRoute allowedUserTypes={[3]}>
                <DoctorDashboard />
              </PrivateRoute>
            }
          />
          {/* Patient route kaldırıldı - hasta girişi devre dışı */}
          
          {/* Root route - redirect based on auth status */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
