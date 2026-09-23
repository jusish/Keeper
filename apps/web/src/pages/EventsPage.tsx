import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { StatCard } from '../components/common/StatCard';
import {
  CalendarCheck,
  Plus,
  Users,
  CheckCircle,
  AlertCircle,
  Download,
  MessageSquare,
  Edit2,
  TrendingUp,
  Receipt,
  Shirt,
  MapPin,
  Calendar,
  Wallet,
  Trash2,
  X,
} from 'lucide-react';
import {
  TargetAudience,
  AssessmentStatus,
} from '@keeper/shared';

interface EventsPageProps {
  onOpenQuickActions: (tab: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  onOpenQuickActions,
}) => {
  const { tenant, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettlementLoading, setIsSettlementLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'SETTLED' | 'PENDING' | 'SURPLUS'>('ALL');
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSubEvents, setNewSubEvents] = useState<
    { title: string; targetAudience: TargetAudience; defaultAmount: number }[]
  >([
    { title: 'Community Project Attire / Materials', targetAudience: TargetAudience.ALL, defaultAmount: 20000 },
    { title: 'Logistics & Venue Contribution', targetAudience: TargetAudience.ALL, defaultAmount: 10000 },
  ]);

  // Edit custom assessment state
  const [editingAssessment, setEditingAssessment] = useState<{
    id: string;
    memberName: string;
    subEventTitle: string;
    currentAmount: number;
  } | null>(null);
  const [newCutAmount, setNewCutAmount] = useState<number>(0);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data);
      if (res.data.length > 0 && !selectedEventId) {
        setSelectedEventId(res.data[0].id);
        loadSettlement(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettlement = async (eventId: string) => {
    setIsSettlementLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/settlement`);
      setSettlement(res.data);
    } catch (err) {
      console.error('Failed to load event settlement', err);
    } finally {
      setIsSettlementLoading(false);
    }
  };

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    loadSettlement(id);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', {
        title: newTitle,
        eventDate: newDate,
        location: newLocation,
        subEvents: newSubEvents.filter((s) => s.title && s.defaultAmount > 0),
      });
      setShowCreateModal(false);
      loadEvents();
    } catch (err) {
      alert('Failed to create event');
    }
  };

  const handleSaveCustomCut = async () => {
    if (!editingAssessment) return;
    try {
      await api.put(`/events/assessments/${editingAssessment.id}`, {
        assignedAmount: newCutAmount,
      });
      setEditingAssessment(null);
      if (selectedEventId) loadSettlement(selectedEventId);
    } catch (err) {
      alert('Failed to update member assessment');
    }
  };

  const filteredMembers = (settlement?.members || []).filter((m: any) => {
    if (memberFilter === 'SETTLED') return m.isFullyPaid;
    if (memberFilter === 'PENDING') return !m.isFullyPaid;
    if (memberFilter === 'SURPLUS') return m.totalSurplus > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Event Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Events & Projects</h1>
          <p className="text-xs text-slate-500">
            Multi-tiered community project assessments, member contributions, and financial settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Event Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {events.map((ev) => {
          const isSelected = ev.id === selectedEventId;
          return (
            <StatCard
              key={ev.id}
              title={ev.title}
              value={formatCurrency(ev.totalCollected, tenant?.currency)}
              subtitle={`${formatDate(ev.eventDate)} • ${ev.location || 'Kigali'}`}
              icon={Calendar}
              color={isSelected ? 'emerald' : 'slate'}
              progress={ev.collectionRate}
              onClick={() => handleSelectEvent(ev.id)}
              className={isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md' : 'hover:border-slate-300'}
            />
          );
        })}
      </div>

      {/* SELECTED EVENT SETTLEMENT REPORT */}
      {settlement && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Executive Overview Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Settlement & Audit Report
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{formatDate(settlement.event.eventDate)}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {settlement.event.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWhatsApp(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Summary</span>
              </button>

              {user?.role !== 'VIEWER' && (
                <button
                  onClick={() => onOpenQuickActions('payment')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Record Event Payment</span>
                </button>
              )}
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Budgeted"
              value={formatCurrency(settlement.totalAssessed, tenant?.currency)}
              subtitle="Target project assessment"
              icon={CalendarCheck}
              color="slate"
            />
            <StatCard
              title="Total Inflow Collected"
              value={formatCurrency(settlement.totalCollected, tenant?.currency)}
              subtitle={`${settlement.totalAssessed > 0 ? Math.round((settlement.totalCollected / settlement.totalAssessed) * 100) : 0}% collected`}
              icon={TrendingUp}
              color="emerald"
              valueColor="text-emerald-700"
              progress={settlement.totalAssessed > 0 ? Math.round((settlement.totalCollected / settlement.totalAssessed) * 100) : 0}
            />
            <StatCard
              title="Expenses Paid Out"
              value={formatCurrency(settlement.expensesTotal, tenant?.currency)}
              subtitle="Project operational costs"
              icon={Receipt}
              color="rose"
              valueColor="text-rose-700"
            />
            <StatCard
              title="Net Project Balance"
              value={formatCurrency(settlement.netMargin, tenant?.currency)}
              subtitle="Remaining project reserve"
              icon={Wallet}
              color="blue"
              valueColor="text-blue-900"
            />
          </div>

          {/* Sub-Events List (e.g. Uniform Men, Uniform Women, Hall) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Fee Categories & Target Groups
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {settlement.event.subEvents.map((se: any) => (
                <div
                  key={se.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">{se.title}</span>
                    <span className="block text-[10px] text-slate-400">
                      Target: {se.targetAudience.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {formatCurrency(se.defaultAmount, tenant?.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Member Settlement Roster Table */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Member Dues Roster ({filteredMembers.length} members)
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {(['ALL', 'SETTLED', 'PENDING', 'SURPLUS'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMemberFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      memberFilter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'ALL'
                      ? 'All'
                      : f === 'SETTLED'
                      ? 'Fully Settled'
                      : f === 'PENDING'
                      ? 'Deficit / Pending'
                      : 'Surplus (+)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-3 py-3">Code / Gender</th>
                    <th className="px-3 py-3">Assigned Sub-Events</th>
                    <th className="px-3 py-3 text-right">Target Due</th>
                    <th className="px-3 py-3 text-right">Paid</th>
                    <th className="px-3 py-3 text-center">Surplus (+)</th>
                    <th className="px-3 py-3 text-right">Remaining</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m: any) => (
                    <tr key={m.member.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {m.member.fullName}
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {m.member.membershipCode || 'Member'} • {m.member.gender}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {m.assessments.map((a: any) => (
                            <div
                              key={a.assessmentId}
                              className="flex items-center justify-between text-[11px] text-slate-600 gap-2"
                            >
                              <span className="truncate max-w-[14rem]">{a.subEventTitle}</span>
                              <span className="font-mono text-slate-800">
                                {a.paid.toLocaleString()} / {a.assigned.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-black font-mono text-slate-800">
                        {formatCurrency(m.totalAssigned, tenant?.currency)}
                      </td>
                      <td className="px-3 py-3 text-right font-black font-mono text-emerald-700">
                        {formatCurrency(m.totalPaid, tenant?.currency)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.totalSurplus > 0 ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 text-[10px] font-mono">
                            +{m.totalSurplus.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-bold font-mono">
                        {m.totalRemaining > 0 ? (
                          <span className="text-rose-600">
                            {formatCurrency(m.totalRemaining, tenant?.currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Settled</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {user?.role !== 'VIEWER' && m.assessments.length > 0 && (
                          <button
                            onClick={() => {
                              const ass = m.assessments[0];
                              setEditingAssessment({
                                id: ass.assessmentId,
                                memberName: m.member.fullName,
                                subEventTitle: ass.subEventTitle,
                                currentAmount: ass.assigned,
                              });
                              setNewCutAmount(ass.assigned);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Adjust tailored cut amount"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Cut Modal */}
      {editingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Custom Member Assessment</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tailor assigned cut for <strong>{editingAssessment.memberName}</strong> ({editingAssessment.subEventTitle}):
            </p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Assigned Amount ({tenant?.currency})</label>
              <input
                type="number"
                value={newCutAmount}
                onChange={(e) => setNewCutAmount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-bold"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingAssessment(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomCut}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Save Cut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Event / Special Project</h3>
                <p className="text-xs text-slate-500">Define project goals, timeline, and member assessments</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project / Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Community Assembly & Gala"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location / Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Community Center, Kigali"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sub-events & Assessment Fees */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Project Fee Items & Assessments
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewSubEvents([
                        ...newSubEvents,
                        { title: '', targetAudience: TargetAudience.ALL, defaultAmount: 5000 },
                      ])
                    }
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {newSubEvents.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Item name (e.g. Venue fee)"
                        value={sub.title}
                        onChange={(e) => {
                          const updated = [...newSubEvents];
                          updated[idx].title = e.target.value;
                          setNewSubEvents(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      />
                      <select
                        value={sub.targetAudience}
                        onChange={(e) => {
                          const updated = [...newSubEvents];
                          updated[idx].targetAudience = e.target.value as TargetAudience;
                          setNewSubEvents(updated);
                        }}
                        className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value={TargetAudience.ALL}>All Members</option>
                        <option value={TargetAudience.MEN_ONLY}>Men Only</option>
                        <option value={TargetAudience.WOMEN_ONLY}>Women Only</option>
                      </select>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Amount"
                        value={sub.defaultAmount || ''}
                        onChange={(e) => {
                          const updated = [...newSubEvents];
                          updated[idx].defaultAmount = Number(e.target.value);
                          setNewSubEvents(updated);
                        }}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono"
                      />
                      {newSubEvents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewSubEvents(newSubEvents.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                >
                  Create Project & Assessments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedEventId && (
        <WhatsAppModal
          isOpen={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
          reportType="EVENT"
          targetId={selectedEventId}
        />
      )}
    </div>
  );
};
