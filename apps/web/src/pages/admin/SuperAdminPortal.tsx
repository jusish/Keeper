import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Users,
  Wallet,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Globe,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

interface PlatformMetrics {
  totalCommunities: number;
  totalPlatformUsers: number;
  totalMembers: number;
  totalPooledCapital: number;
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    currency: string;
    userCount: number;
    memberCount: number;
    totalBalance: number;
    createdAt: string;
  }>;
  recentAuditLogs: Array<{
    id: string;
    tenantId: string | null;
    tenantName: string;
    actorName: string;
    action: string;
    entityType: string;
    description: string;
    timestamp: string;
  }>;
}

interface PlatformUser {
  id: string;
  tenantId: string | null;
  tenantName: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface GlobalAuditLog {
  id: string;
  tenantId: string | null;
  tenantName: string;
  userId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  timestamp: string;
}

export const SuperAdminPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'communities' | 'users' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<GlobalAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get<PlatformMetrics>('/admin/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch platform metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get<PlatformUser[]>('/admin/users', {
        params: {
          tenantId: selectedTenantFilter !== 'ALL' ? selectedTenantFilter : undefined,
          role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
          search: searchQuery || undefined,
        },
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch platform users', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get<GlobalAuditLog[]>('/admin/audit-logs', {
        params: {
          tenantId: selectedTenantFilter !== 'ALL' ? selectedTenantFilter : undefined,
          search: searchQuery || undefined,
        },
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch global audit logs', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, selectedTenantFilter, selectedRoleFilter, searchQuery]);

  if (loading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading Super Admin Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 p-6 text-white shadow-xl border border-amber-900/30">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-amber-500/20 p-3 ring-1 ring-amber-500/40">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Super Admin Platform Portal</h1>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 border border-amber-400/30">
                ROOT PRIVILEGES
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <span className="font-semibold text-amber-200">{user?.fullName}</span> ({user?.email}) • Cross-community oversight & audit logging
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchMetrics();
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'audit') fetchAuditLogs();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-amber-600 text-amber-800 font-extrabold bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Platform Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('communities')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'communities'
              ? 'border-amber-600 text-amber-800 font-extrabold bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Communities ({metrics?.totalCommunities || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-amber-600 text-amber-800 font-extrabold bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Cross-Community Users ({metrics?.totalPlatformUsers || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-amber-600 text-amber-800 font-extrabold bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Universal Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Communities</span>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalCommunities}</p>
              <span className="mt-1 text-[11px] text-slate-500 font-medium">Independent workspaces active</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Platform Users</span>
                <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalPlatformUsers}</p>
              <span className="mt-1 text-[11px] text-slate-500 font-medium">Admin & staff accounts</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Choir / Community Members</span>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{metrics.totalMembers}</p>
              <span className="mt-1 text-[11px] text-slate-500 font-medium">Enrolled singers & contributors</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Pooled Capital</span>
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {metrics.totalPooledCapital.toLocaleString()} <span className="text-xs font-normal text-slate-500">RWF</span>
              </p>
              <span className="mt-1 text-[11px] text-slate-500 font-medium">Total ledger balances in system</span>
            </div>
          </div>

          {/* Communities Snapshot & Recent Audit Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communities list card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Communities Overview</h3>
                <button
                  onClick={() => setActiveTab('communities')}
                  className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {metrics.communities.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{c.name}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {c.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>{c.memberCount} members</span>
                        <span>•</span>
                        <span>{c.userCount} operators</span>
                        <span>•</span>
                        <span>Currency: {c.currency}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-700">
                        {c.totalBalance.toLocaleString()} {c.currency}
                      </span>
                      <p className="text-[10px] text-slate-400">Total Treasury</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Recent Audit stream */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Live Global Audit Feed</h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1"
                >
                  <span>Full Trail</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                {metrics.recentAuditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-slate-800">{log.actorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {log.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNITIES */}
      {activeTab === 'communities' && metrics && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Platform Communities ({metrics.communities.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Community Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Choir Members</th>
                  <th className="px-4 py-3">System Users</th>
                  <th className="px-4 py-3 text-right">Treasury Balance</th>
                  <th className="px-4 py-3">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.communities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.slug}</td>
                    <td className="px-4 py-3 font-semibold">{c.currency}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{c.memberCount} members</td>
                    <td className="px-4 py-3 text-slate-600">{c.userCount} operators</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {c.totalBalance.toLocaleString()} {c.currency}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS WITH COMMUNITY FILTER */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:border-amber-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Communities</option>
                {metrics?.communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:border-amber-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin (President)</option>
                <option value="MANAGER">Manager (Treasurer)</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Community Workspace</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{u.fullName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {u.tenantName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No platform users matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UNIVERSAL AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filter */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit descriptions, actors, actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:border-amber-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Communities</option>
                {metrics?.communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Log Feed */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Universal Plain-Language Audit Stream ({auditLogs.length} events)
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition flex items-start gap-4">
                  <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{log.actorName}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No audit logs matching this search criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
