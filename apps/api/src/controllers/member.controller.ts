import { Response, NextFunction } from 'express';
import { prisma, AssessmentStatus } from '@keeper/database';
import { memberSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { search, voicePart, status } = req.query;

    const where: any = { tenantId };

    if (search && typeof search === 'string') {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { membershipCode: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: [{ fullName: 'asc' }],
    });

    res.json(
      members.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        membershipCode: m.membershipCode,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        status: m.status,
        joinedDate: m.joinedDate?.toISOString(),
        notes: m.notes,
        creditBalance: Number(m.creditBalance),
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    const member = await prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        payments: {
          include: { account: true },
          orderBy: { paymentDate: 'desc' },
          take: 20,
        },
        assessments: {
          include: { period: { include: { plan: true } } },
          orderBy: { period: { orderIndex: 'desc' } },
        },
        eventAssessments: {
          include: { subEvent: { include: { event: true } } },
        },
        attendance: {
          include: { session: true },
          orderBy: { session: { sessionDate: 'desc' } },
          take: 20,
        },
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    // Attendance stats
    const totalSessions = member.attendance.length;
    const presentCount = member.attendance.filter((a: any) => a.status === 'PRESENT').length;
    const excusedCount = member.attendance.filter((a: any) => a.status === 'ABSENT_EXCUSED').length;
    const lateCount = member.attendance.filter((a: any) => a.status === 'LATE').length;
    const unexcusedCount = member.attendance.filter((a: any) => a.status === 'ABSENT_UNEXCUSED').length;
    const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;

    res.json({
      member: {
        id: member.id,
        tenantId: member.tenantId,
        membershipCode: member.membershipCode,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        gender: member.gender,
        status: member.status,
        joinedDate: member.joinedDate?.toISOString(),
        notes: member.notes,
        creditBalance: Number(member.creditBalance),
        createdAt: member.createdAt.toISOString(),
      },
      stats: {
        attendanceRate,
        presentCount,
        excusedCount,
        lateCount,
        unexcusedCount,
        totalSessions,
      },
      recentPayments: member.payments.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        method: p.method,
        accountName: p.account.name,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
      })),
      recentAttendance: member.attendance.map((a: any) => ({
        id: a.id,
        sessionTitle: a.session.title,
        sessionDate: a.session.sessionDate.toISOString(),
        status: a.status,
        reasonNote: a.reasonNote,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const input = memberSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let finalCode = input.membershipCode?.trim();
      if (!finalCode) {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        const prefix = tenant?.slug
          ? tenant.slug.split('-')[0].substring(0, 3).toUpperCase()
          : 'MEM';
        const count = await tx.member.count({ where: { tenantId } });
        let seq = count + 1;
        finalCode = `${prefix}-${String(seq).padStart(3, '0')}`;
        let exists = await tx.member.findUnique({
          where: { tenantId_membershipCode: { tenantId, membershipCode: finalCode } },
        });
        while (exists) {
          seq++;
          finalCode = `${prefix}-${String(seq).padStart(3, '0')}`;
          exists = await tx.member.findUnique({
            where: { tenantId_membershipCode: { tenantId, membershipCode: finalCode } },
          });
        }
      }

      const member = await tx.member.create({
        data: {
          tenantId,
          membershipCode: finalCode,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          gender: input.gender,
          status: input.status,
          joinedDate: input.joinedDate ? new Date(input.joinedDate) : new Date(),
          notes: input.notes,
        },
      });

      // Auto-assign to any active Umusanzu plan periods
      const activePlans = await tx.contributionPlan.findMany({
        where: { tenantId, isActive: true },
        include: { periods: true },
      });

      for (const plan of activePlans) {
        for (const period of plan.periods) {
          await tx.contributionAssessment.create({
            data: {
              periodId: period.id,
              memberId: member.id,
              expectedAmount: plan.defaultAmount,
              paidAmount: 0,
              status: AssessmentStatus.UNPAID,
              surplusAmount: 0,
            },
          });
        }
      }

      return member;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);
    const input = memberSchema.parse(req.body);

    const member = await prisma.member.updateMany({
      where: { id, tenantId },
      data: {
        membershipCode: input.membershipCode,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email || null,
        gender: input.gender,
        status: input.status,
        joinedDate: input.joinedDate ? new Date(input.joinedDate) : undefined,
        notes: input.notes,
      },
    });

    if (member.count === 0) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    const updated = await prisma.member.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    await prisma.member.deleteMany({
      where: { id, tenantId },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};
