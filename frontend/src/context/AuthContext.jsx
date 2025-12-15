import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import apiClient from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing tokens on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (accessToken) {
        try {
          // Decode token to get user info
          const decoded = jwtDecode(accessToken);
          
          // Check if token is expired
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
            // Token expired, try to refresh
            if (refreshToken) {
              try {
                const response = await axios({
                  method: 'post',
                  url: 'http://127.0.0.1:8000/api/token/refresh/',
                  data: { refresh: refreshToken },
                });
                
                const { access } = response.data;
                localStorage.setItem('access_token', access);
                
                // Decode new token
                const newDecoded = jwtDecode(access);
                setUser({
                  id: newDecoded.user_id,
                  username: newDecoded.username,
                  user_type: newDecoded.user_type,
                  email: newDecoded.email || null,
                });
              } catch (error) {
                // Refresh failed, clear storage
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
              }
            } else {
              localStorage.removeItem('access_token');
              setUser(null);
            }
          } else {
            // Token is valid, set user from token
            setUser({
              id: decoded.user_id,
              username: decoded.username,
              user_type: decoded.user_type,
              email: decoded.email || null,
            });
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      // Use plain axios for login (no token needed)
      const response = await axios.post('http://127.0.0.1:8000/api/token/', {
        username,
        password,
      });

      const { access, refresh, user_id, username: userUsername, user_type, email } = response.data;

      // Save tokens to localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify({
        id: user_id,
        username: userUsername,
        user_type,
        email,
      }));

      // Set user state
      const userData = {
        id: user_id,
        username: userUsername,
        user_type,
        email: email || null,
      };
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed. Please check your credentials.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

