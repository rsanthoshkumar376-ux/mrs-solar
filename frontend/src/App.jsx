import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

// Pages
import Login from './pages/Login.jsx';

// Admin Portal (Lazy loaded for fast cold start and small initial bundle)
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const CustomerManager = React.lazy(() => import('./pages/admin/CustomerManager.jsx'));
const CustomerDetails = React.lazy(() => import('./pages/admin/CustomerDetails.jsx'));
const AuditLogs = React.lazy(() => import('./pages/admin/AuditLogs.jsx'));
const BackupRestore = React.lazy(() => import('./pages/admin/BackupRestore.jsx'));
const EmailSettings = React.lazy(() => import('./pages/admin/EmailSettings.jsx'));
const UpiSettings = React.lazy(() => import('./pages/admin/UpiSettings.jsx'));
const Settings = React.lazy(() => import('./pages/admin/Settings.jsx'));

// Customer Portal (Lazy loaded)
const CustomerDashboard = React.lazy(() => import('./pages/customer/CustomerDashboard.jsx'));
const EmiHistory = React.lazy(() => import('./pages/customer/EmiHistory.jsx'));

// Referral & New Customer Standalone Portal
const ReferralPortal = React.lazy(() => import('./pages/ReferralPortal.jsx'));

function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-slate-500 animate-pulse tracking-wide">Loading portal view...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <React.Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/referral" element={<ReferralPortal />} />
            <Route path="/refer" element={<ReferralPortal />} />
            <Route path="/join" element={<ReferralPortal />} />

          {/* Owner/Admin Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CustomerManager />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CustomerDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/emis"
            element={<Navigate to="/admin/customers" replace />}
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audits"
            element={<Navigate to="/admin/settings?tab=audits" replace />}
          />
          <Route
            path="/admin/backup"
            element={<Navigate to="/admin/settings?tab=backup" replace />}
          />
          <Route
            path="/admin/email-settings"
            element={<Navigate to="/admin/settings?tab=email" replace />}
          />
          <Route
            path="/admin/upi-settings"
            element={<Navigate to="/admin/settings?tab=upi" replace />}
          />

          {/* Customer Portal Routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Layout>
                  <CustomerDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/payments"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Layout>
                  <EmiHistory />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
