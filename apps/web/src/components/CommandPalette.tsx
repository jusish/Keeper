import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Search,
  TableProperties,
  CalendarCheck,
  Wallet,
  Receipt,
  UserCheck,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onTriggerAction: (tab: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onTriggerAction,
}) => {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onTriggerAction('open_palette');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTriggerAction]);

  useEffect(() => {
    if (isOpen && query.length > 1) {
      api.get(`/members?search=${encodeURIComponent(query)}`).then((res) => {
        setMembers(res.data.slice(0, 5));
      });
    } else {
      setMembers([]);
    }
  }, [isOpen, query]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Umusanzu Matrix (Monthly Dues Grid)', path: '/contributions', icon: TableProperties },
    { label: 'Events & Projects', path: '/events', icon: CalendarCheck },
    { label: 'Treasury & Fund Accounts', path: '/accounts', icon: Wallet },
    { label: 'Expense Outflows Ledger', path: '/expenses', icon: Receipt },
    { label: 'Attendance & Disciplinary Sessions', path: '/attendance', icon: UserCheck },
    { label: 'Community Members Directory', path: '/members', icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search member by name/code..."
            className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Member Search Results */}
          {members.length > 0 && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Members
              </span>
              <div className="mt-1 space-y-0.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onNavigate(`/members?id=${m.id}`);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-slate-100 transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                        {m.fullName.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{m.fullName}</span>
                      {m.membershipCode && (
                        <span className="text-[10px] text-slate-500 font-mono">({m.membershipCode})</span>
                      )}
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => {
                  onClose();
                  onTriggerAction('payment');
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition text-left"
              >
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Record New Member Payment</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onTriggerAction('expense');
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition text-left"
              >
                <Receipt className="h-4 w-4 text-amber-600" />
                <span>Record Expense (Single or Multi-Account Split)</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onTriggerAction('member');
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition text-left"
              >
                <Plus className="h-4 w-4 text-blue-600" />
                <span>Register New Member</span>
              </button>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </span>
            <div className="mt-1 space-y-0.5">
              {quickNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      onNavigate(item.path);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition text-left"
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
