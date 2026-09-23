import React, { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { SearchableSelect, SearchableOption } from '../../components/common/SearchableSelect';
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

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/overview');
      setMetrics(res.data);
    } catch (err) {
      console.warn('Retrying /admin/metrics...', err);
      try {
        const fallback = await api.get('/admin/metrics');
        setMetrics(fallback.data);
      } catch (e) {
        console.error('Failed to fetch platform metrics', e);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const params: any = {};
      if (selectedTenantFilter !== 'ALL') params.tenantId = selectedTenantFilter;
      if (selectedRoleFilter !== 'ALL') params.role = selectedRoleFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/admin/users', { params });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch platform users', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params: any = {};
      if (selectedTenantFilter !== 'ALL') params.tenantId = selectedTenantFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/admin/audit-logs', { params });
      setAuditLogs(res.data);
    } catch (err) {
      console.warn('Retrying /admin/audit...', err);
      try {
        const params: any = {};
        if (selectedTenantFilter !== 'ALL') params.tenantId = selectedTenantFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const fallback = await api.get('/admin/audit', { params });
        setAuditLogs(fallback.data);
      } catch (e) {
        console.error('Failed to fetch universal audit logs', e);
      }
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchUsers(), fetchAuditLogs()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, selectedTenantFilter, selectedRoleFilter, searchQuery]);

  const handleTabChange = (tab: 'overview' | 'communities' | 'users' | 'audit') => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' ? '/admin' : `/admin/${tab}`);
    }
  };

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
      await fetchMetrics();
      await fetchUsers();
      alert('Community created successfully!');
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

  const communitySelectOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [{ value: 'ALL', label: 'All Communities' }];
    if (metrics?.communities) {
      metrics.communities.forEach((c) => {
        opts.push({
          value: c.id,
          label: c.name,
          sublabel: `${c.memberCount} members`,
          badge: c.slug,
        });
      });
    }
    return opts;
  }, [metrics?.communities]);

  if (loading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading Platform Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Console Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-100 text-emerald-600 shadow-xs">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Super Admin Platform Console</h1>
              <span className="rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 border border-emerald-200">
                ROOT AUTHORITY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cross-community isolation oversight, universal audit trail, and user access management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Console Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 text-xs font-bold">
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-900 font-extrabold bg-emerald-50/80 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Platform Overview</span>
        </button>
        <button
          onClick={() => handleTabChange('communities')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'communities'
              ? 'border-emerald-600 text-emerald-900 font-extrabold bg-emerald-50/80 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Communities ({metrics?.totalCommunities || 0})</span>
        </button>
        <button
          onClick={() => handleTabChange('users')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-900 font-extrabold bg-emerald-50/80 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Platform Users ({metrics?.totalPlatformUsers || 0})</span>
        </button>
        <button
          onClick={() => handleTabChange('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-900 font-extrabold bg-emerald-50/80 rounded-t-xl'
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
              valueColor="text-emerald-700"
              subtitle="Aggregated platform treasury"
              icon={Wallet}
              color="emerald"
            />
          </div>

          {/* Communities Snapshot & Recent Audit Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communities list card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Active Communities</h3>
                <button
                  onClick={() => handleTabChange('communities')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {metrics.communities.map((c) => (
                  <div key={c.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{c.name}</span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
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
                      <p className="text-[10px] text-slate-400">Treasury Total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Recent Audit stream */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Live Universal Audit Feed</h3>
                <button
                  onClick={() => handleTabChange('audit')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>Full Trail</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                {metrics.recentAuditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-slate-800">{log.actorName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium mt-1">
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
        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Registered Community Tenants ({metrics.communities.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Each community represents an isolated tenant with separate ledger, member directory, and audit logs.
              </p>
            </div>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Community</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Community Name</th>
                  <th className="px-5 py-3.5">Slug ID</th>
                  <th className="px-5 py-3.5">Currency</th>
                  <th className="px-5 py-3.5">Members</th>
                  <th className="px-5 py-3.5">Operators</th>
                  <th className="px-5 py-3.5 text-right">Treasury Balance</th>
                  <th className="px-5 py-3.5">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.communities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{c.slug}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{c.currency}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{c.memberCount} members</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.userCount} operators</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                      {c.totalBalance.toLocaleString()} {c.currency}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS WITH SEARCHABLE COMMUNITY FILTER & STATUS ACTIONS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <SearchableSelect
                  options={communitySelectOptions}
                  value={selectedTenantFilter}
                  onChange={setSelectedTenantFilter}
                  placeholder="Filter by community"
                  searchPlaceholder="Search community..."
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
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
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">User Name</th>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Community Workspace</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{u.fullName}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {u.tenantName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{u.phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="h-3 w-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={togglingUserId === u.id}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
                              u.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
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
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
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
          <div className="flex flex-col sm:flex-row gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit descriptions, actors, actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="w-56">
              <SearchableSelect
                options={communitySelectOptions}
                value={selectedTenantFilter}
                onChange={setSelectedTenantFilter}
                placeholder="Filter by community"
                searchPlaceholder="Search community..."
              />
            </div>
          </div>

          {/* Audit Log Feed */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Universal Plain-Language Audit Stream ({auditLogs.length} events logged)
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/60 transition flex items-start gap-4">
                  <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {log.tenantName}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{log.actorName}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 rounded-xl p-3 border border-slate-200/60">
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

      {/* REGISTER NEW COMMUNITY MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Register New Community Tenant</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {communityError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{communityError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCommunity} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Community Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kigali Youth Initiative"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Operating Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="RWF">RWF (Rwanda Franc)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="KES">KES (Kenya Shilling)</option>
                  <option value="UGX">UGX (Uganda Shilling)</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
                  Initial Community Administrator Account
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patrick Mugabo"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Admin Email</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@community.rw"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Initial Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCommunity}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
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
