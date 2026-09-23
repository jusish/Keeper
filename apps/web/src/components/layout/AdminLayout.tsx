import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import {
  Shield,
  Building2,
  Users,
  Globe,
  Layers,
  LogOut,
  Plus,
  Lock,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCreateCommunity?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  onOpenCreateCommunity,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: '/admin', label: 'Platform Overview', icon: Layers, path: '/admin' },
    { id: '/admin/communities', label: 'Communities Management', icon: Building2, path: '/admin/communities' },
    { id: '/admin/users', label: 'Platform Users & Roles', icon: Users, path: '/admin/users' },
    { id: '/admin/audit', label: 'Universal Audit Trail', icon: Globe, path: '/admin/audit' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Enterprise Console Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 lg:px-8 py-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Brand & Console Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 p-2 shadow-xs">
                <Shield className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900">
                    Keeper
                  </span>
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                    SUPER ADMIN CONSOLE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Global Multi-Tenant Administration & Audit System
                </p>
              </div>
            </div>

            {/* Health pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Engine Online</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono">v1.2</span>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {onOpenCreateCommunity && (
              <button
                onClick={onOpenCreateCommunity}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Register Community</span>
              </button>
            )}

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.fullName}
                </span>
                <span className="text-[10px] font-mono text-emerald-700">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Sign out of console"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <div className="flex flex-1">
        {/* Admin Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Platform Console
              </span>
              <nav className="mt-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || (item.path === '/admin' && currentPath === '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Platform Security Badge */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-[11px]">
                <Lock className="h-3.5 w-3.5" />
                <span>Super Admin Privileges</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Full oversight across all registered communities. Actions are universally logged into the immutable audit ledger.
              </p>
            </div>
          </div>

          {/* System Spec Footer */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span>Stack:</span>
              <span className="text-slate-700 font-semibold">PostgreSQL + Express</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Isolation:</span>
              <span className="text-emerald-700 font-semibold">Multi-Tenant Scoped</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Access:</span>
              <span className="text-emerald-700 font-semibold">Root Super Admin</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};
