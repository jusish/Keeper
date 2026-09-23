import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/utils';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { Modal } from '../components/common/Modal';
import { pdf } from '@react-pdf/renderer';
import { AttendanceSessionPDF } from '../reports/AttendanceSessionPDF';
import {
  UserCheck,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  MessageSquare,
  Ban,
  Save,
  Check,
  Search,
  Lock,
  Download,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';
import {
  AttendanceStatus,
  SessionType,
  SessionStatus,
} from '@keeper/shared';

export const AttendancePage: React.FC = () => {
  const { tenant, user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordsDraft, setRecordsDraft] = useState<Record<string, { status: AttendanceStatus; reasonNote: string }>>({});
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // New Session form
  const [newTitle, setNewTitle] = useState('Tuesday General Assembly');
  const [newType, setNewType] = useState<SessionType>(SessionType.REGULAR_MEETING);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('18:00');
  const [newEndTime, setNewEndTime] = useState('20:30');
  const [newIsRecurring, setNewIsRecurring] = useState(true);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
  const [newRule, setNewRule] = useState('WEEKLY_TUESDAY');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/sessions');
      setSessions(res.data);
      if (res.data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(res.data[0].id);
        loadSessionDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/attendance/sessions/${id}`);
      setSessionDetail(res.data);

      // Initialize draft
      const draft: Record<string, { status: AttendanceStatus; reasonNote: string }> = {};
      for (const r of res.data.records) {
        draft[r.memberId] = {
          status: r.status,
          reasonNote: r.reasonNote || '',
        };
      }
      setRecordsDraft(draft);
    } catch (err) {
      console.error('Failed to load session detail', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    loadSessionDetail(id);
  };

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    setRecordsDraft((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        status,
      },
    }));
  };

  const handleReasonChange = (memberId: string, reasonNote: string) => {
    setRecordsDraft((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        reasonNote,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (!sessionDetail) return;
    const draft: Record<string, { status: AttendanceStatus; reasonNote: string }> = {};
    for (const r of sessionDetail.records) {
      draft[r.memberId] = {
        status: AttendanceStatus.PRESENT,
        reasonNote: '',
      };
    }
    setRecordsDraft(draft);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    setIsSaving(true);
    try {
      const records = Object.entries(recordsDraft).map(([memberId, data]) => ({
        memberId,
        status: data.status,
        reasonNote: data.reasonNote || undefined,
      }));

      await api.post(`/attendance/sessions/${selectedSessionId}/mark`, {
        records,
      });

      alert('Attendance roster finalized successfully!');
      loadSessionDetail(selectedSessionId);
      loadSessions();
    } catch (err) {
      alert('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSession = async () => {
    if (!selectedSessionId || !cancelReason) {
      alert('Please state a reason for cancelling this session.');
      return;
    }

    try {
      await api.post(`/attendance/sessions/${selectedSessionId}/cancel`, {
        cancellationReason: cancelReason,
      });

      setShowCancelModal(false);
      setCancelReason('');
      loadSessionDetail(selectedSessionId);
      loadSessions();
    } catch (err) {
      alert('Failed to cancel session');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance/sessions', {
        title: newTitle,
        sessionType: newType,
        sessionDate: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        isRecurring: newIsRecurring,
        recurrenceRule: newIsRecurring ? `${recurrenceFreq}:${recurrenceCount}` : undefined,
      });

      setShowCreateModal(false);
      loadSessions();
    } catch (err) {
      alert('Failed to schedule session');
    }
  };

  const handleExportPdf = async () => {
    if (!sessionDetail) return;
    setIsExportingPdf(true);
    try {
      const blob = await pdf(
        <AttendanceSessionPDF
          session={sessionDetail}
          tenantName={tenant?.name || 'Community Organization'}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_${sessionDetail.title.replace(/\s+/g, '_')}_${sessionDetail.sessionDate ? sessionDetail.sessionDate.slice(0, 10) : 'report'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Attendance PDF', err);
      alert('Failed to generate Attendance PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth(new Date(calYear, calMonth + 1, 1));
  };
  const goToToday = () => {
    setCalendarMonth(new Date());
  };

  const getSessionDateKey = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getSessionDateKey(new Date().toISOString());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Attendance & Discipline
          </h1>
          <p className="text-xs text-slate-500">
            Track meeting and activity attendance, documented excuse notations, and session cancellations.
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Session</span>
          </button>
        )}
      </div>

      {/* Calendar / List View Schedule Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold text-slate-900 min-w-36 text-center">
              {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Today
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'CALENDAR'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'LIST'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5 text-emerald-600" />
              <span>List ({sessions.length})</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'CALENDAR' ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 bg-slate-50/50 p-1.5" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInCalMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const daySessions = sessions.filter((s) => getSessionDateKey(s.sessionDate) === dayKey);
                const isToday = dayKey === todayStr;

                return (
                  <div
                    key={day}
                    className={`min-h-24 bg-white p-1.5 flex flex-col transition ${
                      isToday ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'bg-emerald-600 text-white rounded-full h-5 w-5 flex items-center justify-center font-bold text-[10px]'
                            : 'text-slate-700'
                        }`}
                      >
                        {day}
                      </span>
                      {daySessions.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {daySessions.length} {daySessions.length === 1 ? 'event' : 'events'}
                        </span>
                      )}
                    </div>

                    {/* Session Pills */}
                    <div className="space-y-1 overflow-y-auto max-h-20">
                      {daySessions.map((sess) => {
                        const isSelected = sess.id === selectedSessionId;
                        const isCancelled = sess.status === SessionStatus.CANCELLED;
                        const isCompleted = sess.status === SessionStatus.COMPLETED;

                        return (
                          <button
                            key={sess.id}
                            onClick={() => handleSelectSession(sess.id)}
                            className={`w-full text-left truncate px-2 py-1 rounded-md text-[10px] font-bold border transition block ${
                              isSelected
                                ? 'ring-2 ring-emerald-500 shadow-2xs font-extrabold'
                                : 'hover:opacity-80'
                            } ${
                              isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                            title={`${sess.title} (${sess.status})`}
                          >
                            <span className="mr-1 opacity-70">
                              {sess.startTime || '•'}
                            </span>
                            <span>{sess.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Session Title</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Attendance Breakdown</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => {
                  const isSelected = sess.id === selectedSessionId;
                  const isCancelled = sess.status === SessionStatus.CANCELLED;

                  return (
                    <tr
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 font-medium">
                        {formatDate(sess.sessionDate)} {sess.startTime ? `(${sess.startTime})` : ''}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {sess.title}
                        {sess.isRecurring && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-normal">
                            <RotateCw className="h-2.5 w-2.5" /> Repeat
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 uppercase text-[10px] font-bold">
                        {sess.sessionType.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : sess.status === SessionStatus.COMPLETED
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[10px]">
                        {sess.recordCount ? (
                          <span className="space-x-2">
                            <span className="text-emerald-700 font-bold">✓ {sess.recordCount.present}</span>
                            <span className="text-amber-700 font-bold">⏳ {sess.recordCount.excused}</span>
                            <span className="text-rose-700 font-bold">✗ {sess.recordCount.unexcused}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSession(sess.id);
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SELECTED SESSION DETAIL & CHECKLIST */}
      {sessionDetail && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          {/* Session Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {sessionDetail.sessionType.replace('_', ' ')}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  {formatDate(sessionDetail.sessionDate)} {sessionDetail.startTime && `at ${sessionDetail.startTime}`}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {sessionDetail.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
              </button>

              <button
                onClick={() => setShowWhatsApp(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Summary</span>
              </button>

              {sessionDetail.status === SessionStatus.COMPLETED ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span>Finalized & Sealed</span>
                </div>
              ) : sessionDetail.status !== SessionStatus.CANCELLED && user?.role !== 'VIEWER' ? (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition"
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-600" />
                    <span>Cancel Session</span>
                  </button>

                  <button
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Set All Present</span>
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Finalize Attendance'}</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Session Attendance KPI Cards */}
          {sessionDetail.recordCount && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Present"
                value={sessionDetail.recordCount.present}
                subtitle={`${sessionDetail.recordCount.total > 0 ? Math.round((sessionDetail.recordCount.present / sessionDetail.recordCount.total) * 100) : 0}% attendance rate`}
                icon={CheckCircle2}
                color="emerald"
                valueColor="text-emerald-700"
                progress={sessionDetail.recordCount.total > 0 ? Math.round((sessionDetail.recordCount.present / sessionDetail.recordCount.total) * 100) : 0}
              />
              <StatCard
                title="Excused"
                value={sessionDetail.recordCount.excused}
                subtitle="Approved excuse notes"
                icon={Clock}
                color="amber"
                valueColor="text-amber-700"
              />
              <StatCard
                title="Late"
                value={sessionDetail.recordCount.late}
                subtitle="Tardy arrivals"
                icon={AlertTriangle}
                color="purple"
                valueColor="text-purple-700"
              />
              <StatCard
                title="Unexcused"
                value={sessionDetail.recordCount.unexcused}
                subtitle="Absences without notice"
                icon={Ban}
                color="rose"
                valueColor="text-rose-700"
              />
            </div>
          )}

          {/* Cancellation Notice Banner (If cancelled) */}
          {sessionDetail.status === SessionStatus.CANCELLED && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
              <div className="flex items-start gap-3">
                <Ban className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                    Session Cancelled for the Entire Community / Group
                  </h3>
                  <p className="mt-1 text-xs text-rose-800 leading-relaxed font-medium">
                    Reason: <em>"{sessionDetail.cancellationReason}"</em>
                  </p>
                  <span className="block mt-1 text-[10px] text-rose-600">
                    This session recurrence remains scheduled for following weeks.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sealed Attendance Banner (If completed) */}
          {sessionDetail.status === SessionStatus.COMPLETED && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Attendance Finalized & Sealed
                  </h4>
                  <p className="text-xs text-emerald-800">
                    This session record is permanently locked in the audit ledger and cannot be edited.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full shadow-2xs">
                IMMUTABLE RECORD
              </span>
            </div>
          )}

          {/* Attendance Roster Checklist Table */}
          {sessionDetail.status !== SessionStatus.CANCELLED && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-3 py-3">Role / Tag</th>
                    <th className="px-3 py-3">Attendance Status</th>
                    <th className="px-4 py-3">Excuse Note / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionDetail.records.map((r: any) => {
                    const draft = recordsDraft[r.memberId] || {
                      status: r.status,
                      reasonNote: '',
                    };

                    const isLocked = sessionDetail.status === SessionStatus.COMPLETED;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {r.memberFullName}
                        </td>
                        <td className="px-3 py-3 text-slate-500 font-medium">
                          Member
                        </td>
                        <td className="px-3 py-3">
                          {isLocked ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                                draft.status === AttendanceStatus.PRESENT
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : draft.status === AttendanceStatus.ABSENT_EXCUSED
                                  ? 'bg-amber-100 text-amber-800'
                                  : draft.status === AttendanceStatus.LATE
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {draft.status === AttendanceStatus.PRESENT && '✓ Present'}
                              {draft.status === AttendanceStatus.ABSENT_EXCUSED && '⏳ Excused'}
                              {draft.status === AttendanceStatus.LATE && '🕒 Late'}
                              {draft.status === AttendanceStatus.ABSENT_UNEXCUSED && '✗ Absent'}
                            </span>
                          ) : (
                            /* 4 Status Toggle Buttons */
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(r.memberId, AttendanceStatus.PRESENT)}
                                className={`rounded-md px-2.5 py-1 font-bold transition ${
                                  draft.status === AttendanceStatus.PRESENT
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(r.memberId, AttendanceStatus.ABSENT_EXCUSED)}
                                className={`rounded-md px-2.5 py-1 font-bold transition ${
                                  draft.status === AttendanceStatus.ABSENT_EXCUSED
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Excused
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(r.memberId, AttendanceStatus.LATE)}
                                className={`rounded-md px-2.5 py-1 font-bold transition ${
                                  draft.status === AttendanceStatus.LATE
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(r.memberId, AttendanceStatus.ABSENT_UNEXCUSED)}
                                className={`rounded-md px-2.5 py-1 font-bold transition ${
                                  draft.status === AttendanceStatus.ABSENT_UNEXCUSED
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isLocked ? (
                            <span className="text-xs text-slate-600 font-medium">
                              {draft.reasonNote || '—'}
                            </span>
                          ) : (
                            <input
                              type="text"
                              placeholder={
                                draft.status === AttendanceStatus.ABSENT_EXCUSED
                                  ? 'Specify approved reason (e.g. Work shift, Illness)...'
                                  : 'Optional note...'
                              }
                              value={draft.reasonNote}
                              onChange={(e) => handleReasonChange(r.memberId, e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1 text-xs focus:outline-none ${
                                draft.status === AttendanceStatus.ABSENT_EXCUSED && !draft.reasonNote
                                  ? 'border-amber-300 bg-amber-50/50'
                                  : 'border-slate-200 bg-white'
                              }`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cancel Session Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Cancel Session for the Entire Community / Group</h3>
          <p className="mt-1 text-xs text-slate-500">
            Provide a clear reason (e.g., severe weather, holiday, emergency). The session will remain in the calendar marked as Cancelled.
          </p>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700">Cancellation Reason *</label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Inclement weather making travel unsafe..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="rounded-lg border px-3 py-1.5 text-xs text-slate-600"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCancelSession}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Session Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Schedule Community Activity / Session</h3>
          <form onSubmit={handleCreateSession} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Session Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Tuesday General Assembly"
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Session Type</label>
                <SearchableSelect
                  options={[
                    { value: SessionType.REGULAR_MEETING, label: 'General Assembly / Meeting' },
                    { value: SessionType.COMMITTEE_MEETING, label: 'Committee Meeting' },
                    { value: SessionType.WORKSHOP_TRAINING, label: 'Workshop / Training' },
                    { value: SessionType.COMMUNITY_WORK, label: 'Community Work / Activity' },
                    { value: SessionType.SPECIAL_EVENT, label: 'Special Event' },
                  ]}
                  value={newType}
                  onChange={(val) => setNewType(val as SessionType)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">Start Time</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">End Time</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rec"
                  checked={newIsRecurring}
                  onChange={(e) => setNewIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="rec" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Repeating session series (Automatic schedule generator)
                </label>
              </div>

              {newIsRecurring && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                    <SearchableSelect
                      options={[
                        { value: 'WEEKLY', label: 'Weekly (Every 7 days)' },
                        { value: 'BIWEEKLY', label: 'Bi-Weekly (Every 14 days)' },
                        { value: 'MONTHLY', label: 'Monthly (Every 30 days)' },
                      ]}
                      value={recurrenceFreq}
                      onChange={(val) => setRecurrenceFreq(val as any)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Occurrences Count</label>
                    <input
                      type="number"
                      min="2"
                      max="24"
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Schedule Session
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* WhatsApp Modal */}
      {selectedSessionId && (
        <WhatsAppModal
          isOpen={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          reportType="ATTENDANCE"
          targetId={selectedSessionId}
        />
      )}
    </div>
  );
};
