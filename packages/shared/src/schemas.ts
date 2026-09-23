import { z } from 'zod';
import {
  Role,
  Gender,
  MemberStatus,
  AccountType,
  PlanCycle,
  EventStatus,
  TargetAudience,
  PaymentMethod,
  ExpenseCategory,
  SessionType,
  SessionStatus,
  AttendanceStatus,
} from './enums.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  communityName: z.string().min(2, 'Community name must be at least 2 characters'),
  currency: z.string().default('RWF'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const memberSchema = z.object({
  membershipCode: z.string().optional(),
  fullName: z.string().min(2, 'Member name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gender: z.nativeEnum(Gender).default(Gender.OTHER),
  status: z.nativeEnum(MemberStatus).default(MemberStatus.ACTIVE),
  joinedDate: z.string().optional(),
  notes: z.string().optional(),
});

export const accountSchema = z.object({
  name: z.string().min(2, 'Account name is required'),
  type: z.nativeEnum(AccountType).default(AccountType.GENERAL_DUES),
  accountNumber: z.string().optional(),
  balance: z.number().min(0, 'Initial balance must be non-negative').default(0),
  isDefault: z.boolean().default(false),
  description: z.string().optional(),
});

export const contributionPlanSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  cycle: z.nativeEnum(PlanCycle).default(PlanCycle.MONTHLY),
  defaultAmount: z.number().positive('Default contribution amount must be greater than 0'),
  year: z.number().int().min(2020).max(2050),
  targetAccountId: z.string().uuid().optional(),
});

export const recordPaymentSchema = z.object({
  memberId: z.string().uuid('Select a valid member'),
  accountId: z.string().uuid('Select a valid destination account'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().optional(),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.MOBILE_MONEY),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  // Allocation target:
  targetType: z.enum(['UMUSANZU_SINGLE', 'UMUSANZU_YEAR_ADVANCE', 'EVENT_SUBEVENT']),
  periodId: z.string().uuid().optional(), // For single Umusanzu period
  planId: z.string().uuid().optional(), // For year-in-advance
  subEventId: z.string().uuid().optional(), // For event sub-event
});

export const recordExpenseSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Expense amount must be greater than 0'),
  expenseDate: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  vendorName: z.string().optional(),
  receiptUrl: z.string().optional(),
  eventId: z.string().uuid().optional(),
  isPlanned: z.boolean().default(false),
  splits: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        amount: z.number().positive(),
      })
    )
    .min(1, 'At least one account must be debited'),
});

export const createEventSchema = z.object({
  title: z.string().min(2, 'Event title is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  location: z.string().optional(),
  description: z.string().optional(),
  subEvents: z.array(
    z.object({
      title: z.string().min(1, 'Sub-event title is required'),
      targetAudience: z.nativeEnum(TargetAudience).default(TargetAudience.ALL),
      defaultAmount: z.number().nonnegative(),
      targetAccountId: z.string().uuid().optional(),
    })
  ).min(1, 'At least one fee or sub-event item is required'),
});

export const updateAssessmentSchema = z.object({
  assignedAmount: z.number().nonnegative(),
});

export const createSessionSchema = z.object({
  title: z.string().min(2, 'Session title is required'),
  sessionType: z.nativeEnum(SessionType).default(SessionType.REGULAR_MEETING),
  sessionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelSessionSchema = z.object({
  cancellationReason: z.string().min(3, 'A cancellation reason is required'),
});

export const markAttendanceSchema = z.object({
  records: z.array(
    z.object({
      memberId: z.string().uuid(),
      status: z.nativeEnum(AttendanceStatus),
      reasonNote: z.string().optional(),
    })
  ),
});

export const createDebtSchema = z.object({
  lenderName: z.string().min(2, 'Lender name is required'),
  lenderContact: z.string().optional(),
  title: z.string().min(2, 'Title or purpose is required'),
  description: z.string().optional(),
  principalAmount: z.number().positive('Amount borrowed must be greater than 0'),
  borrowDate: z.string().min(1, 'Borrow date is required'),
  dueDate: z.string().optional(),
  depositAccountId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
});

export const recordDebtRepaymentSchema = z.object({
  amount: z.number().positive('Repayment amount must be greater than 0'),
  repaymentDate: z.string().min(1, 'Repayment date is required'),
  sourceAccountId: z.string().uuid('Source account is required'),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type ContributionPlanInput = z.infer<typeof contributionPlanSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type RecordDebtRepaymentInput = z.infer<typeof recordDebtRepaymentSchema>;

