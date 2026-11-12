import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import TransferPage from './pages/TransferPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';
import AuditorPage from './pages/AuditorPage';
import NotFoundPage from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Account Holder Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout title="Dashboard" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<AppLayout title="My Accounts" />}>
              <Route path="/accounts" element={<AccountsPage />} />
            </Route>
            <Route element={<AppLayout title="Deposit Funds" />}>
              <Route path="/deposit" element={<DepositPage />} />
            </Route>
            <Route element={<AppLayout title="Withdraw Funds" />}>
              <Route path="/withdraw" element={<WithdrawPage />} />
            </Route>
            <Route element={<AppLayout title="Transfer Funds" />}>
              <Route path="/transfer" element={<TransferPage />} />
            </Route>
            <Route element={<AppLayout title="Transaction History" />}>
              <Route path="/transactions" element={<TransactionsPage />} />
            </Route>
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute requiredRole="ROLE_ADMIN" />}>
            <Route element={<AppLayout title="Admin Control Center" />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>

          {/* Protected Auditor Routes */}
          <Route element={<ProtectedRoute requiredRole="ROLE_AUDITOR" />}>
            <Route element={<AppLayout title="Auditor & Reconciliation" />}>
              <Route path="/auditor" element={<AuditorPage />} />
            </Route>
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
