import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Smartphone,
  Banknote,
  FolderLock,
  Calendar,
  Search,
} from 'lucide-react';
import { AccountType } from '@keeper/shared';

interface AccountsPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Account state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>(AccountType.GENERAL_DUES);
  const [newNumber, setNewNumber] = useState('');
  const [newBalance, setNewBalance] = useState<number>(0);
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
      if (res.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res.data[0].id);
        loadLedger(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLedger = async (accountId: string) => {
    setIsLedgerLoading(true);
    try {
      const res = await api.get(`/accounts/${accountId}/ledger`);
      setLedgerData(res.data);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    loadLedger(id);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        name: newName,
        type: newType,
        accountNumber: newNumber || undefined,
        balance: Number(newBalance),
        isDefault: newIsDefault,
        description: newDesc || undefined,
      });
      setShowCreateModal(false);
      loadAccounts();
    } catch (err) {
      alert('Failed to create account');
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.BANK_ACCOUNT:
        return <Landmark className="h-5 w-5 text-blue-600" />;
      case AccountType.MOBILE_MONEY:
        return <Smartphone className="h-5 w-5 text-amber-600" />;
      case AccountType.PETTY_CASH:
        return <Banknote className="h-5 w-5 text-emerald-600" />;
      default:
        return <Wallet className="h-5 w-5 text-emerald-700" />;
    }
  };

  const totalFunds = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Fund Accounting
            </span>
            <span className="text-xs text-slate-500">
              Total Pooled: {formatCurrency(totalFunds, tenant?.currency)}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            Treasury & Fund Accounts
          </h1>
          <p className="text-xs text-slate-500">
            Segregated accounts for Umusanzu, Concert projects, Uniform funds, and Mobile Money cashboxes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Fund Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <div
              key={acc.id}
              onClick={() => handleSelectAccount(acc.id)}
              className={`cursor-pointer rounded-2xl border p-4.5 transition ${
                isSelected
                  ? 'border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2">
                  {getAccountIcon(acc.type)}
                </div>
                {acc.isDefault && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800 uppercase">
                    Default
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 truncate">
                {acc.name}
              </h3>
              <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                {formatCurrency(acc.balance, tenant?.currency)}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono">{acc.accountNumber || 'Primary'}</span>
                <span>{acc.type.replace('_', ' ')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED ACCOUNT LEDGER */}
      {ledgerData && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Account Ledger History
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                {ledgerData.account.name}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Current Balance
                </span>
                <span className="text-sm font-black text-emerald-900 font-mono">
                  {formatCurrency(ledgerData.account.balance, tenant?.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Description / Member / Vendor</th>
                  <th className="px-3 py-3">Details / Reference</th>
                  <th className="px-4 py-3 text-right">Inflow</th>
                  <th className="px-4 py-3 text-right">Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.ledger.length > 0 ? (
                  ledgerData.ledger.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-3 py-3">
                        {item.type === 'INFLOW' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="h-3 w-3" />
                            Payment
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            <ArrowUpRight className="h-3 w-3" />
                            Expense
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {item.title}
                        {item.vendor && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Vendor: {item.vendor}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {item.reference && (
                          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                            {item.reference}
                          </span>
                        )}
                        {item.notes && <span className="ml-1">{item.notes}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
                        {item.type === 'INFLOW'
                          ? `+${formatCurrency(item.amount, tenant?.currency)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono text-rose-700">
                        {item.type === 'OUTFLOW'
                          ? `-${formatCurrency(item.amount, tenant?.currency)}`
                          : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No transactions recorded for this account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Add Treasury Fund Account</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create an account to hold designated funds (e.g., Uniform Account, Bank of Kigali, MoMo Cashbox).
            </p>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Account Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Uniforms Account 2026"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Account Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AccountType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value={AccountType.GENERAL_DUES}>General Dues Fund</option>
                    <option value={AccountType.EVENT_PROJECT}>Event / Project Fund</option>
                    <option value={AccountType.MOBILE_MONEY}>Mobile Money (MoMo)</option>
                    <option value={AccountType.BANK_ACCOUNT}>Bank Account</option>
                    <option value={AccountType.PETTY_CASH}>Cash on Hand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Initial Balance</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Account / Phone / IBAN #</label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="e.g. *182*8*1*..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newIsDef"
                  checked={newIsDefault}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600"
                />
                <label htmlFor="newIsDef" className="text-xs text-slate-700 cursor-pointer">
                  Set as default receiving account
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
