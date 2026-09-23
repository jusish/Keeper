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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'ARREARS' | 'SURPLUS'>('ALL');
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
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  useEffect(() => {
    loadPlans();
    loadAccounts();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get('/contributions/plans');
      setPlans(res.data);
      if (res.data.length > 0 && !selectedPlanId) {
        const defaultPlan = res.data.find((p: any) => p.isActive) || res.data[0];
        setSelectedPlanId(defaultPlan.id);
        loadMatrix(defaultPlan.id);
      } else if (selectedPlanId) {
        loadMatrix(selectedPlanId);
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
    setIsLoading(true);
    try {
      const params = planId ? { planId } : selectedPlanId ? { planId: selectedPlanId } : undefined;
      const res = await api.get('/contributions/matrix', { params });
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
      });

      setShowCreatePlanModal(false);
      setNewPlanTitle('');
      await loadPlans();
      if (res.data?.plan?.id) {
        setSelectedPlanId(res.data.plan.id);
        loadMatrix(res.data.plan.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create contribution plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <UmusanzuMatrixPDF
          data={data}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contribution_Matrix_${data.plan.title.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredRows = (data?.rows || []).filter((row) => {
    const matchSearch =
      row.member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.member.membershipCode &&
        row.member.membershipCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SETTLED' && row.totalRemaining === 0) ||
      (statusFilter === 'ARREARS' && row.totalRemaining > 0) ||
      (statusFilter === 'SURPLUS' && row.totalSurplus > 0);

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Plan Selector & Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shadow-2xs">
            <TableProperties className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Contribution Program / Plan Switcher
            </span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedPlanId || ''}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="font-extrabold text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:border-emerald-500 focus:bg-white outline-none transition cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.cycle} • {formatCurrency(p.defaultAmount, tenant?.currency)})
                  </option>
                ))}
              </select>
              {data?.plan && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 uppercase tracking-wide">
                  {data.plan.cycle}
                </span>
              )}
            </div>
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
                Mandatory unifying dues across all members with surplus (+) credit tracking and advance payments.
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
              title="Advance & Surplus Credit"
              value={formatCurrency(data.grandTotalSurplus, tenant?.currency)}
              valueColor="text-emerald-600"
              subtitle="Pre-paid forward credit balances"
              icon={Sparkles}
              color="blue"
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search member name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
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
                Settled Up
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
                onClick={() => setStatusFilter('SURPLUS')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === 'SURPLUS'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                Surplus (+)
              </button>
            </div>
          </div>

          {/* Dynamic Contribution Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 min-w-[180px] shadow-[1px_0_0_0_#e2e8f0]">
                    Member
                  </th>
                  {data.periods.map((p) => (
                    <th key={p.id} className="px-2.5 py-3 text-center min-w-[72px]">
                      <div>{p.label}</div>
                      <div className="text-[9px] font-normal text-slate-400">
                        {data.totalsByPeriod[p.id]?.collectionRate}%
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right bg-slate-100/50 min-w-[90px]">Paid</th>
                  <th className="px-3 py-3 text-right bg-slate-100/50 min-w-[90px]">Remaining</th>
                  <th className="px-3 py-3 text-right bg-emerald-50/50 min-w-[90px]">Surplus (+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.member.id} className="hover:bg-slate-50/80 transition group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 shadow-[1px_0_0_0_#e2e8f0]">
                      <div className="truncate">{row.member.fullName}</div>
                      {row.member.membershipCode && (
                        <div className="text-[10px] font-mono text-slate-400 font-normal">
                          {row.member.membershipCode}
                        </div>
                      )}
                    </td>

                    {data.periods.map((p) => {
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
                      if (cell.status === AssessmentStatus.PAID) {
                        bg = 'bg-emerald-100/70 text-emerald-800 font-bold';
                        label = '✓';
                      } else if (cell.status === AssessmentStatus.PARTIAL) {
                        bg = 'bg-amber-100/80 text-amber-900 font-bold';
                        label = `${Math.round(cell.paidAmount / 1000)}k`;
                      } else if (cell.status === AssessmentStatus.SURPLUS) {
                        bg = 'bg-blue-100/80 text-blue-900 font-bold';
                        label = `+${Math.round(cell.surplusAmount / 1000)}k`;
                      }

                      return (
                        <td key={p.id} className="px-1.5 py-2 text-center">
                          <div
                            className={`rounded-md py-1 px-1 text-[11px] transition ${bg}`}
                            title={`${row.member.fullName} - ${p.label}: Paid ${cell.paidAmount} / ${cell.expectedAmount}`}
                          >
                            {label}
                          </div>
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-right font-bold text-slate-800 bg-slate-50/30 font-mono">
                      {formatCurrency(row.totalPaid, tenant?.currency)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold font-mono bg-slate-50/30 ${
                        row.totalRemaining > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(row.totalRemaining, tenant?.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700 font-mono bg-emerald-50/20">
                      {row.totalSurplus > 0 ? `+${formatCurrency(row.totalSurplus, tenant?.currency)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100/70 font-bold text-slate-900 text-xs">
                  <td className="sticky left-0 z-20 bg-slate-100 px-4 py-3 shadow-[1px_0_0_0_#cbd5e1]">
                    Totals
                  </td>
                  {data.periods.map((p) => (
                    <td key={p.id} className="px-2.5 py-3 text-center font-mono text-[11px]">
                      {Math.round((data.totalsByPeriod[p.id]?.collected || 0) / 1000)}k
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(data.grandTotalCollected, tenant?.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-rose-700">
                    {formatCurrency(data.grandTotalRemaining, tenant?.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-700">
                    {formatCurrency(data.grandTotalSurplus, tenant?.currency)}
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
                    <option value={PlanCycle.YEARLY}>Yearly (Annual)</option>
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
                <select
                  value={newPlanAccountId}
                  onChange={(e) => setNewPlanAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Default General Dues Account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, tenant?.currency)})
                    </option>
                  ))}
                </select>
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
