import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { 
  Sun, Moon, LogOut, Menu, X, Bell, LayoutDashboard, 
  Users, DollarSign, History, Calculator, ShieldAlert,
  FolderLock, Database, CheckCircle, Mail, ChevronRight,
  Search, Languages, Mic
} from 'lucide-react';
import InstallAppBanner from './InstallAppBanner.jsx';
import { translations, getLanguage, setLanguage } from '../utils/translations.js';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Language & Global Search States
  const [lang, setLang] = useState(getLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  // Global hotkey Ctrl+K / Cmd+K for fast search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) {
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    try {
      const res = await api.get('/admin/customers', { params: { search: val.trim() } });
      setSearchResults(res.data.slice(0, 6));
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const toggleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const spokenText = e.results[0][0].transcript;
      handleSearchChange(spokenText);
    };

    recognition.start();
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a'; // dark background
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50 background
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/customer/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.post('/customer/notifications/read', {});
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  const handleNotificationClick = async (n) => {
    setNotificationsOpen(false);

    // Mark single notification read
    if (!n.read) {
      try {
        await api.post('/customer/notifications/read', { id: n._id });
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, read: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }

    // Identify target customer ID if present in notification record or message
    const targetCustomerId = n.customerId || n.message?.match(/SOL-\d+/)?.[0];

    if (user?.role === 'admin') {
      if (targetCustomerId) {
        navigate(`/admin/customers/${targetCustomerId}`);
      } else if (n.type?.includes('Payment') || n.type?.includes('Overdue') || n.type?.includes('Due')) {
        navigate('/admin/emis');
      } else {
        navigate('/admin/customers');
      }
    } else {
      if (n.type?.includes('Payment') || n.type?.includes('Receipt')) {
        navigate('/customer/history');
      } else {
        navigate('/customer');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation links based on role
  const adminLinks = [
    { label: t.dashboard, path: '/admin', icon: LayoutDashboard },
    { label: t.customers, path: '/admin/customers', icon: Users },
    { label: t.emiManagement, path: '/admin/emis', icon: DollarSign },
    { label: t.auditLogs, path: '/admin/audits', icon: FolderLock },
    { label: t.backup, path: '/admin/backup', icon: Database },
    { label: t.emailSettings, path: '/admin/email-settings', icon: Mail }
  ];

  const customerLinks = [
    { label: t.myDashboard, path: '/customer', icon: LayoutDashboard },
    { label: t.paymentHistory, path: '/customer/payments', icon: History }
  ];

  const links = user?.role === 'admin' ? adminLinks : customerLinks;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* MOBILE SIDEBAR COVER */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR COMPONENT */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to={user?.role === 'admin' ? '/admin' : '/customer'} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <Sun className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white">
              MRS <span className="text-teal-600 dark:text-teal-400">SOLAR</span>
            </span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {user?.fullName?.charAt(0) || user?.role?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                {user?.fullName || 'MRS Solar User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.role === 'admin' ? t.roleAdmin : `ID: ${user?.customerId}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 w-full mt-3 px-4 py-2.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800/80 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-sm font-semibold transition-colors outline-none"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 z-30">
          
          {/* Hamburger toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden md:inline text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              {user?.role === 'admin' ? t.roleAdmin : t.roleCustomer}
            </span>
          </div>

          {/* Universal Fast Search Bar (Admin Mode) */}
          {user?.role === 'admin' && (
            <div className="relative flex-1 max-w-sm mx-4 hidden md:block">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  id="global-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                  placeholder={t.quickSearchPlaceholder}
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`absolute right-2 p-1 rounded-lg transition-colors ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-teal-600 dark:hover:text-teal-400'
                  }`}
                  title={isListening ? 'Listening... Speak now' : 'Voice Search'}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Floating Live Search Results Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)}></div>
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/admin/customers/${c._id}`);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-teal-50/60 dark:hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{c.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{c.customerId} • {c.mobileNumber}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                          c.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200/40'
                            : c.paymentStatus === 'Overdue'
                            ? 'bg-red-50 text-red-600 border-red-200/40'
                            : 'bg-orange-50 text-orange-600 border-orange-200/40'
                        }`}>
                          {c.paymentStatus}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right Header items */}
          <div className="flex items-center space-x-3">
            
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => {
                const nextLang = lang === 'en' ? 'ta' : 'en';
                setLang(nextLang);
                setLanguage(nextLang);
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Switch Language / மொழி மாற்றுக"
            >
              <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>

            {/* Install Mobile/Desktop App Button */}
            <InstallAppBanner compact={true} />

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-teal-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Notifications Alert Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-yellow-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">{t.notificationsTitle}</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllRead}
                          className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                        >
                          {t.markAllRead}
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                          {t.noNotifications}
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n._id} 
                            onClick={() => handleNotificationClick(n)}
                            title="Click to open file"
                            className={`p-4 text-xs transition-all cursor-pointer group hover:bg-teal-50/70 dark:hover:bg-slate-900 ${
                              n.read 
                                ? 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400' 
                                : 'bg-teal-50/30 dark:bg-teal-950/20 text-slate-800 dark:text-slate-200 font-medium'
                            }`}
                          >
                            <div className="flex items-start space-x-2.5">
                              {n.type?.includes('Overdue') ? (
                                <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              ) : n.type?.includes('Payment') ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Sun className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                    {n.title}
                                  </p>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                </div>
                                <p className="mt-0.5 leading-relaxed">{n.message}</p>
                                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-850">
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {new Date(n.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                                    {t.openFile}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden flex justify-around items-center px-2 py-2 shadow-lg">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 font-normal hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{link.label}</span>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
