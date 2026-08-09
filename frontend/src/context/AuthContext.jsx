import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 Minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('mrs_solar_user');
    const storedToken = localStorage.getItem('mrs_solar_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Monitor auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      logout(true); // Log out and trigger warning
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Monitor user activity for Auto-Logout
  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return;
    }

    // Set up activity listeners
    const resetTimer = () => {
      clearInactivityTimer();
      inactivityTimerRef.current = setTimeout(() => {
        console.log('[Inactivity] User inactive for 15m. Logging out...');
        alert('You have been logged out due to 15 minutes of inactivity.');
        logout();
      }, INACTIVITY_LIMIT_MS);
    };

    // Initialise timer
    resetTimer();

    // Bind listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearInactivityTimer();
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };

  const login = async (usernameOrCustomerId, password) => {
    const response = await api.post('/auth/login', { usernameOrCustomerId, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('mrs_solar_token', token);
    localStorage.setItem('mrs_solar_user', JSON.stringify(userData));
    
    setUser(userData);
    return userData;
  };

  const logout = (isExpired = false) => {
    clearInactivityTimer();
    localStorage.removeItem('mrs_solar_token');
    localStorage.removeItem('mrs_solar_user');
    setUser(null);
    if (isExpired) {
      alert('Your session has expired. Please log in again.');
    }
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
