import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount (persistent session)
  useEffect(() => {
    const storedUser = localStorage.getItem('mrs_solar_user');
    const storedToken = localStorage.getItem('mrs_solar_token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('mrs_solar_user');
      }
    }
    setLoading(false);
  }, []);

  // Monitor auth expiration events silently without intrusive popups
  useEffect(() => {
    const handleAuthExpired = () => {
      logout(false);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (usernameOrCustomerId, password) => {
    const response = await api.post('/auth/login', { usernameOrCustomerId, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('mrs_solar_token', token);
    localStorage.setItem('mrs_solar_user', JSON.stringify(userData));
    
    setUser(userData);
    return userData;
  };

  const logout = (notify = false) => {
    localStorage.removeItem('mrs_solar_token');
    localStorage.removeItem('mrs_solar_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
