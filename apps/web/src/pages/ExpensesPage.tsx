import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  Split,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Building,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';
import { ExpenseCategory } from '@keeper/shared';
import { pdf } from '@react-pdf/renderer';
import { ExpensesStatementPDF } from '../reports/ExpensesStatementPDF';

interface ExpensesPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [plannedFilter, setPlannedFilter] = useState<'ALL' | 'PLANNED' | 'UNPLANNED'>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(search.toLowerCase()));

    const matchCat =
      categoryFilter === 'ALL' || e.category === categoryFilter;

    const matchPlan =
      plannedFilter === 'ALL' ||
      (plannedFilter === 'PLANNED' && e.isPlanned) ||
      (plannedFilter === 'UNPLANNED' && !e.isPlanned);

    return matchSearch && matchCat && matchPlan;
  });

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPlanned = expenses
    .filter((e) => e.isPlanned)
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalUnplanned = expenses
    .filter((e) => !e.isPlanned)
    .reduce((s, e) => s + Number(e.amount), 0);

  const handleExportPdf = async () => {
    if (expenses.length === 0) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <ExpensesStatementPDF
          expenses={filteredExpenses}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Expenses_Statement_${(tenant?.name || 'Community').replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Expenses PDF', err);
      alert('Failed to generate Expenses Statement PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Expenses & Outflow Accounting
          </h1>
          <p className="text-xs text-slate-500">
            Pre-planned budget allocations vs. operational purchases, with atomic multi-account splits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export Outflows PDF'}</span>
          </button>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => onOpenQuickActions('expense')}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Record New Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outflows"
          value={formatCurrency(totalSpent, tenant?.currency)}
          subtitle={`${expenses.length} transactions logged`}
          icon={Receipt}
          color="rose"
          valueColor="text-rose-700"
        />
        <StatCard
          title="Pre-Budgeted / Planned"
          value={formatCurrency(totalPlanned, tenant?.currency)}
          subtitle={`${totalSpent > 0 ? Math.round((totalPlanned / totalSpent) * 100) : 0}% of budget`}
          icon={CheckCircle2}
          color="emerald"
          valueColor="text-emerald-700"
          progress={totalSpent > 0 ? Math.round((totalPlanned / totalSpent) * 100) : 0}
        />
        <StatCard
          title="Operational / Spontaneous"
          value={formatCurrency(totalUnplanned, tenant?.currency)}
          subtitle="Operational logistics"
          icon={AlertCircle}
          color="amber"
          valueColor="text-amber-700"
        />
        <StatCard
          title="Total Vouchers"
          value={expenses.length}
          subtitle="Audited expense records"
          icon={Clock}
          color="slate"
        />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search expense or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Planned filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['ALL', 'PLANNED', 'UNPLANNED'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlannedFilter(p)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                  plannedFilter === p ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {p === 'ALL' ? 'All' : p === 'PLANNED' ? 'Planned' : 'Unplanned'}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="w-56">
            <SearchableSelect
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: ExpenseCategory.FACILITATOR_TRAINER, label: 'Facilitator / Trainer' },
                { value: ExpenseCategory.MATERIALS_SUPPLIES, label: 'Materials & Supplies' },
                { value: ExpenseCategory.SOUND_EQUIPMENT, label: 'Sound & Tech Equipment' },
                { value: ExpenseCategory.VENUE_LOGISTICS, label: 'Hall & Logistics' },
                { value: ExpenseCategory.TRANSPORT, label: 'Transport' },
                { value: ExpenseCategory.REFRESHMENTS, label: 'Refreshments' },
                { value: ExpenseCategory.WELFARE_BENEVOLENCE, label: 'Welfare & Community Aid' },
                { value: ExpenseCategory.OTHER, label: 'Other Expenses' },
              ]}
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val || 'ALL')}
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
              <th className="px-4 py-3">Expense Details</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Funding Source (Account Splits)</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                <td className="px-4 py-3 font-bold text-slate-900">
                  <div>{exp.title}</div>
                  {exp.vendorName && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      Vendor: {exp.vendorName}
                    </span>
                  )}
                  {exp.eventTitle && (
                    <span className="block text-[10px] text-emerald-700 font-medium">
                      Event: {exp.eventTitle}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                    {exp.category.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {exp.isPlanned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Planned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      Unplanned
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                  {formatDate(exp.expenseDate)}
                </td>
                <td className="px-3 py-3">
                  {exp.splits && exp.splits.length > 1 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700">
                        <Split className="h-3 w-3" />
                        <span>Multi-Account Split ({exp.splits.length}):</span>
                      </div>
                      {exp.splits.map((s: any) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-[10px] text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded"
                        >
                          <span className="truncate max-w-[12rem]">{s.accountName}</span>
                          <span className="font-bold">{s.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : exp.splits && exp.splits.length === 1 ? (
                    <span className="text-[11px] font-medium text-slate-700">
                      {exp.splits[0].accountName}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-black font-mono text-rose-700 text-sm">
                  -{formatCurrency(exp.amount, tenant?.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
