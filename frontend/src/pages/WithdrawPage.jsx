import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { transactionApi } from '../api/transactionApi';
import ReceiptModal from '../components/common/ReceiptModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { ArrowUpCircle, AlertCircle, ShieldAlert, DollarSign, Wallet } from 'lucide-react';

export const WithdrawPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
  const availableBalance = selectedAccount ? Number(selectedAccount.balance || 0) : 0;

  const handlePromptConfirmation = (e) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive withdrawal amount.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Insufficient balance. Maximum withdrawable amount is $${availableBalance.toFixed(2)}.`);
      return;
    }

    setError('');
    setIsConfirmOpen(true);
  };

  const handleExecuteWithdrawal = async () => {
    setIsConfirmOpen(false);
    setSubmitting(true);

    const numAmount = parseFloat(amount);
    try {
      const res = await transactionApi.withdraw({
        accountId: parseInt(selectedAccountId, 10),
        amount: numAmount.toFixed(4),
        currency: selectedAccount ? selectedAccount.currency : 'USD',
        description: description.trim() || 'Online Cash Withdrawal',
      });

      setReceipt(res);
      setAmount('');
      setDescription('');

      // Refresh accounts
      const updated = await accountApi.getMyAccounts();
      setAccounts(updated);
    } catch (err) {
      console.error('Withdrawal failed:', err);
      const msg = err.response?.data?.message || 'Withdrawal failed. Insufficient funds or invalid status.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Withdraw Funds</h2>
        <p className="text-sm text-slate-500 mt-1">
          Debit funds from your account with real-time balance validation and overdraft protection.
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
              Select Source Account
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

          {/* Amount Input with Max Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Withdrawal Amount
              </label>
              <button
                type="button"
                onClick={() => setAmount(availableBalance.toFixed(2))}
                className="text-xs font-semibold text-blue-600 hover:text-blue-500"
              >
                Max (${availableBalance.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance}
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
            <p className="mt-1 text-[11px] text-slate-400">
              Pessimistic write locks ensure concurrent withdrawals cannot drive the balance below zero.
            </p>
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
              placeholder="e.g. ATM cash withdrawal, Merchant payment"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Overdraft Warning Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start space-x-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Mathematical Overdraft Protection</p>
              <p className="text-[11px] text-amber-700/90 mt-0.5">
                The engine validates non-negative balance constraints at both the Java entity layer and the MySQL InnoDB table level (&apos;CHECK (balance &gt;= 0.0000)&apos;).
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || accounts.length === 0 || availableBalance <= 0}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl shadow-md shadow-amber-600/20 transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4" />
                <span>Confirm & Post Withdrawal</span>
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

export default WithdrawPage;
