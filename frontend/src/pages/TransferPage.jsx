import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { transactionApi } from '../api/transactionApi';
import ReceiptModal from '../components/common/ReceiptModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { Send, AlertCircle, ShieldCheck, DollarSign, ArrowRightLeft, Users } from 'lucide-react';

export const TransferPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [transferMode, setTransferMode] = useState('internal'); // 'internal' (between my accounts) or 'external' (by ID)
  const [toMyAccountId, setToMyAccountId] = useState('');
  const [customToAccountId, setCustomToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await accountApi.getMyAccounts();
        setAccounts(data);
        if (data.length > 0) {
          setFromAccountId(data[0].id.toString());
          if (data.length > 1) {
            setToMyAccountId(data[1].id.toString());
          }
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

  const sourceAccount = accounts.find((a) => a.id.toString() === fromAccountId);
  const availableBalance = sourceAccount ? Number(sourceAccount.balance || 0) : 0;
  const otherAccounts = accounts.filter((a) => a.id.toString() !== fromAccountId);

  const targetId = transferMode === 'internal' ? toMyAccountId : customToAccountId;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fromAccountId) {
      setError('Please select a source account.');
      return;
    }

    if (!targetId || targetId.trim() === '') {
      setError('Please specify a destination account.');
      return;
    }

    if (fromAccountId === targetId.trim()) {
      setError('Source and destination accounts must be distinct.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive transfer amount.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Insufficient balance. Available funds: $${availableBalance.toFixed(2)}.`);
      return;
    }

    setError('');
    setIsConfirmOpen(true);
  };

  const handleExecuteTransfer = async () => {
    setIsConfirmOpen(false);
    setSubmitting(true);

    const numAmount = parseFloat(amount);
    try {
      const res = await transactionApi.transfer({
        fromAccountId: parseInt(fromAccountId, 10),
        toAccountId: parseInt(targetId, 10),
        amount: numAmount.toFixed(4),
        currency: sourceAccount ? sourceAccount.currency : 'USD',
        description: description.trim() || 'Inter-Account Transfer',
      });

      setReceipt(res);
      setAmount('');
      setDescription('');
      if (transferMode === 'external') {
        setCustomToAccountId('');
      }

      // Refresh accounts list
      const updated = await accountApi.getMyAccounts();
      setAccounts(updated);
    } catch (err) {
      console.error('Transfer failed:', err);
      const msg = err.response?.data?.message || 'Transfer failed. Check balance, currency match, and account status.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Transfer Funds</h2>
        <p className="text-sm text-slate-500 mt-1">
          Atomic account-to-account transfer with deterministic deadlock-free locking.
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
          {/* Source Account Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              From Account (Source)
            </label>
            {loadingAccounts ? (
              <div className="text-xs text-slate-400 py-2">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-xs text-rose-500 py-2">No active accounts available.</div>
            ) : (
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
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

          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Destination Type
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTransferMode('internal')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center space-x-2 transition ${
                  transferMode === 'internal'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>My Other Account</span>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode('external')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center space-x-2 transition ${
                  transferMode === 'external'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>To Another Account ID</span>
              </button>
            </div>
          </div>

          {/* Destination Account Selection */}
          {transferMode === 'internal' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                To My Account
              </label>
              {otherAccounts.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  You only have one active account. Switch to "To Another Account ID" to transfer to another user.
                </div>
              ) : (
                <select
                  value={toMyAccountId}
                  onChange={(e) => setToMyAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                >
                  <option value="">-- Select Destination Account --</option>
                  {otherAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} ({acc.accountType}) — ${Number(acc.balance || 0).toFixed(2)} {acc.currency}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Recipient Account ID
              </label>
              <input
                type="number"
                value={customToAccountId}
                onChange={(e) => setCustomToAccountId(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">Enter the numeric account ID of the destination ledger account.</p>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Transfer Amount
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
                {sourceAccount ? sourceAccount.currency : 'USD'}
              </div>
            </div>
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
              placeholder="e.g. Rent share, Bill reimbursement"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Deadlock Avoidance Info Box */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start space-x-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">Deadlock-Free Ascending Lock Ordering</p>
              <p className="text-[11px] text-blue-700/80 mt-0.5">
                The database locks `min(fromId, toId)` then `max(fromId, toId)`. Even under concurrent opposite transfers, zero circular waits can occur.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || accounts.length === 0 || availableBalance <= 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Execute Atomic Transfer</span>
              </>
            )}
          </button>
        </form>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteTransfer}
        title="Confirm Inter-Account Transfer"
        message={`Are you sure you want to transfer $${parseFloat(amount || 0).toFixed(2)} ${sourceAccount?.currency || 'USD'} from Account #${sourceAccount?.accountNumber} to Account #${targetId}? This will atomically debit the source and credit the destination with deterministic pessimistic locking.`}
        confirmText="Confirm & Transfer"
        confirmVariant="primary"
        loading={submitting}
      />

      <ReceiptModal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        receipt={receipt}
      />
    </div>
  );
};

export default TransferPage;
