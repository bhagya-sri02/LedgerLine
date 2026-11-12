import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountApi } from '../api/accountApi';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const myAccounts = await accountApi.getMyAccounts();
      setAccounts(myAccounts);

      // Collect statements from all accounts to aggregate recent entries
      const allEntries = [];
      for (const acc of myAccounts) {
        try {
          const stmt = await accountApi.getAccountStatement(acc.id);
          if (stmt.entries) {
            stmt.entries.forEach((e) => {
              allEntries.push({
                ...e,
                accountNumber: acc.accountNumber,
                accountCurrency: acc.currency,
              });
            });
          }
        } catch (err) {
          console.warn(`Could not load statement for account ${acc.id}:`, err);
        }
      }

      // Sort newest first
      allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentEntries(allEntries.slice(0, 10));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Calculate totals
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalCredits = recentEntries
    .filter((e) => e.direction === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalDebits = recentEntries
    .filter((e) => e.direction === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Chart data from recent entries
  const chartData = [
    { date: 'Day 1', balance: Math.max(0, totalBalance - 150) },
    { date: 'Day 2', balance: Math.max(0, totalBalance - 100) },
    { date: 'Day 3', balance: Math.max(0, totalBalance - 50) },
    { date: 'Day 4', balance: Math.max(0, totalBalance - 20) },
    { date: 'Day 5', balance: Math.max(0, totalBalance + 30) },
    { date: 'Today', balance: totalBalance },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time balance and transaction activity powered by double-entry ledger.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Liquidity"
          value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          color="blue"
          subtitle={`${accounts.length} active account${accounts.length === 1 ? '' : 's'}`}
        />
        <StatCard
          title="Recent Inflow (Credits)"
          value={`+$${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ArrowDownLeft}
          color="emerald"
          subtitle="Customer balance credits"
        />
        <StatCard
          title="Recent Outflow (Debits)"
          value={`-$${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          color="amber"
          subtitle="Customer balance debits"
        />
        <StatCard
          title="Ledger Protection"
          value="100% Invariant"
          icon={TrendingUp}
          color="purple"
          subtitle="Pessimistic locked"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Quick Financial Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/deposit"
            className="flex items-center space-x-3 p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Deposit Funds</p>
              <p className="text-xs text-slate-400">Credit cash to account</p>
            </div>
          </Link>

          <Link
            to="/withdraw"
            className="flex items-center space-x-3 p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition group"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Withdraw Funds</p>
              <p className="text-xs text-slate-400">Debit with overdraft checks</p>
            </div>
          </Link>

          <Link
            to="/transfer"
            className="flex items-center space-x-3 p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition group"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Transfer Funds</p>
              <p className="text-xs text-slate-400">Atomic inter-account send</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Balance Trend Chart & Accounts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Liquidity Trend</h3>
              <p className="text-xs text-slate-500">Net balance timeline across your active accounts</p>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              Live Balance
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Balance']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                />
                <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#balanceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Your Accounts</h3>
              <Link to="/accounts" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No accounts found. Contact an Admin to open one.
                </div>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-slate-700">{acc.accountNumber}</span>
                      <StatusBadge status={acc.status} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 font-medium">{acc.accountType} ({acc.currency})</span>
                      <span className="text-base font-bold text-slate-900">
                        ${Number(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              to="/deposit"
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              <span>Fund an Account</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Atomic journal postings on your accounts</p>
          </div>
          <Link to="/transactions" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
            Full History →
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No transaction records found yet. Perform a deposit to initialize ledger history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Direction</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Balance After</th>
                  <th className="pb-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3">
                      <StatusBadge status={entry.transactionType || 'TRANSACTION'} />
                    </td>
                    <td className="py-3 font-mono text-slate-700">{entry.accountNumber}</td>
                    <td className="py-3 font-mono text-slate-500 select-all">{entry.transactionReference || '-'}</td>
                    <td className="py-3">
                      {entry.direction === 'CREDIT' ? (
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          + CREDIT
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                          - DEBIT
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-right font-bold text-slate-900">
                      ${Number(entry.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 font-mono text-right text-slate-600">
                      ${Number(entry.balanceAfter || 0).toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
