import { Response, NextFunction } from 'express';
import { prisma } from '@keeper/database';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getCommunityAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { search } = req.query;

    const where: any = { tenantId };

    if (search && typeof search === 'string') {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json(
      logs.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
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
