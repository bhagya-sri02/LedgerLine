import React from 'react';
import { CheckCircle2, X, ArrowUpRight, ArrowDownLeft, ShieldCheck, Hash } from 'lucide-react';
import StatusBadge from './StatusBadge';

export const ReceiptModal = ({ isOpen, onClose, receipt }) => {
  if (!isOpen || !receipt) return null;

  const entries = receipt.entries || [];
  const totalDebits = entries
    .filter((e) => e.direction === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCredits = entries
    .filter((e) => e.direction === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Transaction Posted</p>
              <h3 className="text-lg font-bold text-white">Double-Entry Posting Receipt</h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Amount</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {receipt.currency} {Number(receipt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Type</span>
              <div className="mt-1">
                <StatusBadge status={receipt.transactionType} />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center"><Hash className="w-3.5 h-3.5 mr-1 text-slate-400" /> Reference</span>
              <span className="font-mono text-slate-800 font-medium select-all">{receipt.transactionReference}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={receipt.status} />
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Posted Timestamp</span>
              <span className="text-slate-700 font-medium">{new Date(receipt.postedAt).toLocaleString()}</span>
            </div>
            {receipt.description && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Description</span>
                <span className="text-slate-700">{receipt.description}</span>
              </div>
            )}
          </div>

          {/* Double-Entry Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Immutable Ledger Entries
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Balanced (Debits = Credits)
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-3 space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center space-x-2">
                    {entry.direction === 'CREDIT' ? (
                      <span className="flex items-center text-blue-600 font-semibold bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">
                        <ArrowDownLeft className="w-3 h-3 mr-0.5" /> CR
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-600 font-semibold bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" /> DR
                      </span>
                    )}
                    <span className="font-mono text-slate-700 font-medium">{entry.accountNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-slate-900">
                      ${Number(entry.amount || 0).toFixed(2)}
                    </span>
                    {entry.balanceAfter !== undefined && (
                      <span className="block text-[10px] text-slate-500 font-mono">
                        Bal: ${Number(entry.balanceAfter || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-xs font-mono font-semibold text-slate-600">
                <span>Sum DR: ${totalDebits.toFixed(2)}</span>
                <span>Sum CR: ${totalCredits.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
