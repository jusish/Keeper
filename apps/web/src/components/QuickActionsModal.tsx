import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  CreditCard,
  Receipt,
  UserCheck,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Split,
  Calendar,
} from 'lucide-react';
import {
  Gender,
  PaymentMethod,
  ExpenseCategory,
  AccountType,
  SessionType,
} from '@keeper/shared';
import { SearchableSelect } from './common/SearchableSelect';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
  onSuccess?: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'payment',
  onSuccess,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common data for select dropdowns
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Payment form state
  const [payMemberId, setPayMemberId] = useState('');
  const [payTargetType, setPayTargetType] = useState<'UMUSANZU_SINGLE' | 'UMUSANZU_YEAR_ADVANCE' | 'EVENT_SUBEVENT'>('UMUSANZU_SINGLE');
  const [payPeriodId, setPayPeriodId] = useState('');
  const [payPlanId, setPayPlanId] = useState('');
  const [paySubEventId, setPaySubEventId] = useState('');
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.MOBILE_MONEY);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Expense form state
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [expVendor, setExpVendor] = useState('');
  const [expIsPlanned, setExpIsPlanned] = useState(false);
  const [expEventId, setExpEventId] = useState('');
  const [expIsSplit, setExpIsSplit] = useState(false);
  const [expSingleAccountId, setExpSingleAccountId] = useState('');
  const [expSplits, setExpSplits] = useState<{ accountId: string; amount: number }[]>([
    { accountId: '', amount: 0 },
    { accountId: '', amount: 0 },
  ]);

  // Member form state
  const [memName, setMemName] = useState('');
  const [memPhone, setMemPhone] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memGender, setMemGender] = useState<Gender>(Gender.FEMALE);
  const [memCode, setMemCode] = useState('');
  const [memJoinedDate, setMemJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [memProrate, setMemProrate] = useState(true);

  // Attendance form state
  const [attMode, setAttMode] = useState<'existing' | 'new'>('existing');
  const [attSessionId, setAttSessionId] = useState('');
  const [attTitle, setAttTitle] = useState('General Assembly & Practice');
  const [attType, setAttType] = useState<SessionType>(SessionType.REGULAR_MEETING);
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStartTime, setAttStartTime] = useState('18:00');
  const [attEndTime, setAttEndTime] = useState('20:00');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setErrorMessage(null);
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      const [memRes, accRes, planRes, evtRes, sessRes] = await Promise.all([
        api.get('/members'),
        api.get('/accounts'),
        api.get('/contributions/plans'),
        api.get('/events'),
        api.get('/attendance/sessions'),
      ]);
      setMembers(memRes.data);
      setAccounts(accRes.data);
      setPlans(planRes.data);
      setEvents(evtRes.data);
      setSessions(sessRes.data);

      if (sessRes.data.length > 0) {
        setAttSessionId(sessRes.data[0].id);
      }

      // Auto-set defaults
      if (accRes.data.length > 0) {
        const def = accRes.data.find((a: any) => a.isDefault) || accRes.data[0];
        setPayAccountId(def.id);
        setExpSingleAccountId(def.id);
      }
      if (planRes.data.length > 0) {
        const defaultPlan = planRes.data[0];
        setPayPlanId(defaultPlan.id);
        if (defaultPlan.periods?.length > 0) {
          setPayPeriodId(defaultPlan.periods[0].id);
        }
        if (!payAmount) {
          setPayAmount(defaultPlan.defaultAmount);
        }
        if (defaultPlan.targetAccountId) {
          setPayAccountId(defaultPlan.targetAccountId);
        }
      }
    } catch (err) {
      console.error('Failed to load dropdown options', err);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setPayPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      if (plan.periods?.length > 0) {
        setPayPeriodId(plan.periods[0].id);
      }
      if (payTargetType === 'UMUSANZU_YEAR_ADVANCE') {
        setPayAmount(plan.defaultAmount * (plan.periods?.length || 12));
      } else {
        setPayAmount(plan.defaultAmount);
      }
      if (plan.targetAccountId) {
        setPayAccountId(plan.targetAccountId);
      }
    }
  };

  // Auto-set destination account when selecting an event sub-event
  const handleSubEventSelect = (subEventId: string) => {
    setPaySubEventId(subEventId);
    for (const ev of events) {
      const se = ev.subEvents?.find((s: any) => s.id === subEventId);
      if (se) {
        if (se.defaultAmount) setPayAmount(se.defaultAmount);
        if (se.targetAccountId) setPayAccountId(se.targetAccountId);
        break;
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payMemberId || !payAccountId || !payAmount) {
      setErrorMessage('Please fill in Member, Account, and Amount');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/contributions/payments', {
        memberId: payMemberId,
        accountId: payAccountId,
        amount: Number(payAmount),
        method: payMethod,
        referenceNumber: payRef || undefined,
        notes: payNotes || undefined,
        targetType: payTargetType,
        periodId: payTargetType === 'UMUSANZU_SINGLE' ? payPeriodId : undefined,
        planId: payTargetType === 'UMUSANZU_YEAR_ADVANCE' ? payPlanId : undefined,
        subEventId: payTargetType === 'EVENT_SUBEVENT' ? paySubEventId : undefined,
      });

      setSuccessMessage('Payment successfully logged and credited to account!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expAmount) {
      setErrorMessage('Please fill in Title and Amount');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let splitsPayload: { accountId: string; amount: number }[] = [];
    if (!expIsSplit) {
      if (!expSingleAccountId) {
        setErrorMessage('Select an account');
        setIsLoading(false);
        return;
      }
      splitsPayload = [{ accountId: expSingleAccountId, amount: Number(expAmount) }];
    } else {
      splitsPayload = expSplits.filter((s) => s.accountId && s.amount > 0);
      const totalSplit = splitsPayload.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - Number(expAmount)) > 0.01) {
        setErrorMessage(`Splits sum (${totalSplit}) does not match expense amount (${expAmount})`);
        setIsLoading(false);
        return;
      }
    }

    try {
      await api.post('/expenses', {
        title: expTitle,
        amount: Number(expAmount),
        category: expCategory,
        vendorName: expVendor || undefined,
        eventId: expEventId || undefined,
        isPlanned: expIsPlanned,
        splits: splitsPayload,
      });

      setSuccessMessage('Expense recorded and debited from selected account(s)!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName) {
      setErrorMessage('Member name is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/members', {
        fullName: memName,
        phone: memPhone || undefined,
        email: memEmail || undefined,
        gender: memGender,
        membershipCode: memCode || undefined,
        joinedDate: memJoinedDate ? new Date(memJoinedDate).toISOString() : undefined,
        startFromJoinDate: memProrate,
      });

      setSuccessMessage('Member registered into the community roster!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAttendanceSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attTitle) {
      setErrorMessage('Session title is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/attendance/sessions', {
        title: attTitle,
        sessionType: attType,
        sessionDate: attDate,
        startTime: attStartTime || undefined,
        endTime: attEndTime || undefined,
      });

      setSuccessMessage('Attendance session created and roll-call roster prepared!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create attendance session');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Entry Action</h2>
            <p className="text-xs text-slate-500">Record a financial or roster action in seconds</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'payment'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'expense'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Record Expense
          </button>
          <button
            onClick={() => setActiveTab('member')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'member'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'attendance'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Attendance
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: RECORD PAYMENT */}
          {activeTab === 'payment' && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              {/* Member select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Member *</label>
                <SearchableSelect
                  options={members.map((m) => ({
                    value: m.id,
                    label: m.fullName,
                    sublabel: m.membershipCode,
                    badge: m.phone || undefined,
                  }))}
                  value={payMemberId}
                  onChange={setPayMemberId}
                  placeholder="Search or select member..."
                  searchPlaceholder="Type member name, code or phone..."
                />
              </div>

              {/* Target Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Payment Towards *</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayTargetType('UMUSANZU_SINGLE');
                      const plan = plans.find((p) => p.id === payPlanId) || plans[0];
                      if (plan) setPayAmount(plan.defaultAmount);
                    }}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                      payTargetType === 'UMUSANZU_SINGLE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Single Period (Dues)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayTargetType('UMUSANZU_YEAR_ADVANCE');
                      const plan = plans.find((p) => p.id === payPlanId) || plans[0];
                      if (plan) setPayAmount(plan.defaultAmount * (plan.periods?.length || 12));
                    }}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                      payTargetType === 'UMUSANZU_YEAR_ADVANCE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pay All Periods
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayTargetType('EVENT_SUBEVENT')}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                      payTargetType === 'EVENT_SUBEVENT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Event / Project
                  </button>
                </div>
              </div>

              {/* Select Contribution Program if paying Umusanzu */}
              {(payTargetType === 'UMUSANZU_SINGLE' || payTargetType === 'UMUSANZU_YEAR_ADVANCE') && plans.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Contribution Program *</label>
                  <select
                    value={payPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.cycle} • {p.defaultAmount.toLocaleString()} {tenant?.currency})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specific Period for UMUSANZU_SINGLE */}
              {payTargetType === 'UMUSANZU_SINGLE' && plans.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Starting Period</label>
                  <select
                    value={payPeriodId}
                    onChange={(e) => setPayPeriodId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {(plans.find((p) => p.id === payPlanId) || plans[0])?.periods?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Any extra amount paid automatically cascades to subsequent periods (no surpluses).
                  </p>
                </div>
              )}

              {payTargetType === 'EVENT_SUBEVENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Select Event Project / Uniform Fee</label>
                  <select
                    value={paySubEventId}
                    onChange={(e) => handleSubEventSelect(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Event Fee Item --</option>
                    {events.map((ev) =>
                      ev.subEvents?.map((se: any) => (
                        <option key={se.id} value={se.id}>
                          {ev.title} → {se.title} ({se.defaultAmount?.toLocaleString()} {tenant?.currency})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Amount & Destination Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Amount ({tenant?.currency}) *</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 5000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Destination Account *</label>
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none font-medium"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.balance?.toLocaleString()} {tenant?.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Channel</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value={PaymentMethod.MOBILE_MONEY}>Mobile Money (MoMo)</option>
                    <option value={PaymentMethod.CASH}>Cash (In-person)</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Tx Reference / Slip #</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs placeholder:text-slate-400"
                    placeholder="e.g. MM-992104"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
              >
                {isLoading ? 'Recording...' : 'Save & Confirm Payment'}
              </button>
            </form>
          )}

          {/* TAB 2: RECORD EXPENSE */}
          {activeTab === 'expense' && (
            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Expense Title *</label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Vocal Coach Retainer, Uniform Fabric, Hall Deposit"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Total Amount ({tenant?.currency}) *</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                    placeholder="e.g. 150000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value={ExpenseCategory.FACILITATOR_TRAINER}>Facilitator / Trainer</option>
                    <option value={ExpenseCategory.MATERIALS_SUPPLIES}>Materials & Supplies</option>
                    <option value={ExpenseCategory.SOUND_EQUIPMENT}>Sound & Instruments</option>
                    <option value={ExpenseCategory.VENUE_LOGISTICS}>Hall & Production</option>
                    <option value={ExpenseCategory.TRANSPORT}>Transport & Logistics</option>
                    <option value={ExpenseCategory.REFRESHMENTS}>Refreshments / Catering</option>
                    <option value={ExpenseCategory.WELFARE_BENEVOLENCE}>Member Welfare / Solidarity</option>
                    <option value={ExpenseCategory.OTHER}>Other Operational</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vendor / Payee Name</label>
                  <input
                    type="text"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    placeholder="e.g. Coach Jean-Claude, Utexrwa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Planned Expense?</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPlanned"
                      checked={expIsPlanned}
                      onChange={(e) => setExpIsPlanned(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <label htmlFor="isPlanned" className="text-xs text-slate-700 cursor-pointer">
                      Pre-budgeted / Planned
                    </label>
                  </div>
                </div>
              </div>

              {/* Account Source: Single vs Split */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Account Funding Source</span>
                  <button
                    type="button"
                    onClick={() => setExpIsSplit(!expIsSplit)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    <Split className="h-3.5 w-3.5" />
                    {expIsSplit ? 'Use Single Account' : 'Split Across Accounts'}
                  </button>
                </div>

                {!expIsSplit ? (
                  <div>
                    <select
                      value={expSingleAccountId}
                      onChange={(e) => setExpSingleAccountId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Balance: {a.balance?.toLocaleString()} {tenant?.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-500">
                      Allocate portion from each account:
                    </p>
                    {expSplits.map((split, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={split.accountId}
                          onChange={(e) => {
                            const newSplits = [...expSplits];
                            newSplits[idx].accountId = e.target.value;
                            setExpSplits(newSplits);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Choose Account --</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={split.amount || ''}
                          onChange={(e) => {
                            const newSplits = [...expSplits];
                            newSplits[idx].amount = Number(e.target.value);
                            setExpSplits(newSplits);
                          }}
                          className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
              >
                {isLoading ? 'Recording...' : 'Deduct & Save Expense'}
              </button>
            </form>
          )}

          {/* TAB 3: ADD MEMBER */}
          {activeTab === 'member' && (
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  placeholder="e.g. Patrick Mugisha"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Gender</label>
                  <select
                    value={memGender}
                    onChange={(e) => setMemGender(e.target.value as Gender)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value={Gender.FEMALE}>Female</option>
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">Membership Code</label>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Auto-generated if empty
                    </span>
                  </div>
                  <input
                    type="text"
                    value={memCode}
                    onChange={(e) => setMemCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono placeholder:text-slate-400"
                    placeholder="Auto-generated (e.g. KCA-001)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={memPhone}
                    onChange={(e) => setMemPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                    placeholder="+250 788..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={memEmail}
                    onChange={(e) => setMemEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    placeholder="member@example.com"
                  />
                </div>
              </div>

              {/* Joined Date & Proration */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Official Joining Date *</label>
                  <input
                    type="date"
                    value={memJoinedDate}
                    onChange={(e) => setMemJoinedDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    required
                  />
                </div>
                <label className="flex items-start gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memProrate}
                    onChange={(e) => setMemProrate(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    <strong>Prorate dues from joining date:</strong> Member will only be assessed starting from the month/period they join. Previous periods will be marked exempt (N/A) with 0 arrears.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Register Member'}
              </button>
            </form>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAttMode('existing')}
                  className={`flex-1 py-1.5 rounded-md transition ${
                    attMode === 'existing'
                      ? 'bg-white shadow-xs text-emerald-800 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Existing Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setAttMode('new')}
                  className={`flex-1 py-1.5 rounded-md transition ${
                    attMode === 'new'
                      ? 'bg-white shadow-xs text-emerald-800 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Schedule New Session
                </button>
              </div>

              {attMode === 'existing' ? (
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                      <p className="text-xs text-slate-500">No scheduled sessions found.</p>
                      <button
                        type="button"
                        onClick={() => setAttMode('new')}
                        className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                      >
                        + Create a session now
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Session to Take Roll-Call *
                      </label>
                      <select
                        value={attSessionId}
                        onChange={(e) => setAttSessionId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                      >
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} — {new Date(s.sessionDate).toLocaleDateString()} {s.startTime ? `(${s.startTime})` : ''} [{s.status}]
                          </option>
                        ))}
                      </select>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800">Quick Navigation</p>
                        <p className="text-[11px]">
                          Click below to open the attendance register directly in the Attendance portal with roll call checklists and PDF export.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.location.hash = '#/attendance';
                        }}
                        className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition flex items-center justify-center gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Go to Attendance Register</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateAttendanceSession} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Session Title *</label>
                    <input
                      type="text"
                      value={attTitle}
                      onChange={(e) => setAttTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      placeholder="e.g. Wednesday Choir Practice"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Session Type</label>
                      <select
                        value={attType}
                        onChange={(e) => setAttType(e.target.value as SessionType)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value={SessionType.REGULAR_MEETING}>Regular Meeting / Gathering</option>
                        <option value={SessionType.COMMITTEE_MEETING}>Committee Meeting</option>
                        <option value={SessionType.WORKSHOP_TRAINING}>Workshop / Training</option>
                        <option value={SessionType.COMMUNITY_WORK}>Community Work / Activity</option>
                        <option value={SessionType.SPECIAL_EVENT}>Special Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Session Date *</label>
                      <input
                        type="date"
                        value={attDate}
                        onChange={(e) => setAttDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                      <input
                        type="time"
                        value={attStartTime}
                        onChange={(e) => setAttStartTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">End Time</label>
                      <input
                        type="time"
                        value={attEndTime}
                        onChange={(e) => setAttEndTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Session & Prepare Roster'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
