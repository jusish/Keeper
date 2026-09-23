import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect, SearchableOption } from '../components/common/SearchableSelect';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Smartphone,
  Banknote,
  Layers,
  Download,
} from 'lucide-react';
import { AccountType } from '@keeper/shared';
import { pdf } from '@react-pdf/renderer';
import { AccountLedgerPDF } from '../reports/AccountLedgerPDF';

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  const accountOptions: SearchableOption[] = useMemo(
    () =>
      accounts.map((acc) => ({
        value: acc.id,
        label: acc.name,
        sublabel: `${acc.accountNumber ? `${acc.accountNumber} • ` : ''}${acc.type.replace(/_/g, ' ')}${acc.isDefault ? ' • Default' : ''}`,
        badge: formatCurrency(acc.balance, tenant?.currency),
      })),
    [accounts, tenant?.currency]
  );



  const handleExportPdf = async () => {
    if (!ledgerData) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <AccountLedgerPDF
          account={ledgerData.account}
          transactions={ledgerData.transactions || []}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Account_Ledger_${(ledgerData.account?.name || 'Account').replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Account Ledger PDF', err);
      alert('Failed to generate Account Ledger PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
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




  const totalFunds = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const defaultAccount = accounts.find((a) => a.isDefault);
  const liquidCash = accounts
    .filter((a) => a.type === AccountType.MOBILE_MONEY || a.type === AccountType.PETTY_CASH)
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const projectFunds = accounts
    .filter((a) => a.type === AccountType.EVENT_PROJECT)
    .reduce((sum, a) => sum + Number(a.balance), 0);

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
            Segregated treasury funds for general contributions, community projects, operating reserves, and cashboxes.
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

      {/* Standard KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pooled Treasury"
          value={formatCurrency(totalFunds, tenant?.currency)}
          subtitle={`Aggregated across ${accounts.length} funds`}
          icon={Wallet}
          color="emerald"
          valueColor="text-emerald-700"
        />
        <StatCard
          title="Primary Operating Fund"
          value={formatCurrency(defaultAccount ? Number(defaultAccount.balance) : 0, tenant?.currency)}
          subtitle={defaultAccount ? defaultAccount.name : 'Default General Fund'}
          icon={Landmark}
          color="blue"
        />
        <StatCard
          title="Mobile Money & Cash"
          value={formatCurrency(liquidCash, tenant?.currency)}
          subtitle="Instant liquid funds"
          icon={Smartphone}
          color="amber"
        />
        <StatCard
          title="Dedicated Project Funds"
          value={formatCurrency(projectFunds, tenant?.currency)}
          subtitle="Allocated for community initiatives"
          icon={Layers}
          color="purple"
        />
      </div>

      {/* Account Switcher — Searchable Select */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Wallet className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">View Account Ledger</span>
          <div className="flex-1">
            <SearchableSelect
              options={accountOptions}
              value={selectedAccountId || ''}
              onChange={(id) => { if (id) handleSelectAccount(id); }}
              placeholder="Search and select an account to view its ledger..."
              searchPlaceholder="Search by name, type, or account number..."
            />
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

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
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-slate-500" />
                <span>{isExportingPdf ? 'Exporting...' : 'Export Ledger PDF'}</span>
              </button>

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
