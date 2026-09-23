import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Wallet,
  Users,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { DashboardMetricsDTO } from '@keeper/shared';
import { StatCard } from '../components/common/StatCard';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenQuickActions: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [data, setData] = useState<DashboardMetricsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/dashboard/metrics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span>Loading dashboard analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white shadow-lg">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
            Welcome back
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">
            {user?.fullName}
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
            {tenant?.name} Operations Portal. Manage monthly Umusanzu dues, event budgets, multi-account fund balances, and rehearsals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => onOpenQuickActions('payment')}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-md hover:bg-emerald-50 active:scale-95 transition"
            >
              + Record Payment
            </button>
          )}
          <button
            onClick={() => onNavigate('/contributions')}
            className="rounded-xl bg-emerald-700/80 border border-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
          >
            View Umusanzu Matrix
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cash on Hand"
          value={formatCurrency(data?.totalCashOnHand || 0, tenant?.currency)}
          subtitle={`Pooled across ${data?.accounts.length || 0} fund accounts`}
          icon={Wallet}
          color="emerald"
          onClick={() => onNavigate('/accounts')}
        />

        <StatCard
          title="Monthly Dues Rate"
          value={`${data?.currentMonthUmusanzuRate || 0}%`}
          unit="Collected"
          subtitle="Mandatory monthly assessment progress"
          icon={TrendingUp}
          color="blue"
          progress={data?.currentMonthUmusanzuRate || 0}
          onClick={() => onNavigate('/contributions')}
        />

        <StatCard
          title="Active Members"
          value={data?.activeMembers || 0}
          unit={`/ ${data?.totalMembers || 0} enrolled`}
          subtitle="Registered community members"
          icon={Users}
          color="purple"
          onClick={() => onNavigate('/members')}
        />

        <StatCard
          title="Attendance Roster"
          value={data?.upcomingSessions.length || 0}
          unit="recent sessions"
          subtitle="Disciplinary & check-in tracker"
          icon={UserCheck}
          color="amber"
          onClick={() => onNavigate('/attendance')}
        />
      </div>

      {/* Account Balances Ribbon */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Treasury Fund Accounts
          </h2>
          <button
            onClick={() => onNavigate('/accounts')}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>View All Ledgers</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {data?.accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span className="truncate">{acc.name}</span>
                {acc.isDefault && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-2 text-base font-extrabold text-slate-900">
                {formatCurrency(acc.balance, tenant?.currency)}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                {acc.type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Inflow vs Outflow Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inflows / Payments */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Recent Payment Inflows</h2>
            </div>
            {user?.role !== 'VIEWER' && (
              <button
                onClick={() => onOpenQuickActions('payment')}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                + Record
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              data.recentPayments.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{p.memberName}</span>
                    <span className="text-[11px] text-slate-500">
                      {p.accountName} • {formatDate(p.date)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-emerald-700">
                      +{formatCurrency(p.amount, tenant?.currency)}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.targetDescription}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No recent payments logged</p>
            )}
          </div>
        </div>

        {/* Recent Outflows / Expenses */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-100 p-1.5 text-rose-700">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Recent Expenses & Outflows</h2>
            </div>
            {user?.role !== 'VIEWER' && (
              <button
                onClick={() => onOpenQuickActions('expense')}
                className="text-xs font-semibold text-rose-700 hover:underline"
              >
                + Record
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recentExpenses && data.recentExpenses.length > 0 ? (
              data.recentExpenses.map((e) => (
                <div key={e.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{e.title}</span>
                    <span className="text-[11px] text-slate-500">
                      {e.category.replace('_', ' ')} • {formatDate(e.date)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-rose-700">
                      -{formatCurrency(e.amount, tenant?.currency)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No expenses recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
