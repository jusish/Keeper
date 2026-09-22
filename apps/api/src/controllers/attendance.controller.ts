import { Response, NextFunction } from 'express';
import { prisma, SessionStatus, AttendanceStatus } from '@keeper/database';
import {
  createSessionSchema,
  cancelSessionSchema,
  markAttendanceSchema,
} from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';

export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    const sessions = await prisma.attendanceSession.findMany({
      where: { tenantId },
      include: {
        records: true,
      },
      orderBy: { sessionDate: 'desc' },
    });

    const response = sessions.map((s) => {
      const present = s.records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
      const excused = s.records.filter((r) => r.status === AttendanceStatus.ABSENT_EXCUSED).length;
      const unexcused = s.records.filter((r) => r.status === AttendanceStatus.ABSENT_UNEXCUSED).length;
      const late = s.records.filter((r) => r.status === AttendanceStatus.LATE).length;

      return {
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
          present,
          excused,
          unexcused,
          late,
          total: s.records.length,
        },
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    const session = await prisma.attendanceSession.findFirst({
      where: { id, tenantId },
      include: {
        records: {
          include: { member: true },
          orderBy: [{ member: { voicePart: 'asc' } }, { member: { fullName: 'asc' } }],
        },
      },
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const present = session.records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const excused = session.records.filter((r) => r.status === AttendanceStatus.ABSENT_EXCUSED).length;
    const unexcused = session.records.filter((r) => r.status === AttendanceStatus.ABSENT_UNEXCUSED).length;
    const late = session.records.filter((r) => r.status === AttendanceStatus.LATE).length;

    res.json({
      id: session.id,
      tenantId: session.tenantId,
      title: session.title,
      sessionType: session.sessionType,
      sessionDate: session.sessionDate.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      isRecurring: session.isRecurring,
      recurrenceRule: session.recurrenceRule,
      status: session.status,
      cancellationReason: session.cancellationReason,
      notes: session.notes,
      recordedByUserId: session.recordedByUserId,
      recordCount: {
        present,
        excused,
        unexcused,
        late,
        total: session.records.length,
      },
      records: session.records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        memberId: r.memberId,
        memberFullName: r.member.fullName,
        memberVoicePart: r.member.voicePart,
        status: r.status,
        reasonNote: r.reasonNote,
        checkInTime: r.checkInTime?.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const userId = req.user!.id;
    const input = createSessionSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.create({
        data: {
          tenantId,
          title: input.title,
          sessionType: input.sessionType,
          sessionDate: new Date(input.sessionDate),
          startTime: input.startTime,
          endTime: input.endTime,
          isRecurring: input.isRecurring,
          recurrenceRule: input.recurrenceRule,
          notes: input.notes,
          recordedByUserId: userId,
          status: SessionStatus.SCHEDULED,
        },
      });

      const activeMembers = await tx.member.findMany({
        where: { tenantId, status: 'ACTIVE' },
      });

      if (activeMembers.length > 0) {
        await tx.attendanceRecord.createMany({
          data: activeMembers.map((m) => ({
            sessionId: session.id,
            memberId: m.id,
            status: AttendanceStatus.PRESENT,
          })),
        });
      }

      return session;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);
    const input = markAttendanceSchema.parse(req.body);

    // Verify session
    await prisma.attendanceSession.findFirstOrThrow({
      where: { id, tenantId },
    });

    await prisma.$transaction(async (tx) => {
      for (const rec of input.records) {
        await tx.attendanceRecord.upsert({
          where: {
            sessionId_memberId: {
              sessionId: id,
              memberId: rec.memberId,
            },
          },
          update: {
            status: rec.status,
            reasonNote: rec.reasonNote,
            checkInTime: rec.status === AttendanceStatus.PRESENT ? new Date() : null,
          },
          create: {
            sessionId: id,
            memberId: rec.memberId,
            status: rec.status,
            reasonNote: rec.reasonNote,
            checkInTime: rec.status === AttendanceStatus.PRESENT ? new Date() : null,
          },
        });
      }

      // Mark session as COMPLETED
      await tx.attendanceSession.update({
        where: { id },
        data: { status: SessionStatus.COMPLETED },
      });
    });

    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    const presentCount = input.records.filter((r) => r.status === 'PRESENT').length;
    const excusedCount = input.records.filter((r) => r.status === 'ABSENT_EXCUSED').length;

    await recordAuditLog({
      tenantId,
      userId: req.user!.id,
      actorName: req.user!.fullName,
      action: 'ATTENDANCE_FINALIZED',
      entityType: 'AttendanceSession',
      entityId: id,
      description: `${req.user!.fullName} finalized attendance roster for "${session?.title || 'Session'}" (${presentCount} present, ${excusedCount} excused).`,
    });

    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);
    const input = cancelSessionSchema.parse(req.body);

    const session = await prisma.attendanceSession.updateMany({
      where: { id, tenantId },
      data: {
        status: SessionStatus.CANCELLED,
        cancellationReason: input.cancellationReason,
      },
    });

    if (session.count === 0) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const sess = await prisma.attendanceSession.findUnique({ where: { id } });
    await recordAuditLog({
      tenantId,
      userId: req.user!.id,
      actorName: req.user!.fullName,
      action: 'SESSION_CANCELLED',
      entityType: 'AttendanceSession',
      entityId: id,
      description: `${req.user!.fullName} cancelled session "${sess?.title || 'Rehearsal'}" for the whole choir. Reason: "${input.cancellationReason}".`,
    });

    res.json({ message: 'Session marked as cancelled with documented reason' });
  } catch (error) {
    next(error);
  }
};
