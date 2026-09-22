import { Response, NextFunction } from 'express';
import { prisma, AssessmentStatus, Gender, TargetAudience } from '@keeper/database';
import { createEventSchema, updateAssessmentSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getEvents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    const events = await prisma.event.findMany({
      where: { tenantId },
      include: {
        subEvents: {
          include: {
            targetAccount: true,
            assessments: true,
          },
        },
        expenses: {
          include: { splits: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    const response = events.map((event) => {
      let totalAssessed = 0;
      let totalCollected = 0;
      let totalSurplus = 0;

      for (const se of event.subEvents) {
        for (const ass of se.assessments) {
          totalAssessed += Number(ass.assignedAmount);
          totalCollected += Number(ass.paidAmount);
          totalSurplus += Number(ass.surplusAmount);
        }
      }

      const totalExpenses = event.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
      const totalOutstanding = Math.max(0, totalAssessed - totalCollected);

      return {
        id: event.id,
        tenantId: event.tenantId,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        location: event.location,
        status: event.status,
        description: event.description,
        totalAssessed,
        totalCollected,
        totalOutstanding,
        totalSurplus,
        totalExpenses,
        netMargin: totalCollected - totalExpenses,
        collectionRate: totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 100) : 0,
        subEvents: event.subEvents.map((se) => ({
          id: se.id,
          eventId: se.eventId,
          title: se.title,
          targetAudience: se.targetAudience,
          defaultAmount: Number(se.defaultAmount),
          targetAccountId: se.targetAccountId,
          targetAccountName: se.targetAccount?.name,
          assessmentCount: se.assessments.length,
          totalAssessed: se.assessments.reduce((s: number, a: any) => s + Number(a.assignedAmount), 0),
          totalCollected: se.assessments.reduce((s: number, a: any) => s + Number(a.paidAmount), 0),
        })),
        createdAt: event.createdAt.toISOString(),
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getEventSettlement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = getActiveTenantId(req);

    const event = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        subEvents: {
          include: {
            assessments: {
              include: { member: true },
            },
          },
        },
        expenses: {
          include: {
            splits: { include: { account: true } },
          },
        },
      },
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Aggregate member data across sub-events
    const memberMap: Record<string, any> = {};

    let totalAssessed = 0;
    let totalCollected = 0;
    let totalSurplus = 0;

    for (const subEvent of event.subEvents) {
      for (const ass of subEvent.assessments) {
        const assigned = Number(ass.assignedAmount);
        const paid = Number(ass.paidAmount);
        const surplus = Number(ass.surplusAmount);
        const remaining = Math.max(0, assigned - paid);

        totalAssessed += assigned;
        totalCollected += paid;
        totalSurplus += surplus;

        if (!memberMap[ass.memberId]) {
          memberMap[ass.memberId] = {
            member: {
              id: ass.member.id,
              tenantId: ass.member.tenantId,
              membershipCode: ass.member.membershipCode,
              fullName: ass.member.fullName,
              gender: ass.member.gender,
              voicePart: ass.member.voicePart,
              phone: ass.member.phone,
              creditBalance: Number(ass.member.creditBalance),
              status: ass.member.status,
            },
            assessments: [],
            totalAssigned: 0,
            totalPaid: 0,
            totalRemaining: 0,
            totalSurplus: 0,
            isFullyPaid: true,
          };
        }

        memberMap[ass.memberId].assessments.push({
          assessmentId: ass.id,
          subEventId: subEvent.id,
          subEventTitle: subEvent.title,
          assigned,
          paid,
          remaining,
          surplus,
          status: ass.status,
        });

        memberMap[ass.memberId].totalAssigned += assigned;
        memberMap[ass.memberId].totalPaid += paid;
        memberMap[ass.memberId].totalRemaining += remaining;
        memberMap[ass.memberId].totalSurplus += surplus;
        if (paid < assigned) {
          memberMap[ass.memberId].isFullyPaid = false;
        }
      }
    }

    const expensesTotal = event.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const totalOutstanding = Math.max(0, totalAssessed - totalCollected);
    const netMargin = totalCollected - expensesTotal;

    const memberList = Object.values(memberMap).sort((a: any, b: any) =>
      a.member.fullName.localeCompare(b.member.fullName)
    );

    res.json({
      event: {
        id: event.id,
        tenantId: event.tenantId,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        location: event.location,
        status: event.status,
        description: event.description,
        subEvents: event.subEvents.map((se: any) => ({
          id: se.id,
          title: se.title,
          defaultAmount: Number(se.defaultAmount),
          targetAudience: se.targetAudience,
        })),
        createdAt: event.createdAt.toISOString(),
      },
      totalAssessed,
      totalCollected,
      totalOutstanding,
      totalSurplus,
      expensesTotal,
      netMargin,
      members: memberList,
      expenses: event.expenses.map((e: any) => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        expenseDate: e.expenseDate.toISOString(),
        category: e.category,
        vendorName: e.vendorName,
        isPlanned: e.isPlanned,
        splits: e.splits.map((s: any) => ({
          id: s.id,
          accountName: s.account.name,
          amount: Number(s.amount),
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const input = createEventSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId,
          title: input.title,
          eventDate: new Date(input.eventDate),
          location: input.location,
          description: input.description,
        },
      });

      const allMembers = await tx.member.findMany({
        where: { tenantId, status: 'ACTIVE' },
      });

      for (const seInput of input.subEvents) {
        const subEvent = await tx.subEvent.create({
          data: {
            eventId: event.id,
            title: seInput.title,
            targetAudience: seInput.targetAudience,
            defaultAmount: seInput.defaultAmount,
            targetAccountId: seInput.targetAccountId,
          },
        });

        // Determine target members
        let targetMembers = allMembers;
        if (seInput.targetAudience === TargetAudience.MEN_ONLY) {
          targetMembers = allMembers.filter((m) => m.gender === Gender.MALE);
        } else if (seInput.targetAudience === TargetAudience.WOMEN_ONLY) {
          targetMembers = allMembers.filter((m) => m.gender === Gender.FEMALE);
        }

        for (const m of targetMembers) {
          await tx.memberEventAssessment.create({
            data: {
              subEventId: subEvent.id,
              memberId: m.id,
              assignedAmount: seInput.defaultAmount,
              paidAmount: 0,
              status: AssessmentStatus.UNPAID,
              surplusAmount: 0,
            },
          });
        }
      }

      return event;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assessmentId = req.params.assessmentId as string;
    const input = updateAssessmentSchema.parse(req.body);

    const assessment = await prisma.memberEventAssessment.findUniqueOrThrow({
      where: { id: assessmentId },
    });

    const newAssigned = input.assignedAmount;
    const paid = Number(assessment.paidAmount);
    let status = assessment.status;
    let surplus = 0;

    if (paid > newAssigned) {
      status = AssessmentStatus.SURPLUS;
      surplus = paid - newAssigned;
    } else if (paid === newAssigned && newAssigned > 0) {
      status = AssessmentStatus.PAID;
    } else if (paid > 0) {
      status = AssessmentStatus.PARTIAL;
    } else {
      status = AssessmentStatus.UNPAID;
    }

    const updated = await prisma.memberEventAssessment.update({
      where: { id: assessmentId },
      data: {
        assignedAmount: newAssigned,
        surplusAmount: surplus,
        status,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
