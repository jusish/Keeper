import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ScrollText,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Receipt,
  UserCheck,
  AlertTriangle,
  Building,
} from 'lucide-react';

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  timestamp: string;
}

export const AuditLogsPage: React.FC = () => {
  const { user, tenant } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get<AuditLog[]>('/audit', {
        params: { search: searchQuery || undefined },
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch community audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PAYMENT_RECORDED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <DollarSign className="h-3 w-3" />
            <span>PAYMENT</span>
          </span>
        );
      case 'EXPENSE_RECORDED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            <Receipt className="h-3 w-3" />
            <span>EXPENSE</span>
          </span>
        );
      case 'ATTENDANCE_FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
            <UserCheck className="h-3 w-3" />
            <span>ATTENDANCE</span>
          </span>
        );
      case 'SESSION_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Community Audit Logs
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {tenant?.name || 'All Activity'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, plain-language record of all operations, financial transactions, and session updates
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor name, action, or plain-language keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Activity History ({logs.length} events recorded)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Plain-language transparency</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-400">Loading audit trail...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50/70 transition flex items-start gap-4"
              >
                <div className="mt-1 rounded-full bg-slate-100 p-2 text-slate-500 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{log.actorName}</span>
                      {getActionBadge(log.action)}
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{log.entityType}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 rounded-lg p-3 border border-slate-200/60 shadow-2xs">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs">
                No activity records found matching your query.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
