import { Response, NextFunction } from 'express';
import { prisma, DebtStatus } from '@keeper/database';
import { createDebtSchema, recordDebtRepaymentSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';

export const getDebts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { status, search } = req.query;

    const where: any = { tenantId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as DebtStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { lenderName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const debtsRaw = await prisma.debt.findMany({
      where,
      include: {
        depositAccount: true,
        event: true,
        repayments: {
          include: { sourceAccount: true },
          orderBy: { repaymentDate: 'desc' },
        },
      },
      orderBy: [{ status: 'asc' }, { borrowDate: 'desc' }],
    });

    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;
    let activeCount = 0;
    let settledCount = 0;

    const debts = debtsRaw.map((d) => {
      const principal = Number(d.principalAmount);
      const remaining = Number(d.remainingAmount);
      const repaid = Math.max(0, principal - remaining);
      const repaymentRate = principal > 0 ? Math.round((repaid / principal) * 100) : 100;

      totalBorrowed += principal;
      totalRepaid += repaid;
      totalOutstanding += remaining;

      if (d.status === DebtStatus.FULLY_PAID) {
        settledCount++;
      } else {
        activeCount++;
      }

      return {
        id: d.id,
        tenantId: d.tenantId,
        lenderName: d.lenderName,
        lenderContact: d.lenderContact,
        title: d.title,
        description: d.description,
        principalAmount: principal,
        remainingAmount: remaining,
        totalRepaid: repaid,
        repaymentRate,
        borrowDate: d.borrowDate.toISOString(),
        dueDate: d.dueDate?.toISOString() || null,
        status: d.status,
        depositAccountId: d.depositAccountId,
        depositAccountName: d.depositAccount?.name || null,
        eventId: d.eventId,
        eventTitle: d.event?.title || null,
        recordedByUserId: d.recordedByUserId,
        repayments: d.repayments.map((r) => ({
          id: r.id,
          tenantId: r.tenantId,
          debtId: r.debtId,
          amount: Number(r.amount),
          repaymentDate: r.repaymentDate.toISOString(),
          sourceAccountId: r.sourceAccountId,
          sourceAccountName: r.sourceAccount.name,
          method: r.method,
          referenceNumber: r.referenceNumber,
          notes: r.notes,
          recordedByUserId: r.recordedByUserId,
          createdAt: r.createdAt.toISOString(),
        })),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    res.json({
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      activeCount,
      settledCount,
      debts,
    });
  } catch (error) {
    next(error);
  }
};

export const getDebtById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    const d = await prisma.debt.findFirst({
      where: { id, tenantId },
      include: {
        depositAccount: true,
        event: true,
        repayments: {
          include: { sourceAccount: true },
          orderBy: { repaymentDate: 'desc' },
        },
      },
    });

    if (!d) {
      res.status(404).json({ message: 'Debt record not found' });
      return;
    }

    const principal = Number(d.principalAmount);
    const remaining = Number(d.remainingAmount);
    const repaid = Math.max(0, principal - remaining);
    const repaymentRate = principal > 0 ? Math.round((repaid / principal) * 100) : 100;

    res.json({
      id: d.id,
      tenantId: d.tenantId,
      lenderName: d.lenderName,
      lenderContact: d.lenderContact,
      title: d.title,
      description: d.description,
      principalAmount: principal,
      remainingAmount: remaining,
      totalRepaid: repaid,
      repaymentRate,
      borrowDate: d.borrowDate.toISOString(),
      dueDate: d.dueDate?.toISOString() || null,
      status: d.status,
      depositAccountId: d.depositAccountId,
      depositAccountName: d.depositAccount?.name || null,
      eventId: d.eventId,
      eventTitle: d.event?.title || null,
      recordedByUserId: d.recordedByUserId,
      repayments: d.repayments.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        debtId: r.debtId,
        amount: Number(r.amount),
        repaymentDate: r.repaymentDate.toISOString(),
        sourceAccountId: r.sourceAccountId,
        sourceAccountName: r.sourceAccount.name,
        method: r.method,
        referenceNumber: r.referenceNumber,
        notes: r.notes,
        recordedByUserId: r.recordedByUserId,
        createdAt: r.createdAt.toISOString(),
      })),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createDebt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const userId = req.user!.id;
    const input = createDebtSchema.parse(req.body);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    const result = await prisma.$transaction(async (tx) => {
      let depositAccountName = '';

      // If deposit account selected, verify and increment balance
      if (input.depositAccountId) {
        const acc = await tx.account.findFirstOrThrow({
          where: { id: input.depositAccountId, tenantId },
        });
        depositAccountName = acc.name;

        await tx.account.update({
          where: { id: acc.id },
          data: { balance: { increment: input.principalAmount } },
        });
      }

      const debt = await tx.debt.create({
        data: {
          tenantId,
          lenderName: input.lenderName,
          lenderContact: input.lenderContact,
          title: input.title,
          description: input.description,
          principalAmount: input.principalAmount,
          remainingAmount: input.principalAmount,
          borrowDate: new Date(input.borrowDate),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          depositAccountId: input.depositAccountId || null,
          eventId: input.eventId || null,
          recordedByUserId: userId,
          status: DebtStatus.ACTIVE,
        },
      });

      return { debt, depositAccountName };
    });

    // Record human-readable audit log
    const desc = `${req.user!.fullName} recorded a debt/borrowing of ${input.principalAmount.toLocaleString()} ${tenant.currency} from "${input.lenderName}" for "${input.title}"${
      result.depositAccountName ? ` (funds deposited to "${result.depositAccountName}")` : ''
    }.`;

    await recordAuditLog({
      tenantId,
      userId,
      actorName: req.user!.fullName,
      action: 'DEBT_RECORDED',
      entityType: 'Debt',
      entityId: result.debt.id,
      description: desc,
    });

    res.status(201).json(result.debt);
  } catch (error) {
    next(error);
  }
};

export const recordDebtRepayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);
    const userId = req.user!.id;
    const input = recordDebtRepaymentSchema.parse(req.body);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findFirstOrThrow({
        where: { id, tenantId },
      });

      const currentRemaining = Number(debt.remainingAmount);
      if (input.amount > currentRemaining) {
        throw new Error(
          `Repayment amount (${input.amount}) cannot exceed outstanding debt balance (${currentRemaining})`
        );
      }

      const sourceAccount = await tx.account.findFirstOrThrow({
        where: { id: input.sourceAccountId, tenantId },
      });

      const currentBalance = Number(sourceAccount.balance);
      if (currentBalance < input.amount) {
        throw new Error(
          `Account "${sourceAccount.name}" has insufficient funds (${currentBalance.toLocaleString()} ${tenant.currency}) for repayment of ${input.amount.toLocaleString()} ${tenant.currency}`
        );
      }

      // 1. Decrement source account
      await tx.account.update({
        where: { id: sourceAccount.id },
        data: { balance: { decrement: input.amount } },
      });

      // 2. Decrement remaining debt
      const newRemaining = Math.max(0, currentRemaining - input.amount);
      const newStatus = newRemaining === 0 ? DebtStatus.FULLY_PAID : DebtStatus.PARTIALLY_PAID;

      const updatedDebt = await tx.debt.update({
        where: { id },
        data: {
          remainingAmount: newRemaining,
          status: newStatus,
        },
      });

      // 3. Create DebtRepayment
      const repayment = await tx.debtRepayment.create({
        data: {
          tenantId,
          debtId: id,
          amount: input.amount,
          repaymentDate: new Date(input.repaymentDate),
          sourceAccountId: input.sourceAccountId,
          method: input.method,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          recordedByUserId: userId,
        },
      });

      return { updatedDebt, repayment, sourceAccountName: sourceAccount.name, newRemaining };
    });

    // Record human-readable audit log
    const desc = `${req.user!.fullName} repaid an installment of ${input.amount.toLocaleString()} ${tenant.currency} towards debt "${result.updatedDebt.title}" to "${result.updatedDebt.lenderName}" from "${result.sourceAccountName}" (${
      result.newRemaining === 0
        ? 'DEBT FULLY SETTLED'
        : `Remaining debt balance: ${result.newRemaining.toLocaleString()} ${tenant.currency}`
    }).`;

    await recordAuditLog({
      tenantId,
      userId,
      actorName: req.user!.fullName,
      action: result.newRemaining === 0 ? 'DEBT_FULLY_SETTLED' : 'DEBT_REPAYMENT_RECORDED',
      entityType: 'Debt',
      entityId: id,
      description: desc,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
