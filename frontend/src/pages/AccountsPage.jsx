import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import StatusBadge from '../components/common/StatusBadge';
import { exportToCsv } from '../utils/exportCsv';
import {
  Wallet,
  CreditCard,
  RefreshCw,
  Eye,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Hash,
  Download,
  Printer,
} from 'lucide-react';

export const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await accountApi.getMyAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleViewStatement = async (accountId) => {
    setLoadingStatement(true);
    try {
      const stmt = await accountApi.getAccountStatement(accountId);
      setSelectedStatement(stmt);
    } catch (err) {
      console.error('Failed to load statement:', err);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleExportCsv = () => {
    if (!selectedStatement || !selectedStatement.entries) return;
    const headers = ['Direction', 'Type', 'Reference', 'Amount', 'Currency', 'Balance After', 'Date'];
    const rows = selectedStatement.entries.map((e) => [
      e.direction,
      e.transactionType || '',
      e.transactionReference || '',
      e.amount,
      selectedStatement.currency,
      e.balanceAfter,
      e.createdAt,
    ]);
    exportToCsv(`account_statement_${selectedStatement.accountNumber}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Deposit and savings accounts held with LedgerLine Core Banking
          </p>
        </div>
        <button
          onClick={loadAccounts}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Accounts Found</h3>
          <p className="text-xs text-slate-400 mt-1">Please contact your administrator to open a banking account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{acc.accountType}</span>
                  </div>
                  <StatusBadge status={acc.status} />
                </div>

                <div className="my-3">
                  <p className="text-xs text-slate-400 font-mono tracking-wider">ACCOUNT NUMBER</p>
                  <p className="text-lg font-mono font-bold text-slate-900 tracking-wide mt-0.5 select-all">{acc.accountNumber}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Available Balance</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-slate-900">
                      ${Number(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-400 ml-1 font-semibold">{acc.currency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleViewStatement(acc.id)}
                  disabled={loadingStatement}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Statement & Ledger History</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statement Modal / Drawer */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-blue-400">Official Account Statement</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Account {selectedStatement.accountNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStatement(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="p-6 bg-slate-50 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wider block">Account Type</span>
                <span className="font-bold text-slate-800 mt-1 block">{selectedStatement.accountType}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block">Currency</span>
                <span className="font-bold text-slate-800 mt-1 block">{selectedStatement.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedStatement.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-500 uppercase tracking-wider block">Current Balance</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  ${Number(selectedStatement.currentBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Ledger Entries List */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1 text-blue-600" /> Immutable Double-Entry Ledger History
                </span>
                <span className="text-xs text-slate-400">
                  {selectedStatement.entries?.length || 0} entries
                </span>
              </div>

              {!selectedStatement.entries || selectedStatement.entries.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No transaction entries on this account yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="pb-2 font-medium">Direction</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Reference</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Running Balance</th>
                        <th className="pb-2 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedStatement.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5">
                            {entry.direction === 'CREDIT' ? (
                              <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px] inline-flex items-center">
                                <ArrowDownLeft className="w-3 h-3 mr-1" /> CREDIT
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px] inline-flex items-center">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> DEBIT
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 font-medium text-slate-700">
                            {entry.transactionType || '-'}
                          </td>
                          <td className="py-2.5 font-mono text-slate-500 select-all">
                            {entry.transactionReference || '-'}
                          </td>
                          <td className="py-2.5 font-mono text-right font-bold text-slate-900">
                            ${Number(entry.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 font-mono text-right text-slate-600 font-semibold">
                            ${Number(entry.balanceAfter || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right text-slate-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCsv}
                  disabled={!selectedStatement.entries || selectedStatement.entries.length === 0}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedStatement(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
