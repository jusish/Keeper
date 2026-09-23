import {
  Role,
  Gender,
  MemberStatus,
  AccountType,
  PlanCycle,
  AssessmentStatus,
  EventStatus,
  TargetAudience,
  PaymentMethod,
  ExpenseCategory,
  SessionType,
  SessionStatus,
  AttendanceStatus,
  DebtStatus,
} from './enums.js';

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  currency: string;
  logoUrl?: string | null;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  tenantId?: string | null;
  tenantName?: string | null;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
  tenant?: TenantDTO | null;
}

export interface MemberDTO {
  id: string;
  tenantId: string;
  membershipCode?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender: Gender;
  status: MemberStatus;
  joinedDate?: string | null;
  notes?: string | null;
  creditBalance: number;
  createdAt: string;
}

export interface AccountDTO {
  id: string;
  tenantId: string;
  name: string;
  type: AccountType;
  accountNumber?: string | null;
  balance: number;
  isDefault: boolean;
  description?: string | null;
  createdAt: string;
}

export interface ContributionPeriodDTO {
  id: string;
  planId: string;
  label: string;
  orderIndex: number;
  dueDate: string;
  isClosed: boolean;
}

export interface ContributionPlanDTO {
  id: string;
  tenantId: string;
  title: string;
  cycle: PlanCycle;
  defaultAmount: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  targetAccountId?: string | null;
  periods?: ContributionPeriodDTO[];
}

export interface ContributionMatrixCell {
  assessmentId: string;
  periodId: string;
  expectedAmount: number;
  paidAmount: number;
  surplusAmount: number;
  remainingAmount: number;
  status: AssessmentStatus;
}

export interface ContributionMatrixRow {
  member: MemberDTO;
  cells: Record<string, ContributionMatrixCell>;
  totalPaid: number;
  totalExpected: number;
  totalSurplus: number;
  totalRemaining: number;
  overallStatus: AssessmentStatus;
}

export interface ContributionMatrixResponse {
  plan: ContributionPlanDTO;
  periods: ContributionPeriodDTO[];
  rows: ContributionMatrixRow[];
  totalsByPeriod: Record<
    string,
    {
      expected: number;
      collected: number;
      surplus: number;
      remaining: number;
      collectionRate: number;
    }
  >;
  grandTotalExpected: number;
  grandTotalCollected: number;
  grandTotalSurplus: number;
  grandTotalRemaining: number;
  overallCollectionRate: number;
}

export interface SubEventDTO {
  id: string;
  eventId: string;
  title: string;
  targetAudience: TargetAudience;
  defaultAmount: number;
  targetAccountId?: string | null;
  targetAccount?: AccountDTO;
}

export interface EventDTO {
  id: string;
  tenantId: string;
  title: string;
  eventDate: string;
  location?: string | null;
  status: EventStatus;
  description?: string | null;
  subEvents?: SubEventDTO[];
  createdAt: string;
}

export interface MemberEventAssessmentDTO {
  id: string;
  subEventId: string;
  subEventTitle: string;
  memberId: string;
  member: MemberDTO;
  assignedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  surplusAmount: number;
  status: AssessmentStatus;
}

export interface EventSettlementResponse {
  event: EventDTO;
  totalAssessed: number;
  totalCollected: number;
  totalOutstanding: number;
  totalSurplus: number;
  expensesTotal: number;
  netMargin: number;
  members: {
    member: MemberDTO;
    assessments: {
      subEventTitle: string;
      assigned: number;
      paid: number;
      remaining: number;
      surplus: number;
      status: AssessmentStatus;
    }[];
    totalAssigned: number;
    totalPaid: number;
    totalRemaining: number;
    totalSurplus: number;
    isFullyPaid: boolean;
  }[];
}

export interface ExpenseAccountSplitDTO {
  id: string;
  accountId: string;
  accountName?: string;
  amount: number;
}

export interface ExpenseDTO {
  id: string;
  tenantId: string;
  eventId?: string | null;
  eventTitle?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  category: ExpenseCategory;
  vendorName?: string | null;
  receiptUrl?: string | null;
  isPlanned: boolean;
  recordedByUserId: string;
  recordedByUserName?: string;
  splits: ExpenseAccountSplitDTO[];
  createdAt: string;
}

export interface AttendanceRecordDTO {
  id: string;
  sessionId: string;
  memberId: string;
  memberFullName?: string;
  memberVoicePart?: string | null;
  status: AttendanceStatus;
  reasonNote?: string | null;
  checkInTime?: string | null;
}

export interface AttendanceSessionDTO {
  id: string;
  tenantId: string;
  title: string;
  sessionType: SessionType;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  status: SessionStatus;
  cancellationReason?: string | null;
  notes?: string | null;
  recordedByUserId: string;
  recordCount?: {
    present: number;
    excused: number;
    unexcused: number;
    late: number;
    total: number;
  };
  records?: AttendanceRecordDTO[];
}

export interface DashboardMetricsDTO {
  totalMembers: number;
  activeMembers: number;
  totalCashOnHand: number;
  accounts: AccountDTO[];
  currentMonthUmusanzuRate: number;
  recentPayments: {
    id: string;
    memberName: string;
    amount: number;
    date: string;
    accountName: string;
    targetDescription: string;
  }[];
  recentExpenses: {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: ExpenseCategory;
  }[];
  upcomingSessions: AttendanceSessionDTO[];
}

// -------------------------------------------------------------
// AUDIT LOG & SUPER ADMIN DTOS
// -------------------------------------------------------------

export interface AuditLogDTO {
  id: string;
  tenantId?: string | null;
  tenantName?: string | null;
  userId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  details?: any;
  timestamp: string;
}

export interface SuperAdminTenantDTO {
  id: string;
  name: string;
  slug: string;
  currency: string;
  userCount: number;
  memberCount: number;
  totalBalance: number;
  createdAt: string;
}

export interface PlatformMetricsDTO {
  totalCommunities: number;
  totalPlatformUsers: number;
  totalMembers: number;
  totalPooledCapital: number;
  recentAuditLogs: AuditLogDTO[];
  communities: SuperAdminTenantDTO[];
}

// -------------------------------------------------------------
// DEBTS & LIABILITIES DTOS
// -------------------------------------------------------------

export interface DebtRepaymentDTO {
  id: string;
  tenantId: string;
  debtId: string;
  amount: number;
  repaymentDate: string;
  sourceAccountId: string;
  sourceAccountName?: string;
  method: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  recordedByUserId?: string | null;
  createdAt: string;
}

export interface DebtDTO {
  id: string;
  tenantId: string;
  lenderName: string;
  lenderContact?: string | null;
  title: string;
  description?: string | null;
  principalAmount: number;
  remainingAmount: number;
  totalRepaid: number;
  repaymentRate: number;
  borrowDate: string;
  dueDate?: string | null;
  status: DebtStatus;
  depositAccountId?: string | null;
  depositAccountName?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  recordedByUserId?: string | null;
  repayments?: DebtRepaymentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface DebtSummaryDTO {
  totalBorrowed: number;
  totalRepaid: number;
  totalOutstanding: number;
  activeCount: number;
  settledCount: number;
  debts: DebtDTO[];
}

