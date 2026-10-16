import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, CreditCard, Mail, Database, 
  FolderLock, ShieldCheck
} from 'lucide-react';
import { translations, getLanguage } from '../../utils/translations.js';

// Subcomponents
import UpiSettings from './UpiSettings.jsx';
import EmailSettings from './EmailSettings.jsx';
import BackupRestore from './BackupRestore.jsx';
import AuditLogs from './AuditLogs.jsx';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lang, setLang] = useState(getLanguage);

  useEffect(() => {
    const handleLangChange = () => setLang(getLanguage());
    window.addEventListener('language-change', handleLangChange);
    return () => window.removeEventListener('language-change', handleLangChange);
  }, []);

  const t = translations[lang] || translations.en;

  // Current tab from query string (?tab=upi | email | backup | audits)
  const currentTab = searchParams.get('tab') || 'upi';

  const tabs = [
    {
      id: 'upi',
      label: t.tabUpi || 'UPI Gateway',
      description: t.tabUpiDesc || 'Payment VPAs & QR codes',
      icon: CreditCard
    },
    {
      id: 'email',
      label: t.tabEmail || 'Email & SMTP',
      description: t.tabEmailDesc || 'SMTP & reminder alerts',
      icon: Mail
    },
    {
      id: 'backup',
      label: t.tabBackup || 'Database Backup',
      description: t.tabBackupDesc || 'Snapshots & data restore',
      icon: Database
    },
    {
      id: 'audits',
      label: t.tabAudits || 'Audit Logs',
      description: t.tabAuditsDesc || 'System events & actions',
      icon: FolderLock
    }
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      
      {/* HUB HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <SettingsIcon className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <span>{t.settingsTitle || 'Settings Hub'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-full">
                  Admin Control
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t.settingsHubSubtitle || 'Manage UPI payment gateways, automated email alerts, database backups, and administrative audit logs in one central control hub.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UNIFIED TAB NAVIGATION BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center space-x-2.5 px-3.5 py-2.5 sm:py-3 rounded-xl text-left transition-all duration-200 outline-none ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm shadow-slate-900/5 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors shrink-0 ${
                isActive 
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' 
                  : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm block truncate">{tab.label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-normal hidden sm:block">
                  {tab.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT VIEW */}
      <div className="mt-6 pt-2">
        {currentTab === 'upi' && <UpiSettings />}
        {currentTab === 'email' && <EmailSettings />}
        {currentTab === 'backup' && <BackupRestore />}
        {currentTab === 'audits' && <AuditLogs />}
      </div>

    </div>
  );
}
