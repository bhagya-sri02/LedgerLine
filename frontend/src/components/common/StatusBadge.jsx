import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const styles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    BALANCED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POSTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CREDIT: 'bg-blue-50 text-blue-700 border-blue-200',

    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    FROZEN: 'bg-amber-50 text-amber-700 border-amber-200',

    CLOSED: 'bg-slate-100 text-slate-700 border-slate-300',
    DEBIT: 'bg-rose-50 text-rose-700 border-rose-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DISCREPANCY_DETECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const currentStyle = styles[normalized] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {normalized}
    </span>
  );
};

export default StatusBadge;
