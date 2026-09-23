import React, { useState } from 'react';
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
  Activity,
  CheckCircle2,
  Server,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Enterprise Console Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
        <div className="flex items-center justify-between">
          {/* Brand & Console Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 p-2 shadow-lg shadow-amber-500/10">
                <Shield className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-white">
                    Keeper
                  </span>
                  <span className="rounded-md bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                    PLATFORM CONSOLE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Global Multi-Tenant Administration & Audit System
                </p>
              </div>
            </div>

            {/* Health pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Engine Healthy</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono">v1.2</span>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {onOpenCreateCommunity && (
              <button
                onClick={onOpenCreateCommunity}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95 transition shadow-sm"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Register Community</span>
              </button>
            )}

            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">
                  {user?.fullName}
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
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
        <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                          ? 'bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Platform Security Badge */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px]">
                <Lock className="h-3.5 w-3.5" />
                <span>Super Admin Privileges</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Full authority across all communities. Actions are universally logged in the platform immutable audit ledger.
              </p>
            </div>
          </div>

          {/* System Spec Footer */}
          <div className="border-t border-slate-800/80 pt-4 text-[10px] text-slate-500 font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span>Stack:</span>
              <span className="text-slate-400">PostgreSQL + Node</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Isolation:</span>
              <span className="text-emerald-400">Tenant Scoped</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Access:</span>
              <span className="text-amber-400">Super Admin (Root)</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
