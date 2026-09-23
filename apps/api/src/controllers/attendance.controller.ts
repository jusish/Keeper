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
          orderBy: [{ member: { fullName: 'asc' } }],
        },
      },
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // If session is unfinalized, auto-sync with active members who joined on or before this session date
    if (session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.CANCELLED) {
      const activeMembers = await prisma.member.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          OR: [
            { joinedDate: { lte: session.sessionDate } },
            { joinedDate: null },
          ],
        },
      });

      const existingMemberIds = new Set(session.records.map((r) => r.memberId));
      const missingMembers = activeMembers.filter((m) => !existingMemberIds.has(m.id));

      if (missingMembers.length > 0) {
        await prisma.attendanceRecord.createMany({
          data: missingMembers.map((m) => ({
            sessionId: session.id,
            memberId: m.id,
            status: AttendanceStatus.PRESENT,
          })),
        });

        const refreshed = await prisma.attendanceSession.findUniqueOrThrow({
          where: { id: session.id },
          include: {
            records: {
              include: { member: true },
              orderBy: [{ member: { fullName: 'asc' } }],
            },
          },
        });
        session.records = refreshed.records;
      }

      // Filter out any members who joined after this session date
      session.records = session.records.filter((r) => {
        if (!r.member.joinedDate) return true;
        return r.member.joinedDate <= session.sessionDate;
      });
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
      const activeMembers = await tx.member.findMany({
        where: { tenantId, status: 'ACTIVE' },
      });

      // Parse recurrence if specified: e.g. "WEEKLY:4" or "FREQ=WEEKLY;COUNT=4"
      let occurrences = 1;
      let intervalDays = 7;
      if (input.isRecurring && input.recurrenceRule) {
        const rule = input.recurrenceRule.toUpperCase();
        if (rule.includes('MONTHLY')) {
          intervalDays = 30;
        } else if (rule.includes('BIWEEKLY')) {
          intervalDays = 14;
        } else {
          intervalDays = 7;
        }

        const countMatch = rule.match(/(?:COUNT=|:)(\d+)/);
        if (countMatch && countMatch[1]) {
          occurrences = Math.min(Math.max(parseInt(countMatch[1], 10), 1), 24);
        }
      }

      const createdSessions = [];
      const baseDate = new Date(input.sessionDate);

      for (let i = 0; i < occurrences; i++) {
        const sessionDate = new Date(baseDate);
        sessionDate.setDate(baseDate.getDate() + (i * intervalDays));

        const session = await tx.attendanceSession.create({
          data: {
            tenantId,
            title: occurrences > 1 ? `${input.title} (Part ${i + 1}/${occurrences})` : input.title,
            sessionType: input.sessionType,
            sessionDate,
            startTime: input.startTime,
            endTime: input.endTime,
            isRecurring: input.isRecurring,
            recurrenceRule: input.recurrenceRule,
            notes: input.notes,
            recordedByUserId: userId,
            status: SessionStatus.SCHEDULED,
          },
        });

        const eligibleMembers = activeMembers.filter(
          (m) => !m.joinedDate || m.joinedDate <= sessionDate
        );

        if (eligibleMembers.length > 0) {
          await tx.attendanceRecord.createMany({
            data: eligibleMembers.map((m) => ({
              sessionId: session.id,
              memberId: m.id,
              status: AttendanceStatus.PRESENT,
            })),
          });
        }

        createdSessions.push(session);
      }

      return createdSessions[0];
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
    const existing = await prisma.attendanceSession.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (existing.status === SessionStatus.COMPLETED) {
      res.status(400).json({ message: 'Attendance for this session has already been finalized and locked.' });
      return;
    }

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

    const existing = await prisma.attendanceSession.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (existing.status === SessionStatus.COMPLETED) {
      res.status(400).json({ message: 'Cannot cancel an attendance session that has already been finalized and locked.' });
      return;
    }

    await prisma.attendanceSession.update({
      where: { id },
      data: {
        status: SessionStatus.CANCELLED,
        cancellationReason: input.cancellationReason,
      },
    });

    const sess = await prisma.attendanceSession.findUnique({ where: { id } });
    await recordAuditLog({
      tenantId,
      userId: req.user!.id,
      actorName: req.user!.fullName,
      action: 'SESSION_CANCELLED',
      entityType: 'AttendanceSession',
      entityId: id,
      description: `${req.user!.fullName} cancelled session "${sess?.title || 'Session'}" for the whole community. Reason: "${input.cancellationReason}".`,
    });

    res.json({ message: 'Session marked as cancelled with documented reason' });
  } catch (error) {
    next(error);
  }
};
