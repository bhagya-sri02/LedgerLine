import React, { useState, useEffect } from 'react';
import { auditorApi } from '../api/auditorApi';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Lock,
  Layers,
  Activity,
} from 'lucide-react';

export const AuditorPage = () => {
  const [activeTab, setActiveTab] = useState('reconciliation'); // 'reconciliation', 'journals', 'ledger', 'audit-logs'
  const [reconciliation, setReconciliation] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState('');

  const loadAuditorData = async () => {
    try {
      const [reconData, txData, entriesData, logsData] = await Promise.all([
        auditorApi.getGlobalReconciliation(),
        auditorApi.getTransactions(0, 50),
        auditorApi.getLedgerEntries(),
        auditorApi.getAuditLogs(0, 50),
      ]);
      setReconciliation(reconData);
      setTransactions(txData);
      setLedgerEntries(entriesData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Failed to load auditor data:', err);
      setError('Failed to fetch auditor records.');
    } finally {
      setLoading(false);
      setAuditing(false);
    }
  };

  useEffect(() => {
    loadAuditorData();
  }, []);

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const recon = await auditorApi.getGlobalReconciliation();
      setReconciliation(recon);
      loadAuditorData();
    } catch (err) {
      setError('Audit check failed.');
    } finally {
      setAuditing(false);
    }
  };

  const isBalanced = reconciliation?.globalZeroSumBalanced && reconciliation?.discrepantAccountsCount === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Auditor Control & Reconciliation</h2>
            <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              Read-Only
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global general ledger verification, zero-sum audits, and immutable journal examination.
          </p>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={auditing}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
          <span>{auditing ? 'Verifying Ledger Invariants...' : 'Trigger Live Reconciliation'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Global Invariant Card */}
      {reconciliation && (
        <div className={`rounded-2xl border p-6 transition-all ${
          isBalanced
            ? 'bg-gradient-to-r from-emerald-950/20 via-white to-white border-emerald-300'
            : 'bg-gradient-to-r from-rose-950/20 via-white to-white border-rose-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl border ${
                isBalanced
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {isBalanced ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Global Ledger Status
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {isBalanced ? 'SYSTEM BALANCED (ZERO-SUM VERIFIED)' : 'DISCREPANCY DETECTED'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last verified at {new Date(reconciliation.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs">
              <div className="text-right">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Total Debits</span>
                <span className="text-base font-mono font-bold text-slate-800">
                  ${Number(reconciliation.totalGlobalDebits || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Total Credits</span>
                <span className="text-base font-mono font-bold text-slate-800">
                  ${Number(reconciliation.totalGlobalCredits || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right pl-3 border-l border-slate-200">
                <span className="text-slate-500 block uppercase font-mono text-[10px]">Accounts Checked</span>
                <span className="text-base font-bold text-slate-800">{reconciliation.totalAccountsChecked}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'reconciliation'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Reconciliation Audit ({reconciliation?.discrepancies?.length || 0} issues)
        </button>
        <button
          onClick={() => setActiveTab('journals')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'journals'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Journal Transactions ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Raw Ledger Entries ({ledgerEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'audit-logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Operational Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Reconciliation Details */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            Discrepancy Analysis & Account History Match
          </h3>

          {!reconciliation?.discrepancies || reconciliation.discrepancies.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">Zero Discrepancies Detected</p>
              <p className="text-slate-400 mt-1 max-w-md mx-auto">
                Every materialized account balance perfectly equals the historical sum of double-entry ledger entries ($∑\text{Credits} - ∑\text{Debits}$).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Account ID</th>
                    <th className="py-2.5 px-3">Account Number</th>
                    <th className="py-2.5 px-3 text-right">Materialized Balance</th>
                    <th className="py-2.5 px-3 text-right">Ledger Computed</th>
                    <th className="py-2.5 px-3 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliation.discrepancies.map((d, i) => (
                    <tr key={i} className="hover:bg-rose-50/50">
                      <td className="py-2.5 px-3 font-mono">#{d.accountId}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{d.accountNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-800">${Number(d.materializedBalance).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-600">${Number(d.ledgerComputedBalance).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-rose-600">${Number(d.difference).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Journal Transactions */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center space-x-2">
                  <StatusBadge status={tx.status} />
                  <span className="font-bold text-slate-800">{tx.transactionType}</span>
                  <span className="font-mono text-slate-400">Ref: {tx.transactionReference}</span>
                </div>
                <span className="text-slate-400">{new Date(tx.postedAt).toLocaleString()}</span>
              </div>

              {tx.description && (
                <p className="text-xs text-slate-500 my-2">{tx.description}</p>
              )}

              {/* Entries inside this transaction */}
              <div className="mt-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Atomic Balanced Entries ({tx.entries?.length || 0})
                </p>
                <div className="space-y-1.5 text-xs">
                  {tx.entries?.map((e, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-mono">
                        {e.direction === 'CREDIT' ? (
                          <span className="text-blue-600 font-semibold bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">
                            CREDIT
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">
                            DEBIT
                          </span>
                        )}
                        <span className="text-slate-700">{e.accountNumber}</span>
                      </div>
                      <div className="text-right font-mono font-semibold text-slate-900">
                        ${Number(e.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Raw Ledger Entries */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Entry ID</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ledgerEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">#{e.id}</td>
                    <td className="py-3 px-4">
                      {e.direction === 'CREDIT' ? (
                        <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          CREDIT
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                          DEBIT
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 select-all">{e.transactionReference || '-'}</td>
                    <td className="py-3 px-4">{e.transactionType}</td>
                    <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">${Number(e.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-right text-slate-600">${Number(e.balanceAfter).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Metadata</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-purple-700">{log.actor}</td>
                    <td className="py-3 px-4 text-slate-600">{log.entityType}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">#{log.entityId}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-sm truncate">{log.metadata || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditorPage;
