import { Response, NextFunction } from 'express';
import { prisma } from '@keeper/database';
import { accountSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    const accounts = await prisma.account.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    res.json(
      accounts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        name: a.name,
        type: a.type,
        accountNumber: a.accountNumber,
        balance: Number(a.balance),
        isDefault: a.isDefault,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const input = accountSchema.parse(req.body);

    if (input.isDefault) {
      // Unset previous default account
      await prisma.account.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await prisma.account.create({
      data: {
        tenantId,
        name: input.name,
        type: input.type,
        accountNumber: input.accountNumber,
        balance: input.balance,
        isDefault: input.isDefault,
        description: input.description,
      },
    });

    res.status(201).json({
      id: account.id,
      tenantId: account.tenantId,
      name: account.name,
      type: account.type,
      accountNumber: account.accountNumber,
      balance: Number(account.balance),
      isDefault: account.isDefault,
      description: account.description,
      createdAt: account.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getAccountLedger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    const account = await prisma.account.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    // Inflows (Payments)
    const payments = await prisma.payment.findMany({
      where: { accountId: id },
      include: { member: true },
      orderBy: { paymentDate: 'desc' },
      take: 50,
    });

    // Outflows (Expense splits)
    const expenseSplits = await prisma.expenseAccountSplit.findMany({
      where: { accountId: id },
      include: { expense: true },
      orderBy: { expense: { expenseDate: 'desc' } },
      take: 50,
    });

    // Combine into timeline
    const entries = [
      ...payments.map((p) => ({
        id: p.id,
        date: p.paymentDate.toISOString(),
        type: 'INFLOW',
        title: `Payment from ${p.member.fullName}`,
        amount: Number(p.amount),
        method: p.method,
        reference: p.referenceNumber,
        notes: p.notes,
      })),
      ...expenseSplits.map((s) => ({
        id: s.id,
        date: s.expense.expenseDate.toISOString(),
        type: 'OUTFLOW',
        title: s.expense.title,
        amount: Number(s.amount),
        category: s.expense.category,
        vendor: s.expense.vendorName,
        notes: s.expense.description,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
      },
      ledger: entries,
    });
  } catch (error) {
    next(error);
  }
};
