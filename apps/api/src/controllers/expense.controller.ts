import { Response, NextFunction } from 'express';
import { prisma } from '@keeper/database';
import { recordExpenseSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';

export const getExpenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { category, eventId, isPlanned } = req.query;

    const where: any = { tenantId };

    if (category && typeof category === 'string') {
      where.category = category;
    }

    if (eventId && typeof eventId === 'string') {
      where.eventId = eventId;
    }

    if (isPlanned !== undefined) {
      where.isPlanned = isPlanned === 'true';
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        event: true,
        splits: {
          include: { account: true },
        },
        recordedByUser: {
          select: { fullName: true },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    res.json(
      expenses.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        eventId: e.eventId,
        eventTitle: e.event?.title,
        title: e.title,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expenseDate.toISOString(),
        category: e.category,
        vendorName: e.vendorName,
        receiptUrl: e.receiptUrl,
        isPlanned: e.isPlanned,
        recordedByUserId: e.recordedByUserId,
        recordedByUserName: e.recordedByUser.fullName,
        splits: e.splits.map((s) => ({
          id: s.id,
          accountId: s.accountId,
          accountName: s.account.name,
          amount: Number(s.amount),
        })),
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const recordExpense = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const userId = req.user!.id;
    const input = recordExpenseSchema.parse(req.body);

    // Verify sum of splits matches total amount
    const totalSplit = input.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplit - input.amount) > 0.01) {
      res.status(400).json({
        message: `Sum of account splits (${totalSplit}) must equal total expense amount (${input.amount})`,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify accounts belong to tenant
      for (const split of input.splits) {
        const acc = await tx.account.findFirstOrThrow({
          where: { id: split.accountId, tenantId },
        });
        // 2. Decrement account balance
        await tx.account.update({
          where: { id: acc.id },
          data: { balance: { decrement: split.amount } },
        });
      }

      // 3. Create Expense
      const expense = await tx.expense.create({
        data: {
          tenantId,
          eventId: input.eventId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
          category: input.category,
          vendorName: input.vendorName,
          receiptUrl: input.receiptUrl,
          isPlanned: input.isPlanned,
          recordedByUserId: userId,
          splits: {
            create: input.splits.map((s) => ({
              accountId: s.accountId,
              amount: s.amount,
            })),
          },
        },
        include: {
          splits: {
            include: { account: true },
          },
        },
      });

      return expense;
    });

    await recordAuditLog({
      tenantId,
      userId,
      actorName: req.user!.fullName,
      action: input.splits.length > 1 ? 'SPLIT_EXPENSE_RECORDED' : 'EXPENSE_RECORDED',
      entityType: 'Expense',
      entityId: result.id,
      description: `${req.user!.fullName} recorded ${input.isPlanned ? 'planned' : 'unplanned'} expense "${input.title}" of ${input.amount.toLocaleString()} RWF debited across ${input.splits.length} account(s).`,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
