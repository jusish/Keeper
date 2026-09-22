import { Response, NextFunction } from 'express';
import { prisma, Role } from '@keeper/database';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getPlatformMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalCommunities = await prisma.tenant.count();
    const totalPlatformUsers = await prisma.user.count();
    const totalMembers = await prisma.member.count();

    const accounts = await prisma.account.findMany();
    const totalPooledCapital = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, members: true },
        },
        accounts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const communities = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      currency: t.currency,
      userCount: t._count.users,
      memberCount: t._count.members,
      totalBalance: t.accounts.reduce((sum, a) => sum + Number(a.balance), 0),
      createdAt: t.createdAt.toISOString(),
    }));

    const recentAuditLogs = await prisma.auditLog.findMany({
      include: {
        tenant: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 12,
    });

    res.json({
      totalCommunities,
      totalPlatformUsers,
      totalMembers,
      totalPooledCapital,
      communities,
      recentAuditLogs: recentAuditLogs.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
        tenantName: l.tenant?.name || 'Platform (Global)',
        userId: l.userId,
        actorName: l.actorName,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        description: l.description,
        timestamp: l.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantId, search, role } = req.query;

    const where: any = {};

    if (tenantId && typeof tenantId === 'string' && tenantId !== 'ALL') {
      where.tenantId = tenantId;
    }

    if (role && typeof role === 'string' && role !== 'ALL') {
      where.role = role as Role;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        tenantId: u.tenantId,
        tenantName: u.tenant?.name || 'Super Admin (Global)',
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getGlobalAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantId, search } = req.query;

    const where: any = {};

    if (tenantId && typeof tenantId === 'string' && tenantId !== 'ALL') {
      where.tenantId = tenantId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        tenant: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json(
      logs.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
        tenantName: l.tenant?.name || 'Platform (Global)',
        userId: l.userId,
        actorName: l.actorName,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        description: l.description,
        timestamp: l.timestamp.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};
