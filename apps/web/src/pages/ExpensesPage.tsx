import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
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
} from 'lucide-react';
import { ExpenseCategory } from '@keeper/shared';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Expenses & Outflow Accounting
          </h1>
          <p className="text-xs text-slate-500">
            Planned retainers (vocal coaches) vs. unplanned purchases, with multi-account splits.
          </p>
        </div>

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

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Outflows
          </span>
          <p className="mt-1 text-xl font-black text-rose-700 font-mono">
            {formatCurrency(totalSpent, tenant?.currency)}
          </p>
          <span className="text-[11px] text-slate-500">{expenses.length} transactions logged</span>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Pre-Budgeted / Planned
          </span>
          <p className="mt-1 text-xl font-black text-slate-900 font-mono">
            {formatCurrency(totalPlanned, tenant?.currency)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {totalSpent > 0 ? Math.round((totalPlanned / totalSpent) * 100) : 0}% of budget
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Spontaneous / Unplanned
          </span>
          <p className="mt-1 text-xl font-black text-amber-900 font-mono">
            {formatCurrency(totalUnplanned, tenant?.currency)}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold">Operational logistics</span>
        </div>
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
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs focus:outline-none font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value={ExpenseCategory.COACH_TRAINER}>Vocal Coach</option>
            <option value={ExpenseCategory.UNIFORM_FABRIC}>Uniform & Fabric</option>
            <option value={ExpenseCategory.SOUND_EQUIPMENT}>Sound Equipment</option>
            <option value={ExpenseCategory.VENUE_LOGISTICS}>Hall & Logistics</option>
            <option value={ExpenseCategory.TRANSPORT}>Transport</option>
            <option value={ExpenseCategory.REFRESHMENTS}>Refreshments</option>
            <option value={ExpenseCategory.WELFARE_BENEVOLENCE}>Welfare</option>
          </select>
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
