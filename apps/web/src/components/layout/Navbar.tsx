import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import {
  Plus,
  Search,
  LogOut,
  User,
  ShieldCheck,
  Building,
  Menu,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenQuickActions: (defaultTab?: string) => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuickActions,
  onOpenCommandPalette,
  onToggleSidebar,
}) => {
  const { user, tenant, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Logo size={34} />

        {/* Tenant badge */}
        {tenant ? (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800">
            <Building className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold">{tenant.name}</span>
            <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded-full font-mono">
              {tenant.currency}
            </span>
          </div>
        ) : user?.role === 'SUPER_ADMIN' ? (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-bold">Platform Super Admin</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-mono">
              GLOBAL
            </span>
          </div>
        ) : null}
      </div>

      {/* Middle: Command Palette Search Bar */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-3 w-80 max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition shadow-sm"
      >
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <span className="flex-1 text-left">Search members, dues, actions...</span>
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-600 shadow-xs">
          Ctrl K
        </kbd>
      </button>

      {/* Right: Quick Action Button & User Profile */}
      <div className="flex items-center gap-3">
        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => onOpenQuickActions('payment')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            title="Fast record anything in 5 seconds"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Transaction</span>
          </button>
        )}

        {/* User Role Badge & Dropdown */}
        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.fullName}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                user?.role === 'SUPER_ADMIN'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                  : user?.role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800'
                  : user?.role === 'MANAGER'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
