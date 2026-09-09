import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

// Pages
import Login from './pages/Login.jsx';
// Admin Portal
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CustomerManager from './pages/admin/CustomerManager.jsx';
import CustomerDetails from './pages/admin/CustomerDetails.jsx';
import EmiManagement from './pages/admin/EmiManagement.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import BackupRestore from './pages/admin/BackupRestore.jsx';
// Customer Portal
import CustomerDashboard from './pages/customer/CustomerDashboard.jsx';
import EmiHistory from './pages/customer/EmiHistory.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

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
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <EmiManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audits"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AuditLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/backup"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <BackupRestore />
                </Layout>
              </ProtectedRoute>
            }
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
      </AuthProvider>
    </BrowserRouter>
  );
}
