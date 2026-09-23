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

export const createCommunity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, slug, currency = 'RWF', adminName, adminFullName, adminEmail, adminPassword } = req.body;
    const effectiveAdminName = adminFullName || adminName;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'Community name is required' });
      return;
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      res.status(400).json({ message: `Community slug "${cleanSlug}" is already taken` });
      return;
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          slug: cleanSlug,
          currency: currency.toUpperCase(),
        },
      });

      // Default treasury fund
      await tx.account.create({
        data: {
          tenantId: created.id,
          name: 'General Fund',
          type: 'GENERAL_DUES' as any,
          balance: 0,
          isDefault: true,
          description: 'Primary operating account for general contributions and dues',
        },
      });

      // Optional initial community admin
      if (adminEmail && adminPassword && effectiveAdminName) {
        const hashedPassword = await (await import('bcryptjs')).default.hash(adminPassword, 10);
        await tx.user.create({
          data: {
            tenantId: created.id,
            email: adminEmail.toLowerCase(),
            passwordHash: hashedPassword,
            fullName: effectiveAdminName,
            role: Role.ADMIN,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: created.id,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          action: 'COMMUNITY_CREATED',
          entityType: 'Tenant',
          entityId: created.id,
          description: `${req.user!.fullName} (Super Admin) registered new community organization "${name}" on Keeper platform.`,
        },
      });

      return created;
    });

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === Role.SUPER_ADMIN) {
      res.status(400).json({ message: 'Cannot deactivate Super Admin' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: req.user!.id,
        actorName: req.user!.fullName,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        description: `${req.user!.fullName} (Super Admin) ${updated.isActive ? 'activated' : 'deactivated'} user "${user.fullName}" (${user.email}).`,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
