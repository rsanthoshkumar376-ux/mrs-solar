import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sun, Moon, Lock, User, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [roleTab, setRoleTab] = useState('customer'); // 'customer' or 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Handle routing if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    }
  }, [user, navigate]);

  // Handle dark mode class toggling
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/customer');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (tab) => {
    setRoleTab(tab);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/10 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 transition-colors duration-300 px-4">
      {/* Dark mode switcher in corner */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 p-2 rounded-full glass border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        aria-label="Toggle theme"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-teal-600 dark:bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 animate-pulse-soft">
            <Sun className="w-10 h-10 text-yellow-300 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            MRS <span className="text-teal-600 dark:text-teal-400">SOLAR</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Solar Loan Management Portal</p>
        </div>

        {/* LOGIN CONTAINER */}
        <div className="glass-premium rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Card background decorative shapes */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl"></div>

          {/* TAB HEADERS */}
          <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-8">
            <button
              onClick={() => selectTab('customer')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                roleTab === 'customer'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Customer Login
            </button>
            <button
              onClick={() => selectTab('admin')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                roleTab === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Owner/Admin Login
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {roleTab === 'customer' ? 'Customer ID' : 'Username/Email'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={roleTab === 'customer' ? 'e.g. SOL-1001' : 'e.g. MRSassociates'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 text-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
