import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
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
  XCircle,
  Layers,
  Globe,
  UserCheck,
  Plus,
  AlertCircle,
  X,
  Lock,
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

interface SuperAdminPortalProps {
  initialTab?: 'overview' | 'communities' | 'users' | 'audit';
  onNavigate?: (path: string) => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  initialTab = 'overview',
  onNavigate,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'communities' | 'users' | 'audit'>(initialTab);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<GlobalAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Register Community Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submittingCommunity, setSubmittingCommunity] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);

  // Status toggle state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: 'overview' | 'communities' | 'users' | 'audit') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'overview') onNavigate('/admin');
      else onNavigate(`/admin/${tab}`);
    }
  };

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

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommunityError(null);
    setSubmittingCommunity(true);
    try {
      await api.post('/admin/communities', {
        name: communityName,
        currency,
        adminFullName,
        adminEmail,
        adminPassword,
      });
      setIsRegisterModalOpen(false);
      setCommunityName('');
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
      fetchMetrics();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'audit') fetchAuditLogs();
    } catch (err: any) {
      setCommunityError(err.response?.data?.message || 'Failed to create community');
    } finally {
      setSubmittingCommunity(false);
    }
  };

  const handleToggleUserStatus = async (userToToggle: PlatformUser) => {
    setTogglingUserId(userToToggle.id);
    try {
      await api.patch(`/admin/users/${userToToggle.id}/status`, {
        isActive: !userToToggle.isActive,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userToToggle.id ? { ...u, isActive: !u.isActive } : u))
      );
      fetchMetrics();
    } catch (err) {
      console.error('Failed to toggle user status', err);
      alert('Failed to update user status');
    } finally {
      setTogglingUserId(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading Platform Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Console Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Super Admin Platform Console</h1>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 border border-amber-400/30">
                ROOT AUTHORITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cross-community isolation oversight, universal audit trail, and user access management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95 transition shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Register Community</span>
          </button>

          <button
            onClick={() => {
              fetchMetrics();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'audit') fetchAuditLogs();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Console Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 text-xs font-bold">
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Platform Overview</span>
        </button>
        <button
          onClick={() => handleTabChange('communities')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'communities'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Communities ({metrics?.totalCommunities || 0})</span>
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Platform Users ({metrics?.totalPlatformUsers || 0})</span>
        </button>
        <button
          onClick={() => handleTabChange('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-400 font-extrabold bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Universal Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Unified Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Communities"
              value={metrics.totalCommunities}
              subtitle="Active tenant workspaces"
              icon={Building2}
              color="blue"
              onClick={() => handleTabChange('communities')}
            />

            <StatCard
              title="Platform Users"
              value={metrics.totalPlatformUsers}
              subtitle="Admin & staff accounts"
              icon={Users}
              color="purple"
              onClick={() => handleTabChange('users')}
            />

            <StatCard
              title="Community Members"
              value={metrics.totalMembers}
              subtitle="Enrolled members across all groups"
              icon={UserCheck}
              color="emerald"
              onClick={() => handleTabChange('communities')}
            />

            <StatCard
              title="Total Pooled Capital"
              value={metrics.totalPooledCapital.toLocaleString()}
              unit="RWF"
              valueColor="text-amber-700"
              subtitle="Aggregated platform treasury"
              icon={Wallet}
              color="amber"
            />
          </div>

          {/* Communities Snapshot & Recent Audit Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communities list card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Active Communities</h3>
                <button
                  onClick={() => handleTabChange('communities')}
                  className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {metrics.communities.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {c.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>{c.memberCount} members</span>
                        <span>•</span>
                        <span>{c.userCount} operators</span>
                        <span>•</span>
                        <span>Currency: {c.currency}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        {c.totalBalance.toLocaleString()} {c.currency}
                      </span>
                      <p className="text-[10px] text-slate-500">Treasury Total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Recent Audit stream */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Live Universal Audit Feed</h3>
                <button
                  onClick={() => handleTabChange('audit')}
                  className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Full Trail</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                {metrics.recentAuditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-slate-200">{log.actorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium mt-1">
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
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Registered Community Tenants ({metrics.communities.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Each community represents an isolated tenant with separate ledger, member directory, and audit logs.
              </p>
            </div>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Community</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Community Name</th>
                  <th className="px-4 py-3.5">Slug ID</th>
                  <th className="px-4 py-3.5">Currency</th>
                  <th className="px-4 py-3.5">Community Members</th>
                  <th className="px-4 py-3.5">System Operators</th>
                  <th className="px-4 py-3.5 text-right">Treasury Balance</th>
                  <th className="px-4 py-3.5">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metrics.communities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-4 py-3.5 font-bold text-white">{c.name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">{c.slug}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-300">{c.currency}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-300">{c.memberCount} members</td>
                    <td className="px-4 py-3.5 text-slate-400">{c.userCount} operators</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                      {c.totalBalance.toLocaleString()} {c.currency}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS WITH COMMUNITY FILTER & STATUS ACTIONS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search user name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 focus:border-amber-500 focus:outline-none"
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
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 focus:border-amber-500 focus:outline-none"
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
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">User Name</th>
                    <th className="px-4 py-3.5">Email Address</th>
                    <th className="px-4 py-3.5">Community Workspace</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Phone</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Joined Date</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-3.5 font-bold text-white">{u.fullName}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                          {u.tenantName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : u.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{u.phone || '—'}</td>
                      <td className="px-4 py-3.5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={togglingUserId === u.id}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
                              u.isActive
                                ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                            }`}
                          >
                            {togglingUserId === u.id
                              ? 'Updating...'
                              : u.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
          <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search audit descriptions, actors, actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 focus:border-amber-500 focus:outline-none"
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
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Universal Plain-Language Audit Stream ({auditLogs.length} events logged)
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-900/40 transition flex items-start gap-4">
                  <div className="mt-0.5 rounded-full bg-slate-800 p-2 text-amber-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-white text-xs">{log.actorName}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No audit logs matching this search criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW COMMUNITY MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Register New Community Tenant</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {communityError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{communityError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCommunity} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300">Community Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kigali Youth Initiative"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300">Operating Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="RWF">RWF (Rwanda Franc)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="KES">KES (Kenya Shilling)</option>
                  <option value="UGX">UGX (Uganda Shilling)</option>
                </select>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Initial Community Administrator Account
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patrick Mugabo"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300">Admin Email</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@community.rw"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300">Initial Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="rounded-xl border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommunity}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50"
                >
                  {submittingCommunity ? 'Creating Community...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
