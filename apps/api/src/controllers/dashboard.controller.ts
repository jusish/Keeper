import { Response, NextFunction } from 'express';
import { prisma, AttendanceStatus, SessionStatus } from '@keeper/database';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getDashboardMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    // 1. Members
    const totalMembers = await prisma.member.count({ where: { tenantId } });
    const activeMembers = await prisma.member.count({ where: { tenantId, status: 'ACTIVE' } });

    // 2. Accounts & Cash on Hand
    const accounts = await prisma.account.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const totalCashOnHand = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    // 3. Current Month Umusanzu Rate
    const currentYear = new Date().getFullYear();
    const activePlan = await prisma.contributionPlan.findFirst({
      where: { tenantId, isActive: true },
      include: {
        periods: {
          orderBy: { orderIndex: 'asc' },
          include: { assessments: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    let currentMonthUmusanzuRate = 0;
    if (activePlan && activePlan.periods.length > 0) {
      // Pick current month period or first period
      const currentMonthIndex = new Date().getMonth();
      const currentPeriod =
        activePlan.periods[currentMonthIndex] || activePlan.periods[0];

      if (currentPeriod && currentPeriod.assessments.length > 0) {
        const totalExp = currentPeriod.assessments.reduce(
          (sum, a) => sum + Number(a.expectedAmount),
          0
        );
        const totalPaid = currentPeriod.assessments.reduce(
          (sum, a) => sum + Number(a.paidAmount),
          0
        );
        currentMonthUmusanzuRate = totalExp > 0 ? Math.round((totalPaid / totalExp) * 100) : 0;
      }
    }

    // 4. Recent Payments
    const recentPaymentsRaw = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        member: true,
        account: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 8,
    });

    const recentPayments = recentPaymentsRaw.map((p) => ({
      id: p.id,
      memberName: p.member.fullName,
      amount: Number(p.amount),
      date: p.paymentDate.toISOString(),
      accountName: p.account.name,
      targetDescription: p.notes || `Paid via ${p.method}`,
    }));

    // 5. Recent Expenses
    const recentExpensesRaw = await prisma.expense.findMany({
      where: { tenantId },
      orderBy: { expenseDate: 'desc' },
      take: 6,
    });

    const recentExpenses = recentExpensesRaw.map((e) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      date: e.expenseDate.toISOString(),
      category: e.category,
    }));

    // 6. Upcoming Sessions
    const upcomingSessionsRaw = await prisma.attendanceSession.findMany({
      where: {
        tenantId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.COMPLETED, SessionStatus.CANCELLED] },
      },
      include: { records: true },
      orderBy: { sessionDate: 'desc' },
      take: 5,
    });

    const upcomingSessions = upcomingSessionsRaw.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      title: s.title,
      sessionType: s.sessionType,
      sessionDate: s.sessionDate.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      isRecurring: s.isRecurring,
      recurrenceRule: s.recurrenceRule,
      status: s.status,
      cancellationReason: s.cancellationReason,
      notes: s.notes,
      recordedByUserId: s.recordedByUserId,
      recordCount: {
        present: s.records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
        excused: s.records.filter((r) => r.status === AttendanceStatus.ABSENT_EXCUSED).length,
        unexcused: s.records.filter((r) => r.status === AttendanceStatus.ABSENT_UNEXCUSED).length,
        late: s.records.filter((r) => r.status === AttendanceStatus.LATE).length,
        total: s.records.length,
      },
    }));

    res.json({
      totalMembers,
      activeMembers,
      totalCashOnHand,
      accounts: accounts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        name: a.name,
        type: a.type,
        accountNumber: a.accountNumber,
        balance: Number(a.balance),
        isDefault: a.isDefault,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
      currentMonthUmusanzuRate,
      recentPayments,
      recentExpenses,
      upcomingSessions,
    });
  } catch (error) {
    next(error);
  }
};
