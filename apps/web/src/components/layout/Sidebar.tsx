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
  UserCog,
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

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Umusanzu Matrix', path: '/contributions', icon: TableProperties, highlight: true },
    { label: 'Events & Projects', path: '/events', icon: CalendarCheck },
    { label: 'Treasury & Accounts', path: '/accounts', icon: Wallet },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Debts & Borrowings', path: '/debts', icon: Landmark },
    { label: 'Attendance & Discipline', path: '/attendance', icon: UserCheck },
    { label: 'Community Members', path: '/members', icon: Users },
    { label: 'Team & Access', path: '/team', icon: UserCog },
    { label: 'Audit Trail', path: '/audit', icon: ScrollText },
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
                      ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/70 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && (
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
