import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { auditorApi } from '../api/auditorApi';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import ConfirmationModal from '../components/common/ConfirmationModal';
import {
  Users,
  CreditCard,
  ShieldAlert,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  X,
  Activity,
  DollarSign,
} from 'lucide-react';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'accounts', 'audits'
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isOpenAccountOpen, setIsOpenAccountOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('ROLE_ACCOUNT_HOLDER');

  const [openUserId, setOpenUserId] = useState('');
  const [openAccountType, setOpenAccountType] = useState('CHECKING');
  const [openCurrency, setOpenCurrency] = useState('USD');
  const [openInitialDeposit, setOpenInitialDeposit] = useState('100.00');

  const [modalSubmitting, setModalSubmitting] = useState(false);

  const loadAdminData = async () => {
    try {
      const [usersData, accountsData] = await Promise.all([
        adminApi.getAllUsers(),
        adminApi.getAllAccounts(),
      ]);
      setUsers(usersData);
      setAccounts(accountsData);

      try {
        const logs = await auditorApi.getAuditLogs(0, 30);
        setAuditLogs(logs);
      } catch (err) {
        console.warn('Could not fetch audit logs:', err);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setError('Failed to fetch administrative data from backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Add User handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setError('');
    try {
      await adminApi.createUser({
        username: newUsername.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      });
      showSuccess(`User '${newUsername}' registered successfully.`);
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('ROLE_ACCOUNT_HOLDER');
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Account handler
  const handleOpenAccount = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setError('');
    try {
      await adminApi.createAccount({
        userId: parseInt(openUserId, 10),
        accountType: openAccountType,
        currency: openCurrency,
        initialDeposit: parseFloat(openInitialDeposit) || 0,
      });
      showSuccess('Bank account opened successfully with initial deposit.');
      setIsOpenAccountOpen(false);
      setOpenInitialDeposit('100.00');
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Update Account Status handler
  const handleUpdateStatus = async (accountId, newStatus) => {
    try {
      await adminApi.updateAccountStatus(accountId, newStatus);
      showSuccess(`Account ${accountId} status updated to ${newStatus}.`);
      setConfirmAction(null);
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update account status.');
    }
  };

  const totalBalanceAll = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Control Center</h2>
          <p className="text-sm text-slate-500 mt-1">
            System management, account origination, status governance, and audit trails
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Users"
          value={loading ? '...' : users.length}
          icon={Users}
          description="Registered system actors"
          color="blue"
        />
        <StatCard
          title="Active Accounts"
          value={loading ? '...' : accounts.filter((a) => a.status === 'ACTIVE').length}
          icon={CreditCard}
          description="Open operational ledger accounts"
          color="emerald"
        />
        <StatCard
          title="Total Assets Under Custody"
          value={loading ? '...' : `$${totalBalanceAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          description="Sum of all customer balances"
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Accounts Control ({accounts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-3 transition border-b-2 flex items-center space-x-2 ${
            activeTab === 'audits'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Registered System Users</span>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">#{u.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.username}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Seed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Accounts */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Master Ledger Accounts</span>
            <button
              onClick={() => setIsOpenAccountOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Account Number</th>
                  <th className="py-3 px-4">Owner ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 select-all">{acc.accountNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">User #{acc.userId}</td>
                    <td className="py-3 px-4">{acc.accountType}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{acc.currency}</td>
                    <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">
                      ${Number(acc.balance || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {acc.accountType !== 'SYSTEM_CLEARING' && (
                        <div className="inline-flex space-x-1">
                          {acc.status === 'ACTIVE' ? (
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  accountId: acc.id,
                                  accountNumber: acc.accountNumber,
                                  newStatus: 'FROZEN',
                                })
                              }
                              className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-semibold transition"
                            >
                              Freeze
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  accountId: acc.id,
                                  accountNumber: acc.accountNumber,
                                  newStatus: 'ACTIVE',
                                })
                              }
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold transition"
                            >
                              Activate
                            </button>
                          )}
                          {acc.status !== 'CLOSED' && (
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  accountId: acc.id,
                                  accountNumber: acc.accountNumber,
                                  newStatus: 'CLOSED',
                                })
                              }
                              className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-semibold transition"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">System Audit Trail</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Metadata</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-purple-700">{log.actor}</td>
                    <td className="py-3 px-4 text-slate-600">{log.entityType}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">#{log.entityId}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">{log.metadata || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Provision New User</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  placeholder="e.g. alice_smith"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="alice@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Assigned Security Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ROLE_ACCOUNT_HOLDER">Account Holder (Customer)</option>
                  <option value="ROLE_ADMIN">Administrator</option>
                  <option value="ROLE_AUDITOR">Auditor (Read-Only Compliance)</option>
                </select>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20"
                >
                  {modalSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Account */}
      {isOpenAccountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Open Banking Account</h3>
              <button onClick={() => setIsOpenAccountOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Select Beneficiary User</label>
                <select
                  value={openUserId}
                  onChange={(e) => setOpenUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      #{u.id} - {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">Account Type</label>
                  <select
                    value={openAccountType}
                    onChange={(e) => setOpenAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="CHECKING">CHECKING</option>
                    <option value="SAVINGS">SAVINGS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 uppercase mb-1">Currency</label>
                  <select
                    value={openCurrency}
                    onChange={(e) => setOpenCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Initial Opening Deposit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openInitialDeposit}
                  onChange={(e) => setOpenInitialDeposit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-400">Funds are credited atomically with a balanced double-entry deposit receipt.</p>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpenAccountOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !openUserId}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20"
                >
                  {modalSubmitting ? 'Opening...' : 'Open Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Account Status Changes */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            handleUpdateStatus(confirmAction.accountId, confirmAction.newStatus);
          }
        }}
        title={`Confirm Account Status: ${confirmAction?.newStatus}`}
        message={
          confirmAction?.newStatus === 'FROZEN'
            ? `Are you sure you want to FREEZE Account #${confirmAction?.accountNumber}? All transaction processing will be blocked immediately.`
            : confirmAction?.newStatus === 'CLOSED'
            ? `Are you sure you want to CLOSE Account #${confirmAction?.accountNumber}? This will permanently shut down account transaction operations.`
            : `Are you sure you want to set Account #${confirmAction?.accountNumber} to ACTIVE?`
        }
        confirmText={
          confirmAction?.newStatus === 'FROZEN'
            ? 'Freeze Account'
            : confirmAction?.newStatus === 'CLOSED'
            ? 'Close Account'
            : 'Activate Account'
        }
        confirmVariant={confirmAction?.newStatus === 'ACTIVE' ? 'primary' : 'danger'}
      />
    </div>
  );
};

export default AdminPage;
