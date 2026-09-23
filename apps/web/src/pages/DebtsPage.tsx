import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  DebtSummaryDTO,
  DebtDTO,
  DebtStatus,
  AccountDTO,
  PaymentMethod,
} from '@keeper/shared';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { Modal } from '../components/common/Modal';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  User,
  Building,
  Download,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { DebtsStatementPDF } from '../reports/DebtsStatementPDF';

export const DebtsPage: React.FC = () => {
  const { user, tenant } = useAuth();
  const [data, setData] = useState<DebtSummaryDTO | null>(null);
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modals
  const [isRecordDebtOpen, setIsRecordDebtOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [selectedDebtForRepayment, setSelectedDebtForRepayment] = useState<DebtDTO | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // New Debt Form State
  const [lenderName, setLenderName] = useState('');
  const [lenderContact, setLenderContact] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [submittingDebt, setSubmittingDebt] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);

  // Repayment Form State
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [debtsRes, accountsRes] = await Promise.all([
        api.get<DebtSummaryDTO>('/debts', {
          params: {
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            search: searchQuery || undefined,
          },
        }),
        api.get<AccountDTO[]>('/accounts'),
      ]);
      setData(debtsRes.data);
      setAccounts(accountsRes.data);
      if (accountsRes.data.length > 0 && !sourceAccountId) {
        setSourceAccountId(accountsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load debts data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery]);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtError(null);
    setSubmittingDebt(true);

    try {
      await api.post('/debts', {
        lenderName,
        lenderContact: lenderContact || undefined,
        title,
        description: description || undefined,
        principalAmount: parseFloat(principalAmount),
        borrowDate,
        dueDate: dueDate || undefined,
        depositAccountId: depositAccountId || undefined,
      });

      setIsRecordDebtOpen(false);
      setLenderName('');
      setLenderContact('');
      setTitle('');
      setDescription('');
      setPrincipalAmount('');
      setDueDate('');
      setDepositAccountId('');
      await fetchData();
    } catch (err: any) {
      setDebtError(err.response?.data?.message || 'Failed to record borrowing');
    } finally {
      setSubmittingDebt(false);
    }
  };

  const handleCreateRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForRepayment) return;
    setRepaymentError(null);
    setSubmittingRepayment(true);

    try {
      await api.post(`/debts/${selectedDebtForRepayment.id}/repayments`, {
        amount: parseFloat(repaymentAmount),
        repaymentDate,
        sourceAccountId,
        method: repaymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: repaymentNotes || undefined,
      });

      setIsRepaymentOpen(false);
      setSelectedDebtForRepayment(null);
      setRepaymentAmount('');
      setReferenceNumber('');
      setRepaymentNotes('');
      await fetchData();
    } catch (err: any) {
      setRepaymentError(err.response?.data?.message || 'Failed to record debt repayment');
    } finally {
      setSubmittingRepayment(false);
    }
  };

  const getStatusBadge = (status: DebtStatus) => {
    switch (status) {
      case DebtStatus.FULLY_PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Fully Paid</span>
          </span>
        );
      case DebtStatus.PARTIALLY_PAID:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
            <Clock className="h-3 w-3" />
            <span>Partially Paid</span>
          </span>
        );
      case DebtStatus.ACTIVE:
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
            <AlertCircle className="h-3 w-3" />
            <span>Active Debt</span>
          </span>
        );
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <DebtsStatementPDF
          summary={data}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Debts_Statement_${(tenant?.name || 'Community').replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Debts PDF', err);
      alert('Failed to generate Debts Statement PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Debts & Liabilities Management (Ideni)
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {tenant?.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track borrowed funds for community initiatives, manage installment repayments, and maintain real-time treasury ledger integrity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export Statement PDF'}</span>
          </button>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => setIsRecordDebtOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Record Borrowing / Debt</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Borrowed"
            value={data.totalBorrowed.toLocaleString()}
            unit={tenant?.currency}
            subtitle="Cumulative liabilities incurred"
            icon={Landmark}
            color="slate"
          />

          <StatCard
            title="Total Repaid"
            value={data.totalRepaid.toLocaleString()}
            unit={tenant?.currency}
            valueColor="text-emerald-700"
            subtitle={`${data.totalBorrowed > 0 ? Math.round((data.totalRepaid / data.totalBorrowed) * 100) : 100}% of principal settled`}
            icon={ArrowDownRight}
            color="emerald"
            progress={data.totalBorrowed > 0 ? Math.round((data.totalRepaid / data.totalBorrowed) * 100) : 100}
          />

          <StatCard
            title="Outstanding Debt"
            value={data.totalOutstanding.toLocaleString()}
            unit={tenant?.currency}
            valueColor="text-rose-700"
            subtitle="Active balance owed to lenders"
            icon={AlertCircle}
            color="rose"
          />

          <StatCard
            title="Active Borrowings"
            value={data.activeCount}
            unit={`(${data.settledCount} cleared)`}
            subtitle="Lenders awaiting completion"
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lender name, title, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-rose-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-52">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex-1">
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active (No payments)' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'FULLY_PAID', label: 'Fully Paid' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
            />
          </div>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-400">Loading debts & liabilities...</p>
          </div>
        ) : !data || data.debts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Landmark className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No debts recorded</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Your community currently has no recorded borrowings or liabilities. Click "+ Record Borrowing / Debt" when emergency funds are borrowed.
            </p>
          </div>
        ) : (
          data.debts.map((debt) => {
            const isExpanded = expandedDebtId === debt.id;
            return (
              <div
                key={debt.id}
                className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:border-slate-300 transition"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(debt.status)}
                        <h3 className="text-sm font-bold text-slate-900">{debt.title}</h3>
                        {debt.eventTitle && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            🎵 {debt.eventTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1 text-slate-900 font-bold">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          Lender: {debt.lenderName}
                        </span>
                        {debt.lenderContact && (
                          <span className="text-slate-400">({debt.lenderContact})</span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          Borrowed: {new Date(debt.borrowDate).toLocaleDateString()}
                        </span>
                        {debt.dueDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-rose-600 font-semibold">
                              <Clock className="h-3.5 w-3.5" />
                              Due: {new Date(debt.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        {debt.depositAccountName && (
                          <>
                            <span>•</span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                              Deposited to: {debt.depositAccountName}
                            </span>
                          </>
                        )}
                      </div>

                      {debt.description && (
                        <p className="text-xs text-slate-500 mt-1">{debt.description}</p>
                      )}
                    </div>

                    {/* Right: Amounts & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t lg:border-t-0 pt-3 lg:pt-0">
                      <div className="text-right sm:min-w-[160px]">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-xs text-slate-400">Remaining:</span>
                          <span
                            className={`text-lg font-black ${
                              debt.remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {debt.remainingAmount.toLocaleString()} {tenant?.currency}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          of {debt.principalAmount.toLocaleString()} {tenant?.currency} borrowed
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {debt.status !== DebtStatus.FULLY_PAID && user?.role !== 'VIEWER' && (
                          <button
                            onClick={() => {
                              setSelectedDebtForRepayment(debt);
                              setRepaymentAmount(String(debt.remainingAmount));
                              setIsRepaymentOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Make Repayment</span>
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <span>{debt.repayments?.length || 0} Installments</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Repayment Progress</span>
                      <span>
                        {debt.repaymentRate}% ({debt.totalRepaid.toLocaleString()} / {debt.principalAmount.toLocaleString()} {tenant?.currency})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all duration-500 ${
                          debt.status === DebtStatus.FULLY_PAID
                            ? 'bg-emerald-500'
                            : debt.status === DebtStatus.PARTIALLY_PAID
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(debt.repaymentRate, 2))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Repayments History */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Repayment Installment History</span>
                    </h4>

                    {debt.repayments && debt.repayments.length > 0 ? (
                      <div className="divide-y divide-slate-200/60 rounded-lg border border-slate-200/70 bg-white">
                        {debt.repayments.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-800">
                                  +{rep.amount.toLocaleString()} {tenant?.currency}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                                  {rep.method}
                                </span>
                                {rep.referenceNumber && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Ref: {rep.referenceNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Disbursed from account: <span className="font-semibold text-slate-700">{rep.sourceAccountName}</span>
                              </p>
                              {rep.notes && (
                                <p className="text-[11px] text-slate-400 italic">"{rep.notes}"</p>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 self-start sm:self-auto font-medium">
                              {new Date(rep.repaymentDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No repayments made yet towards this debt.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: RECORD NEW DEBT */}
      <Modal isOpen={isRecordDebtOpen} onClose={() => setIsRecordDebtOpen(false)}>
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Record New Borrowing / Debt (Ideni)</h3>
            </div>
            <button
              onClick={() => setIsRecordDebtOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {debtError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              {debtError}
            </div>
          )}

          <form onSubmit={handleCreateDebt} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700">Lender Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Elder Emmanuel Habimana, Bank of Kigali, Parish Office"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Lender Contact Phone</label>
                <input
                  type="text"
                  placeholder="+250 788 123 456"
                  value={lenderContact}
                  onChange={(e) => setLenderContact(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Amount Borrowed ({tenant?.currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 500000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Purpose / Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Advance deposit for Easter Concert sound system rental"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Borrow Date *</label>
                <input
                  type="date"
                  required
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Agreed Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Destination Treasury Account (Optional)
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Do not deposit (Funds spent directly off-ledger)' },
                  ...accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (Current: ${a.balance.toLocaleString()} ${tenant?.currency})`,
                  })),
                ]}
                value={depositAccountId}
                onChange={setDepositAccountId}
                placeholder="Select destination account..."
              />
              <p className="mt-1 text-[11px] text-slate-500">
                💡 If an account is selected, its balance will <span className="font-bold text-emerald-700">automatically increase</span> by the borrowed amount.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Additional Notes / Terms</label>
              <textarea
                rows={2}
                placeholder="Terms, agreed repayment conditions, or meeting resolution reference..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsRecordDebtOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingDebt}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submittingDebt ? 'Recording...' : 'Record Borrowing'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 2: REPAY DEBT */}
      <Modal isOpen={isRepaymentOpen && !!selectedDebtForRepayment} onClose={() => setIsRepaymentOpen(false)}>
        {selectedDebtForRepayment && (
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Make Debt Repayment Installment</h3>
                  <p className="text-[11px] text-slate-500">
                    To: <span className="font-bold text-slate-800">{selectedDebtForRepayment.lenderName}</span> ({selectedDebtForRepayment.title})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRepaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {repaymentError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                {repaymentError}
              </div>
            )}

            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Outstanding Balance:</span>
                <p className="text-base font-black text-rose-800">
                  {selectedDebtForRepayment.remainingAmount.toLocaleString()} {tenant?.currency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepaymentAmount(String(selectedDebtForRepayment.remainingAmount))}
                className="rounded bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-200 transition"
              >
                Pay Full Balance
              </button>
            </div>

            <form onSubmit={handleCreateRepayment} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Amount to Repay *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedDebtForRepayment.remainingAmount}
                    value={repaymentAmount}
                    onChange={(e) => setRepaymentAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={repaymentDate}
                    onChange={(e) => setRepaymentDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Source Treasury Account *</label>
                <SearchableSelect
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} — Balance: ${a.balance.toLocaleString()} ${tenant?.currency}`,
                  }))}
                  value={sourceAccountId}
                  onChange={setSourceAccountId}
                  placeholder="Select source account..."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  💡 This account will <span className="font-bold text-rose-700">automatically decrease</span> by the repayment amount.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                  <SearchableSelect
                    options={[
                      { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money (MoMo)' },
                      { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
                      { value: PaymentMethod.CASH, label: 'Cash Handover' },
                      { value: PaymentMethod.OTHER, label: 'Check / Other' },
                    ]}
                    value={repaymentMethod}
                    onChange={(val) => setRepaymentMethod(val as PaymentMethod)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Reference / Receipt Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TX-992144 or MoMo Ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Repayment Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Month 1 installment approved by executive committee"
                  value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRepaymentOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepayment}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submittingRepayment ? 'Processing Repayment...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
