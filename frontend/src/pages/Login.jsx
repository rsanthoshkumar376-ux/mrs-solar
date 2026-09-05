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
      if (!err.response) {
        setError('Server is initializing. Retrying automatically, please wait a moment...');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
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
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 px-4 ${
      roleTab === 'customer'
        ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-100 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950'
        : 'bg-gradient-to-br from-teal-500/10 via-slate-900/10 to-slate-100 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-950'
    }`}>
      {/* Dark mode switcher in corner */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 p-2.5 rounded-full glass border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shadow-sm"
        aria-label="Toggle theme"
      >
        {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>

      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl mb-3 transition-all duration-500 ${
            roleTab === 'customer' 
              ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/30' 
              : 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-teal-500/30'
          }`}>
            {roleTab === 'customer' ? (
              <Sun className="w-10 h-10 text-yellow-200 animate-spin" style={{ animationDuration: '20s' }} />
            ) : (
              <Lock className="w-9 h-9 text-emerald-100" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            MRS <span className={roleTab === 'customer' ? 'text-amber-500 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}>SOLAR</span>
          </h1>
          <div className="mt-1 flex items-center space-x-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              roleTab === 'customer'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
            }`}>
              {roleTab === 'customer' ? 'Customer Self-Service Portal' : 'Owner / Admin Portal'}
            </span>
          </div>
        </div>

        {/* LOGIN CONTAINER */}
        <div className="glass-premium rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-200/80 dark:border-slate-800">
          {/* Card background decorative shapes */}
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all duration-500 ${
            roleTab === 'customer' ? 'bg-amber-500/20' : 'bg-teal-500/20'
          }`}></div>
          <div className={`absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-2xl transition-all duration-500 ${
            roleTab === 'customer' ? 'bg-orange-500/20' : 'bg-emerald-500/20'
          }`}></div>

          {/* TAB HEADERS */}
          <div className="flex space-x-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl mb-8 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => selectTab('customer')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                roleTab === 'customer'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Login</span>
            </button>
            <button
              onClick={() => selectTab('admin')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                roleTab === 'admin'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Owner / Admin</span>
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm mb-6">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {roleTab === 'customer' ? 'Customer Name or Customer ID' : 'Admin Username'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={roleTab === 'customer' ? 'e.g. Radhika Ramesh or SOL-1001' : 'e.g. MRSassociates'}
                  className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm ${
                    roleTab === 'customer' 
                      ? 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                      : 'border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-xl py-3 pl-10 pr-4 outline-none transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm ${
                    roleTab === 'customer' 
                      ? 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' 
                      : 'border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 font-bold rounded-xl transition-all text-white shadow-lg text-sm flex items-center justify-center space-x-2 ${
                roleTab === 'customer'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/20'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                <span>Sign In as {roleTab === 'customer' ? 'Customer' : 'Owner'}</span>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
