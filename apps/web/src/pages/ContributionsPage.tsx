import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { pdf } from '@react-pdf/renderer';
import { UmusanzuMatrixPDF } from '../reports/UmusanzuMatrixPDF';
import {
  TableProperties,
  Search,
  Filter,
  Download,
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  ContributionMatrixResponse,
  AssessmentStatus,
} from '@keeper/shared';

interface ContributionsPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const ContributionsPage: React.FC<ContributionsPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [data, setData] = useState<ContributionMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/contributions/matrix');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load contributions matrix', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <UmusanzuMatrixPDF
          data={data}
          tenantName={tenant?.name || 'Community Choir'}
          currency={tenant?.currency || 'RWF'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Umusanzu_Matrix_${data.plan.title.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredRows = (data?.rows || []).filter((row) => {
    const matchSearch =
      row.member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.member.membershipCode &&
        row.member.membershipCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchVoice =
      voiceFilter === 'ALL' || row.member.voicePart === voiceFilter;

    const matchStatus =
      statusFilter === 'ALL' || row.overallStatus === statusFilter;

    return matchSearch && matchVoice && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span>Generating high-density Umusanzu matrix...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-slate-500">No active contribution plan found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
              {data.plan.cycle} Plan
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Standard: {formatCurrency(data.plan.defaultAmount, tenant?.currency)}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">
            {data.plan.title}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Mandatory unifying dues across all members with surplus (+) credit tracking and advance payments.
          </p>
        </div>

        {/* Global Stats & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-2 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Annual Collected
            </span>
            <span className="text-base font-black text-emerald-700">
              {formatCurrency(data.grandTotalCollected, tenant?.currency)}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">
              ({data.overallCollectionRate}%)
            </span>
          </div>

          <button
            onClick={() => setShowWhatsApp(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
            title="Export summary to WhatsApp"
          >
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp Report</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
            title="Export high-density vector PDF"
          >
            <Download className="h-4 w-4" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => onOpenQuickActions('payment')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Section / Voice Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Soprano', 'Alto', 'Tenor', 'Bass'].map((v) => (
            <button
              key={v}
              onClick={() => setVoiceFilter(v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                voiceFilter === v
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* THE HIGH-DENSITY MATRIX TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {/* Fixed Member info */}
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3.5 shadow-[1px_0_0_0_#e2e8f0] w-64 min-w-[16rem]">
                  Member Roster ({filteredRows.length})
                </th>

                {/* 12 Periods / Months */}
                {data.periods.map((period) => (
                  <th
                    key={period.id}
                    className="px-3 py-3.5 text-center min-w-[7.5rem] border-r border-slate-100"
                  >
                    <div>{period.label}</div>
                    <div className="text-[10px] font-normal text-slate-400 font-mono mt-0.5">
                      {data.totalsByPeriod[period.id]?.collectionRate || 0}% col.
                    </div>
                  </th>
                ))}

                {/* Summaries */}
                <th className="px-4 py-3.5 text-right min-w-[6.5rem]">Total Paid</th>
                <th className="px-4 py-3.5 text-center min-w-[5.5rem]">Surplus (+)</th>
                <th className="px-4 py-3.5 text-right min-w-[6.5rem]">Remaining</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.member.id} className="hover:bg-slate-50/70 transition">
                  {/* Sticky Member Column */}
                  <td className="sticky left-0 z-10 bg-white hover:bg-slate-50/70 px-4 py-3 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {row.member.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {row.member.fullName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          {row.member.membershipCode && (
                            <span className="font-mono">{row.member.membershipCode}</span>
                          )}
                          <span>•</span>
                          <span className="font-medium text-slate-600">
                            {row.member.voicePart || 'Member'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Monthly Period Cells */}
                  {data.periods.map((period) => {
                    const cell = row.cells[period.id];
                    if (!cell) {
                      return (
                        <td
                          key={period.id}
                          className="px-2 py-3 text-center border-r border-slate-50 text-slate-300"
                        >
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={period.id}
                        className="px-2 py-3 text-center border-r border-slate-50"
                      >
                        {/* Status chip with surplus indicator */}
                        {cell.status === AssessmentStatus.SURPLUS ? (
                          <div className="inline-flex flex-col items-center justify-center rounded-lg bg-emerald-500 text-white px-2 py-1 shadow-2xs">
                            <span className="text-[11px] font-bold leading-tight">
                              {cell.paidAmount.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-extrabold bg-emerald-700/60 px-1 rounded mt-0.5 tracking-tight">
                              +{cell.surplusAmount.toLocaleString()}
                            </span>
                          </div>
                        ) : cell.status === AssessmentStatus.PAID ? (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold px-2 py-1 text-[11px]">
                            <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{cell.paidAmount.toLocaleString()}</span>
                          </div>
                        ) : cell.status === AssessmentStatus.PARTIAL ? (
                          <div className="inline-flex flex-col items-center rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-1.5 py-0.5">
                            <span className="text-[10px] font-bold">
                              {cell.paidAmount.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-amber-700">
                              rem: {cell.remainingAmount.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block text-[11px] font-mono text-slate-300">
                            -
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Member Summary Columns */}
                  <td className="px-4 py-3 text-right font-black text-slate-900 font-mono">
                    {formatCurrency(row.totalPaid, tenant?.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.totalSurplus > 0 ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 font-mono">
                        +{row.totalSurplus.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600 font-mono">
                    {row.totalRemaining > 0 ? (
                      <span className="text-rose-600">
                        {formatCurrency(row.totalRemaining, tenant?.currency)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Bottom Summary Footer Row */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-800">
              <tr>
                <td className="sticky left-0 z-20 bg-slate-100 px-4 py-3.5 shadow-[1px_0_0_0_#cbd5e1] font-black uppercase text-[11px]">
                  Totals ({filteredRows.length} members)
                </td>
                {data.periods.map((p) => {
                  const pt = data.totalsByPeriod[p.id];
                  return (
                    <td key={p.id} className="px-2 py-3.5 text-center border-r border-slate-200">
                      <div className="text-[11px] font-extrabold font-mono text-slate-900">
                        {pt?.collected?.toLocaleString() || 0}
                      </div>
                      <div className="text-[9px] text-emerald-700 font-bold">
                        {pt?.collectionRate || 0}% rate
                      </div>
                    </td>
                  );
                })}
                <td className="px-4 py-3.5 text-right font-black font-mono text-emerald-800">
                  {formatCurrency(data.grandTotalCollected, tenant?.currency)}
                </td>
                <td className="px-4 py-3.5 text-center font-bold font-mono text-emerald-700">
                  +{data.grandTotalSurplus.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right font-black font-mono text-slate-700">
                  {formatCurrency(data.grandTotalRemaining, tenant?.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={showWhatsApp}
        onClose={() => setShowWhatsApp(false)}
        reportType="UMUSANZU"
      />
    </div>
  );
};
