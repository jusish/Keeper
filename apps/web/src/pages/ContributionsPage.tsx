import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { pdf } from '@react-pdf/renderer';
import { UmusanzuMatrixPDF } from '../reports/UmusanzuMatrixPDF';
import {
  TableProperties,
  Search,
  Filter,
  Download,
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Calendar,
  X,
  Layers,
} from 'lucide-react';
import {
  ContributionMatrixResponse,
  AssessmentStatus,
  PlanCycle,
} from '@keeper/shared';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect, SearchableOption } from '../components/common/SearchableSelect';

interface ContributionsPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const ContributionsPage: React.FC<ContributionsPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [data, setData] = useState<ContributionMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'ARREARS' | 'ADVANCE'>('ALL');
  const [periodSlice, setPeriodSlice] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2'>('ALL');
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // New Plan modal state
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanCycle, setNewPlanCycle] = useState<PlanCycle>(PlanCycle.MONTHLY);
  const [newPlanAmount, setNewPlanAmount] = useState<number>(5000);
  const [newPlanYear, setNewPlanYear] = useState<number>(new Date().getFullYear());
  const [newPlanAccountId, setNewPlanAccountId] = useState<string>('');
  const [hasPredecessor, setHasPredecessor] = useState(false);
  const [predecessorPlanId, setPredecessorPlanId] = useState<string>('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  useEffect(() => {
    loadPlans();
    loadAccounts();
  }, []);

  const loadPlans = async (targetPlanId?: string) => {
    try {
      const res = await api.get('/contributions/plans');
      setPlans(res.data);
      const activeId = targetPlanId || selectedPlanId;
      if (res.data.length > 0) {
        const found = res.data.find((p: any) => p.id === activeId) ||
          res.data.find((p: any) => p.isActive) ||
          res.data[0];
        setSelectedPlanId(found.id);
        await loadMatrix(found.id);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load plans', err);
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to load accounts', err);
    }
  };

  const loadMatrix = async (planId?: string) => {
    const idToFetch = planId || selectedPlanId;
    if (!idToFetch) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.get('/contributions/matrix', { params: { planId: idToFetch } });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load contributions matrix', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    loadMatrix(planId);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPlan(true);
    try {
      const res = await api.post('/contributions/plans', {
        title: newPlanTitle,
        cycle: newPlanCycle,
        defaultAmount: Number(newPlanAmount),
        year: Number(newPlanYear),
        targetAccountId: newPlanAccountId || undefined,
        predecessorPlanId: hasPredecessor && predecessorPlanId ? predecessorPlanId : undefined,
      });

      setShowCreatePlanModal(false);
      setNewPlanTitle('');
      setHasPredecessor(false);
      setPredecessorPlanId('');
      if (res.data?.plan?.id) {
        const createdId = res.data.plan.id;
        setSelectedPlanId(createdId);
        await loadPlans(createdId);
      } else {
        await loadPlans();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create contribution plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const activePeriods = React.useMemo(() => {
    if (!data?.periods) return [];
    if (periodSlice === 'ALL') return data.periods;

    const total = data.periods.length;
    if (periodSlice === 'Q1') {
      if (total === 12) return data.periods.slice(0, 3);
      if (total === 52) return data.periods.slice(0, 13);
      if (total === 4) return data.periods.slice(0, 1);
      return data.periods.slice(0, Math.ceil(total / 4));
    }
    if (periodSlice === 'Q2') {
      if (total === 12) return data.periods.slice(3, 6);
      if (total === 52) return data.periods.slice(13, 26);
      if (total === 4) return data.periods.slice(1, 2);
      return data.periods.slice(Math.ceil(total / 4), Math.ceil(total / 2));
    }
    if (periodSlice === 'Q3') {
      if (total === 12) return data.periods.slice(6, 9);
      if (total === 52) return data.periods.slice(26, 39);
      if (total === 4) return data.periods.slice(2, 3);
      return data.periods.slice(Math.ceil(total / 2), Math.ceil((3 * total) / 4));
    }
    if (periodSlice === 'Q4') {
      if (total === 12) return data.periods.slice(9, 12);
      if (total === 52) return data.periods.slice(39, 52);
      if (total === 4) return data.periods.slice(3, 4);
      return data.periods.slice(Math.ceil((3 * total) / 4));
    }
    if (periodSlice === 'H1') {
      return data.periods.slice(0, Math.ceil(total / 2));
    }
    if (periodSlice === 'H2') {
      return data.periods.slice(Math.ceil(total / 2));
    }
    return data.periods;
  }, [data?.periods, periodSlice]);

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <UmusanzuMatrixPDF
          data={data}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
          filteredPeriods={activePeriods}
          periodLabel={periodSlice !== 'ALL' ? periodSlice : undefined}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contribution_Matrix_${data.plan.title.replace(/\s+/g, '_')}${periodSlice !== 'ALL' ? `_${periodSlice}` : ''}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const planOptions: SearchableOption[] = plans.map((p) => ({
    value: p.id,
    label: p.title,
    sublabel: `${p.cycle} • ${formatCurrency(p.defaultAmount, tenant?.currency)}${p.predecessorPlanTitle ? ` • From: ${p.predecessorPlanTitle}` : ''}`,
    badge: p.isActive ? 'Active' : 'Closed',
  }));

  const filteredRows = (data?.rows || []).filter((row) => {
    const matchSearch =
      row.member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.member.membershipCode &&
        row.member.membershipCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SETTLED' && row.totalRemaining === 0) ||
      (statusFilter === 'ARREARS' && row.totalRemaining > 0) ||
      (statusFilter === 'ADVANCE' && ((row.advanceCredit || row.member.creditBalance) > 0));

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Plan Selector & Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shadow-2xs shrink-0">
              <TableProperties className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Contribution Program / Plan Switcher
              </span>
              <span className="text-xs font-extrabold text-slate-900">
                {data?.plan?.title || 'Select Program'}
              </span>
            </div>
          </div>
          <div className="w-full sm:w-80">
            <SearchableSelect
              options={planOptions}
              value={selectedPlanId || ''}
              onChange={(val) => handleSelectPlan(val)}
              placeholder="Search or select contribution program..."
              searchPlaceholder="Search programs..."
            />
          </div>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setShowCreatePlanModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Contribution Plan</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span>Generating high-density contribution matrix...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">No active contribution plan found. Create one above to get started.</p>
        </div>
      ) : (
        <>
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  {data.plan.cycle} Plan
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Standard: {formatCurrency(data.plan.defaultAmount, tenant?.currency)}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">
                {data.plan.title}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Mandatory unifying dues across all members with automatic period roll-forward and advance credit tracking.
              </p>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowWhatsApp(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                title="Export summary to WhatsApp"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp Report</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
                title="Export high-density vector PDF"
              >
                <Download className="h-4 w-4" />
                <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
              </button>

              {user?.role !== 'VIEWER' && (
                <button
                  onClick={() => onOpenQuickActions('payment')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
          </div>

          {/* Unified KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Projected Dues Target"
              value={formatCurrency(data.grandTotalExpected, tenant?.currency)}
              subtitle={`Annual assessment (${data.rows.length} members)`}
              icon={Calendar}
              color="slate"
            />
            <StatCard
              title="Total Collected"
              value={formatCurrency(data.grandTotalCollected, tenant?.currency)}
              unit={`(${data.overallCollectionRate}%)`}
              valueColor="text-emerald-700"
              subtitle={`${data.overallCollectionRate}% collection progress`}
              icon={TrendingUp}
              color="emerald"
              progress={data.overallCollectionRate}
            />
            <StatCard
              title="Advance / Prepaid Credit"
              value={formatCurrency(data.grandTotalAdvance ?? 0, tenant?.currency)}
              valueColor="text-emerald-700"
              subtitle="Prepaid dues covering future periods"
              icon={Sparkles}
              color="emerald"
            />
            <StatCard
              title="Total Arrears Balance"
              value={formatCurrency(data.grandTotalRemaining, tenant?.currency)}
              valueColor={data.grandTotalRemaining > 0 ? 'text-rose-700' : 'text-slate-900'}
              subtitle="Uncollected outstanding dues"
              icon={Clock}
              color="amber"
            />
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search member name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
              />
            </div>

            {/* Period Range Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden lg:inline">
                Period Range:
              </span>
              {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2'] as const).map((slice) => (
                <button
                  key={slice}
                  onClick={() => setPeriodSlice(slice)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                    periodSlice === slice
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {slice === 'ALL' ? 'All Year' : slice}
                </button>
              ))}
            </div>

            {/* Member Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({data.rows.length})
              </button>
              <button
                onClick={() => setStatusFilter('SETTLED')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === 'SETTLED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Settled
              </button>
              <button
                onClick={() => setStatusFilter('ARREARS')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === 'ARREARS'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                In Arrears
              </button>
              <button
                onClick={() => setStatusFilter('ADVANCE')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === 'ADVANCE'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Advance (+)
              </button>
            </div>
          </div>

          {/* Predecessor Arrears Notice Banner */}
          {((data.grandTotalPreviousArrears || 0) > 0 || data.plan.predecessorPlanTitle) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Prior Program Arrears Transfer Active
                  </h4>
                  <p className="text-xs text-amber-800 font-medium">
                    This program inherits outstanding balances from <strong>{data.predecessorPlanTitle || 'Predecessor Program'}</strong>. Unsettled member dues are carried over into this year's ledger.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-white text-amber-900 border border-amber-300 px-3 py-1 rounded-full shadow-2xs whitespace-nowrap">
                Carried: {formatCurrency(data.grandTotalPreviousArrears, tenant?.currency)}
              </span>
            </div>
          )}

          {/* Dynamic Contribution Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 min-w-[180px] shadow-[1px_0_0_0_#e2e8f0]">
                    Member
                  </th>
                  {activePeriods.map((p) => (
                    <th key={p.id} className="px-2.5 py-3 text-center min-w-[72px]">
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal text-slate-400">
                        {data.totalsByPeriod[p.id]?.collectionRate}%
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right bg-slate-100/50 min-w-[85px]">Paid</th>
                  {(data.grandTotalPreviousArrears || 0) > 0 && (
                    <th className="px-3 py-3 text-right bg-amber-50/70 min-w-[90px] text-amber-900">
                      Prior Arrears
                    </th>
                  )}
                  <th className="px-3 py-3 text-right bg-slate-100/50 min-w-[85px]">Current Plan</th>
                  <th className="px-3 py-3 text-right bg-rose-50/50 min-w-[90px] text-rose-900">Total Balance</th>
                  <th className="px-3 py-3 text-right bg-emerald-50/50 min-w-[100px]">Advance Credit (+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const hasPrior = (data.grandTotalPreviousArrears || 0) > 0;
                  const rowPaidInSlice = activePeriods.reduce(
                    (sum, p) => sum + (row.cells[p.id]?.paidAmount || 0),
                    0
                  );
                  const rowRemainingInSlice = activePeriods.reduce(
                    (sum, p) => sum + (row.cells[p.id]?.remainingAmount || 0),
                    0
                  );
                  const totalDue = rowRemainingInSlice + (row.previousArrears || 0);

                  return (
                    <tr key={row.member.id} className="hover:bg-slate-50/80 transition group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="truncate">{row.member.fullName}</div>
                        {row.member.membershipCode && (
                          <div className="text-[10px] font-mono text-slate-400 font-normal">
                            {row.member.membershipCode}
                          </div>
                        )}
                      </td>

                      {activePeriods.map((p) => {
                        const cell = row.cells[p.id];
                        if (!cell) {
                          return (
                            <td key={p.id} className="px-2.5 py-2.5 text-center text-slate-300">
                              —
                            </td>
                          );
                        }

                        let bg = 'bg-slate-50 text-slate-400';
                        let label = '0';
                        if (cell.isExempt || cell.expectedAmount === 0) {
                          bg = 'bg-slate-100/90 text-slate-400 border border-slate-200/60 font-medium text-[10px]';
                          label = 'N/A';
                        } else if (cell.status === AssessmentStatus.PAID) {
                          bg = 'bg-emerald-100/70 text-emerald-800 font-bold';
                          label = '✓';
                        } else if (cell.status === AssessmentStatus.PARTIAL) {
                          bg = 'bg-amber-100/80 text-amber-900 font-bold';
                          label = `${Math.round(cell.paidAmount / 1000)}k`;
                        }

                        return (
                          <td key={p.id} className="px-1.5 py-2 text-center">
                            <div
                              className={`rounded-md py-1 px-1 text-[11px] transition ${bg}`}
                              title={
                                cell.isExempt || cell.expectedAmount === 0
                                  ? `${row.member.fullName} - ${p.label}: Not applicable (joined later or exempt)`
                                  : `${row.member.fullName} - ${p.label}: Paid ${cell.paidAmount} / ${cell.expectedAmount}`
                              }
                            >
                              {label}
                            </div>
                          </td>
                        );
                      })}

                      <td className="px-3 py-2.5 text-right font-bold text-slate-800 bg-slate-50/30 font-mono">
                        {formatCurrency(rowPaidInSlice, tenant?.currency)}
                      </td>
                      {hasPrior && (
                        <td className="px-3 py-2.5 text-right font-bold font-mono bg-amber-50/20 text-amber-900">
                          {row.previousArrears > 0 ? formatCurrency(row.previousArrears, tenant?.currency) : '—'}
                        </td>
                      )}
                      <td
                        className={`px-3 py-2.5 text-right font-bold font-mono bg-slate-50/30 ${
                          rowRemainingInSlice > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(rowRemainingInSlice, tenant?.currency)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-bold font-mono bg-rose-50/20 ${
                          totalDue > 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(totalDue, tenant?.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700 font-mono bg-emerald-50/20">
                        {(row.advanceCredit || row.member?.creditBalance) > 0
                          ? `+${formatCurrency(row.advanceCredit || row.member?.creditBalance, tenant?.currency)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100/70 font-bold text-slate-900 text-xs">
                  <td className="sticky left-0 z-20 bg-slate-100 px-4 py-3 shadow-[1px_0_0_0_#cbd5e1]">
                    Totals {periodSlice !== 'ALL' ? `(${periodSlice})` : ''}
                  </td>
                  {activePeriods.map((p) => (
                    <td key={p.id} className="px-2.5 py-3 text-center font-mono text-[11px]">
                      {Math.round((data.totalsByPeriod[p.id]?.collected || 0) / 1000)}k
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(
                      activePeriods.reduce((sum, p) => sum + (data.totalsByPeriod[p.id]?.collected || 0), 0),
                      tenant?.currency
                    )}
                  </td>
                  {(data.grandTotalPreviousArrears || 0) > 0 && (
                    <td className="px-3 py-3 text-right font-mono text-amber-900">
                      {formatCurrency(data.grandTotalPreviousArrears, tenant?.currency)}
                    </td>
                  )}
                  <td className="px-3 py-3 text-right font-mono text-slate-900">
                    {formatCurrency(
                      activePeriods.reduce((sum, p) => sum + (data.totalsByPeriod[p.id]?.remaining || 0), 0),
                      tenant?.currency
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-rose-700">
                    {formatCurrency(
                      activePeriods.reduce((sum, p) => sum + (data.totalsByPeriod[p.id]?.remaining || 0), 0) +
                        (data.grandTotalPreviousArrears || 0),
                      tenant?.currency
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-700">
                    {formatCurrency(data.grandTotalAdvance ?? 0, tenant?.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* CREATE CONTRIBUTION PLAN MODAL */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Contribution Plan</h3>
                <p className="text-xs text-slate-500">Configure recurring dues (Monthly, Weekly, Quarterly, Yearly)</p>
              </div>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Operations Dues 2026"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cycle / Frequency</label>
                  <select
                    value={newPlanCycle}
                    onChange={(e) => setNewPlanCycle(e.target.value as PlanCycle)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value={PlanCycle.MONTHLY}>Monthly (12 periods)</option>
                    <option value={PlanCycle.WEEKLY}>Weekly (52 periods)</option>
                    <option value={PlanCycle.QUARTERLY}>Quarterly (4 periods)</option>
                    <option value={PlanCycle.YEARLY}>Yearly (Annual Lump Sum)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Calendar Year</label>
                  <input
                    type="number"
                    min="2020"
                    max="2035"
                    required
                    value={newPlanYear}
                    onChange={(e) => setNewPlanYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Amount per Period ({tenant?.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  placeholder="e.g. 5000"
                  value={newPlanAmount || ''}
                  onChange={(e) => setNewPlanAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Treasury Account (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Default General Dues Account' },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: a.name,
                      sublabel: a.type.replace('_', ' '),
                      badge: formatCurrency(a.balance, tenant?.currency),
                    })),
                  ]}
                  value={newPlanAccountId}
                  onChange={setNewPlanAccountId}
                  placeholder="Select treasury account..."
                />
              </div>

              {/* Predecessor Plan Succession & Arrears Carry-Over */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPredecessor}
                    onChange={(e) => setHasPredecessor(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Carry over prior arrears from a predecessor program
                  </span>
                </label>
                {hasPredecessor && (
                  <div className="mt-2.5 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500">
                      Select Predecessor Program:
                    </label>
                    <SearchableSelect
                      options={plans.map((p) => ({
                        value: p.id,
                        label: p.title,
                        sublabel: `${p.cycle} (${p.startDate ? new Date(p.startDate).getFullYear() : ''})`,
                      }))}
                      value={predecessorPlanId}
                      onChange={setPredecessorPlanId}
                      placeholder="Select previous contribution program..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Unpaid balances from this program will automatically roll over as Carried Arrears in the new program.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlan}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isSubmittingPlan ? 'Creating Plan...' : 'Generate Plan & Periods'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {data && (
        <WhatsAppModal
          isOpen={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          reportType="UMUSANZU"
          targetId={data.plan.id}
        />
      )}
    </div>
  );
};
