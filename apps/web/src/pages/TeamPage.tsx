import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/utils';
import { Role } from '@keeper/shared';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { Modal } from '../components/common/Modal';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Send,
  Edit2,
  Calendar,
} from 'lucide-react';

interface TeamUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  isExpired: boolean;
  invitedBy: string;
  createdAt: string;
}

export const TeamPage: React.FC = () => {
  const { user, tenant } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.MANAGER);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editRole, setEditRole] = useState<Role>(Role.MANAGER);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Resending feedback
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canManage = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        api.get('/invitations/users'),
        api.get('/invitations'),
      ]);
      setUsers(usersRes.data || []);
      setInvitations(invitesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load team data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviting(true);

    try {
      await api.post('/invitations', {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteSuccess(`Invitation successfully sent to ${inviteEmail}.`);
      setInviteEmail('');
      setInviteRole(Role.MANAGER);
      await loadData();
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async (invitationId: string, email: string) => {
    setResendingId(invitationId);
    setActionNotice(null);
    try {
      await api.post(`/invitations/${invitationId}/resend`);
      setActionNotice({
        type: 'success',
        message: `Fresh invitation email sent to ${email} (valid for 48 hours).`,
      });
      await loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.message || 'Failed to resend invitation',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    setActionNotice(null);
    try {
      await api.delete(`/invitations/${invitationId}`);
      setActionNotice({
        type: 'success',
        message: 'Invitation revoked successfully.',
      });
      await loadData();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.message || 'Failed to revoke invitation',
      });
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingRole(true);
    try {
      await api.patch(`/invitations/users/${editingUser.id}/role`, {
        role: editRole,
      });
      setEditingUser(null);
      await loadData();
      setActionNotice({
        type: 'success',
        message: `Updated ${editingUser.fullName}'s role to ${editRole}.`,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setIsSavingRole(false);
    }
  };

  const roleBadge = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case Role.ADMIN:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case Role.MANAGER:
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case Role.VIEWER:
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const roleLabel = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'Super Admin';
      case Role.ADMIN:
        return 'Admin (President)';
      case Role.MANAGER:
        return 'Manager (Treasurer)';
      case Role.VIEWER:
      default:
        return 'Viewer (Read-only)';
    }
  };

  const expiredInvitesCount = invitations.filter((i) => i.isExpired).length;
  const activeUsersCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Team & User Access</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage authorized operators, treasurers, and send secure email invitations for{' '}
            <strong className="text-slate-800">{tenant?.name}</strong>.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite New User</span>
          </button>
        )}
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between rounded-2xl p-3.5 text-xs border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value={activeUsersCount}
          icon={UserCheck}
          subtitle={users.length ? 'Authorized in Community' : undefined}
          color="emerald"
        />
        <StatCard
          title="Pending Invites"
          value={invitations.length}
          icon={Mail}
          subtitle={invitations.length ? 'Awaiting activation' : 'All clear'}
          color="blue"
        />
        <StatCard
          title="Expired Invites"
          value={expiredInvitesCount}
          icon={Clock}
          subtitle={expiredInvitesCount ? 'Require resending' : 'None expired'}
          color={expiredInvitesCount ? 'amber' : 'slate'}
        />
        <StatCard
          title="Admins & Treasurers"
          value={users.filter((u) => u.role === Role.ADMIN || u.role === Role.MANAGER).length}
          icon={Shield}
          subtitle="Operational Officers"
          color="purple"
        />
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Active Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'invitations'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Pending Invitations ({invitations.length})</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE USERS */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Contact Phone</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5">Joined Date</th>
                {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found for this community.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{u.fullName}</span>
                            {u.id === user?.id && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${roleBadge(
                          u.role
                        )}`}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">
                      {u.phone || '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          u.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            u.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        {u.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setEditRole(u.role);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Change Role</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PENDING INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <th className="px-5 py-3.5">Invitee Email</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Invite Status</th>
                <th className="px-4 py-3.5">Expires At</th>
                <th className="px-4 py-3.5">Invited By</th>
                {canManage && <th className="px-5 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No pending invitations. All invited members have activated their accounts.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="font-bold text-slate-900 font-mono">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${roleBadge(
                          inv.role
                        )}`}
                      >
                        {roleLabel(inv.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {inv.isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertCircle className="h-3 w-3" />
                          Expired (48h past)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                          <Clock className="h-3 w-3" />
                          Pending Activation
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(inv.expiresAt).toLocaleDateString()} at{' '}
                      {new Date(inv.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{inv.invitedBy}</td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={resendingId === inv.id}
                            onClick={() => handleResend(inv.id, inv.email)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition disabled:opacity-50"
                            title="Resend invitation email with refreshed 48-hour expiration"
                          >
                            <Send className={`h-3 w-3 ${resendingId === inv.id ? 'animate-pulse' : ''}`} />
                            <span>{resendingId === inv.id ? 'Resending...' : 'Resend'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Revoke / Delete invitation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* INVITE NEW USER MODAL */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)}>
        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Invite User to Community</h3>
                <p className="text-xs text-slate-500">Send an activation link via email</p>
              </div>
            </div>
            <button
              onClick={() => setIsInviteOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {inviteError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="colleague@community.rw"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designated Community Role *
              </label>
              <SearchableSelect
                options={[
                  {
                    value: Role.MANAGER,
                    label: 'Manager (Treasurer)',
                    sublabel: 'Can record payments, expenses, events, and roll-call',
                  },
                  {
                    value: Role.ADMIN,
                    label: 'Admin (President / Leader)',
                    sublabel: 'Full administrative access and user management',
                  },
                  {
                    value: Role.VIEWER,
                    label: 'Viewer (Read-Only / Auditor)',
                    sublabel: 'Can inspect registers, statements, and download reports',
                  },
                ]}
                value={inviteRole}
                onChange={(val) => setInviteRole(val as Role)}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">How invitations work:</p>
              <p>
                An email containing an encrypted activation link will be delivered. The link will remain
                valid for <strong>48 hours</strong>. Upon clicking, the user sets their password and joins{' '}
                <strong className="text-slate-900">{tenant?.name}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
              >
                {isInviting ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT USER ROLE MODAL */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)}>
        {editingUser && (
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Member Role</h3>
                <p className="text-xs text-slate-500">{editingUser.fullName}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Role</label>
                <SearchableSelect
                  options={[
                    { value: Role.ADMIN, label: 'Admin (President / Leader)' },
                    { value: Role.MANAGER, label: 'Manager (Treasurer)' },
                    { value: Role.VIEWER, label: 'Viewer (Read-only)' },
                  ]}
                  value={editRole}
                  onChange={(val) => setEditRole(val as Role)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isSavingRole ? 'Saving...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
