import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { transactionApi } from '../api/transactionApi';
import ReceiptModal from '../components/common/ReceiptModal';
import { ArrowDownCircle, AlertCircle, CheckCircle, Wallet, ShieldCheck, DollarSign } from 'lucide-react';

export const DepositPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await accountApi.getMyAccounts();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccountId(data[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
        setError('Failed to load active accounts.');
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const selectedAccount = accounts.find((a) => a.id.toString() === selectedAccountId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive deposit amount.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await transactionApi.deposit({
        accountId: parseInt(selectedAccountId, 10),
        amount: numAmount.toFixed(4),
        currency: selectedAccount ? selectedAccount.currency : 'USD',
        description: description.trim() || 'Online Cash Deposit',
      });

      setReceipt(res);
      setAmount('');
      setDescription('');

      // Refresh accounts list
      const updated = await accountApi.getMyAccounts();
      setAccounts(updated);
    } catch (err) {
      console.error('Deposit failed:', err);
      const msg = err.response?.data?.message || 'Deposit transaction failed. Please check your inputs.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Deposit Funds</h2>
        <p className="text-sm text-slate-500 mt-1">
          Credit funds directly into your core ledger account with instant double-entry posting.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Destination Account
            </label>
            {loadingAccounts ? (
              <div className="text-xs text-slate-400 py-2">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-xs text-rose-500 py-2">No active accounts available.</div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.accountType}) — Available: ${Number(acc.balance || 0).toFixed(2)} {acc.currency}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Deposit Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                {selectedAccount ? selectedAccount.currency : 'USD'}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Standard precision: 4 decimal places evaluated in BigDecimal.</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Description / Memo (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Salary deposit, Initial funding"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Double-Entry Disclosure */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start space-x-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">Double-Entry Booking Invariant</p>
              <p className="text-[11px] text-blue-700/80 mt-0.5">
                Debits Bank Clearing Asset account; Credits Customer Liability account. Every entry is immutable and audit-logged atomically.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || accounts.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ArrowDownCircle className="w-4 h-4" />
                <span>Confirm & Post Deposit</span>
              </>
            )}
          </button>
        </form>
      </div>

      <ReceiptModal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        receipt={receipt}
      />
    </div>
  );
};

export default DepositPage;
