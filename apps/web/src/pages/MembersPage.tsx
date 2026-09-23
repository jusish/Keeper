import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  X,
  CreditCard,
  UserCheck,
  Download,
} from 'lucide-react';
import { Gender, MemberStatus } from '@keeper/shared';
import { pdf } from '@react-pdf/renderer';
import { MembersRosterPDF } from '../reports/MembersRosterPDF';

interface MembersPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDetail, setMemberDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/members');
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setSelectedMemberId(id);
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/members/${id}`);
      setMemberDetail(res.data);
    } catch (err) {
      console.error('Failed to load member detail', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (m.membershipCode && m.membershipCode.toLowerCase().includes(search.toLowerCase())) ||
      (m.phone && m.phone.includes(search));

    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleExportPdf = async () => {
    if (members.length === 0) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <MembersRosterPDF
          members={filteredMembers}
          tenantName={tenant?.name || 'Community Organization'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Members_Directory_${(tenant?.name || 'Community').replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Members PDF', err);
      alert('Failed to generate Members Directory PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Community Members Directory
          </h1>
          <p className="text-xs text-slate-500">
            {members.length} registered members enrolled in {tenant?.name || 'the community'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export Directory PDF'}</span>
          </button>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => onOpenQuickActions('member')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search member by name, phone or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'INACTIVE', 'PROBATION'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
              <th className="px-4 py-3">Member</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Gender</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Credit / Surplus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map((m) => (
              <tr
                key={m.id}
                onClick={() => handleOpenDetail(m.id)}
                className="hover:bg-slate-50/70 transition cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                      {m.fullName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{m.fullName}</span>
                      {m.membershipCode && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.membershipCode}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-500 font-mono">
                  {m.phone || '-'}
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {m.email || '-'}
                </td>
                <td className="px-3 py-3 text-slate-500">{m.gender}</td>
                <td className="px-3 py-3 text-center">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  {m.creditBalance > 0 ? (
                    <span className="text-emerald-700 font-extrabold">
                      +{formatCurrency(m.creditBalance, tenant?.currency)}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member Detail Slide-over Drawer */}
      {selectedMemberId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Member Profile & Ledger
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {memberDetail?.member.fullName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMemberId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading member ledger...</div>
            ) : memberDetail ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Attendance Rate
                    </span>
                    <p className="mt-1 text-xl font-black text-emerald-900">
                      {memberDetail.stats.attendanceRate}%
                    </p>
                    <span className="text-[10px] text-emerald-700">
                      {memberDetail.stats.presentCount} present, {memberDetail.stats.excusedCount} excused
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Membership Code
                    </span>
                    <p className="mt-1 text-base font-bold text-slate-900 font-mono">
                      {memberDetail.member.membershipCode || 'N/A'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Status: {memberDetail.member.status}
                    </span>
                  </div>
                </div>

                {/* Recent Payments Transcript */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Payment Transactions ({memberDetail.recentPayments.length})
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    {memberDetail.recentPayments.length > 0 ? (
                      memberDetail.recentPayments.map((p: any) => (
                        <div key={p.id} className="p-3 bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">
                              {formatCurrency(p.amount, tenant?.currency)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {formatDate(p.paymentDate)} • {p.accountName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">
                            {p.method}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-xs text-slate-400">No payments found</p>
                    )}
                  </div>
                </div>

                {/* Recent Attendance Transcript */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Recent Attendance
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                    {memberDetail.recentAttendance.map((a: any) => (
                      <div key={a.id} className="p-3 bg-white text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{a.sessionTitle}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              a.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'ABSENT_EXCUSED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                        {a.reasonNote && (
                          <p className="text-[11px] text-amber-800 mt-1 italic font-medium">
                            Note: "{a.reasonNote}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
