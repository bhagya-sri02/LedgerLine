import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import StatusBadge from '../components/common/StatusBadge';
import { exportToCsv } from '../utils/exportCsv';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Download,
} from 'lucide-react';

export const TransactionsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const myAccounts = await accountApi.getMyAccounts();
      setAccounts(myAccounts);

      const allEntries = [];
      for (const acc of myAccounts) {
        try {
          const stmt = await accountApi.getAccountStatement(acc.id);
          if (stmt.entries) {
            stmt.entries.forEach((e) => {
              allEntries.push({
                ...e,
                accountId: acc.id,
                accountNumber: acc.accountNumber,
                accountCurrency: acc.currency,
              });
            });
          }
        } catch (err) {
          console.warn(`Could not load statement for account ${acc.id}:`, err);
        }
      }

      allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEntries(allEntries);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    // Account filter
    if (selectedAccountId !== 'ALL' && entry.accountId.toString() !== selectedAccountId) {
      return false;
    }
    // Direction filter
    if (directionFilter !== 'ALL' && entry.direction !== directionFilter) {
      return false;
    }
    // Date filter
    if (startDate) {
      const entryTime = new Date(entry.createdAt).getTime();
      const startDateTime = new Date(`${startDate}T00:00:00`).getTime();
      if (entryTime < startDateTime) return false;
    }
    if (endDate) {
      const entryTime = new Date(entry.createdAt).getTime();
      const endDateTime = new Date(`${endDate}T23:59:59.999`).getTime();
      if (entryTime > endDateTime) return false;
    }
    // Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const ref = (entry.transactionReference || '').toLowerCase();
      const desc = (entry.description || '').toLowerCase();
      const type = (entry.transactionType || '').toLowerCase();
      const acc = (entry.accountNumber || '').toLowerCase();
      if (!ref.includes(term) && !desc.includes(term) && !type.includes(term) && !acc.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const handleExportCsv = () => {
    if (!filteredEntries || filteredEntries.length === 0) return;
    const headers = [
      'Transaction Type',
      'Account Number',
      'Direction',
      'Reference',
      'Description',
      'Amount',
      'Currency',
      'Balance After',
      'Timestamp',
    ];
    const rows = filteredEntries.map((e) => [
      e.transactionType || '',
      e.accountNumber || '',
      e.direction,
      e.transactionReference || '',
      e.description || '',
      e.amount,
      e.accountCurrency || 'USD',
      e.balanceAfter,
      e.createdAt,
    ]);
    exportToCsv(`transactions_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Transaction History</h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable double-entry ledger postings across your accounts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredEntries.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchTransactions}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, description, account..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Account Filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id.toString()}>
                {acc.accountNumber}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="ALL">All Directions</option>
            <option value="CREDIT">Credits (+)</option>
            <option value="DEBIT">Debits (-)</option>
          </select>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-slate-400 hover:text-slate-600 text-xs ml-1 font-bold"
                title="Clear date filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No matching transactions found</p>
            <p className="text-slate-400 mt-0.5">Try altering your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 font-medium">Type</th>
                  <th className="py-3.5 px-4 font-medium">Account</th>
                  <th className="py-3.5 px-4 font-medium">Direction</th>
                  <th className="py-3.5 px-4 font-medium">Reference & Memo</th>
                  <th className="py-3.5 px-4 font-medium text-right">Amount</th>
                  <th className="py-3.5 px-4 font-medium text-right">Balance After</th>
                  <th className="py-3.5 px-4 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <StatusBadge status={entry.transactionType || 'TRANSACTION'} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {entry.accountNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      {entry.direction === 'CREDIT' ? (
                        <span className="inline-flex items-center text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[11px]">
                          <ArrowDownLeft className="w-3 h-3 mr-1" /> CREDIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[11px]">
                          <ArrowUpRight className="w-3 h-3 mr-1" /> DEBIT
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-800 font-semibold select-all">{entry.transactionReference || '-'}</p>
                      {entry.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{entry.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-right font-bold text-slate-900 text-sm">
                      ${Number(entry.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-right text-slate-600 font-semibold">
                      ${Number(entry.balanceAfter || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
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

export default TransactionsPage;
