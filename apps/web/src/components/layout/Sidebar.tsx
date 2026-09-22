import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  TableProperties,
  CalendarCheck,
  Wallet,
  Receipt,
  UserCheck,
  Users,
  PlusCircle,
  TrendingUp,
  ScrollText,
  Shield,
  Landmark,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenQuickActions: (tab: string) => void;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  onOpenQuickActions,
  isOpen = true,
}) => {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    ...(isSuperAdmin
      ? [{ label: 'Super Admin Portal', path: '/admin', icon: Shield, superAdmin: true }]
      : []),
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Umusanzu Matrix', path: '/contributions', icon: TableProperties, highlight: true },
    { label: 'Events & Dues', path: '/events', icon: CalendarCheck },
    { label: 'Treasury & Accounts', path: '/accounts', icon: Wallet },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Debts & Borrowings', path: '/debts', icon: Landmark },
    { label: 'Attendance & Discipline', path: '/attendance', icon: UserCheck },
    { label: 'Members Roster', path: '/members', icon: Users },
    { label: 'Audit Logs', path: '/audit', icon: ScrollText },
  ];

  return (
    <aside
      className={`fixed md:sticky top-16 left-0 z-30 flex h-[calc(100vh-4rem)] w-64 flex-col justify-between border-r border-slate-200/80 bg-white p-4 transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Navigation List */}
      <div className="space-y-6">
        <div>
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Operations
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? item.superAdmin
                        ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-xs'
                        : 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/70 shadow-xs'
                      : item.superAdmin
                      ? 'bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-bold border border-amber-200/60'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? item.superAdmin ? 'text-amber-700' : 'text-emerald-700'
                          : item.superAdmin ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.superAdmin && (
                    <span className="rounded bg-amber-200 text-amber-900 px-1.5 py-0.2 text-[9px] font-mono font-bold">
                      ROOT
                    </span>
                  )}
                  {item.highlight && !item.superAdmin && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Quick Action Shortcuts Bar */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick Entry
            </span>
            <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Fast record from any page:
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              onClick={() => onOpenQuickActions('payment')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition text-left"
            >
              + Payment
            </button>
            <button
              onClick={() => onOpenQuickActions('expense')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition text-left"
            >
              + Expense
            </button>
            <button
              onClick={() => onOpenQuickActions('attendance')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition text-left"
            >
              + Attendance
            </button>
            <button
              onClick={() => onOpenQuickActions('member')}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition text-left"
            >
              + Member
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Keeper Platform</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
