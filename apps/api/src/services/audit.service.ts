import { prisma } from '@keeper/database';

export interface AuditLogInput {
  tenantId?: string | null;
  userId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  details?: any;
}

export const recordAuditLog = async (input: AuditLogInput) => {
  try {
    return await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        description: input.description,
        details: input.details,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
};
