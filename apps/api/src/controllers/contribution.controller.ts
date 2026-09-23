import { Response, NextFunction } from 'express';
import { prisma, AssessmentStatus, PlanCycle } from '@keeper/database';
import { contributionPlanSchema, recordPaymentSchema } from '@keeper/shared';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';
import { recordAuditLog } from '../services/audit.service.js';

export const getPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);

    const plans = await prisma.contributionPlan.findMany({
      where: { tenantId },
      include: {
        predecessorPlan: {
          select: { id: true, title: true },
        },
        periods: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(
      plans.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        title: p.title,
        cycle: p.cycle,
        defaultAmount: Number(p.defaultAmount),
        startDate: p.startDate.toISOString(),
        endDate: p.endDate?.toISOString(),
        isActive: p.isActive,
        targetAccountId: p.targetAccountId,
        predecessorPlanId: p.predecessorPlanId,
        predecessorPlanTitle: p.predecessorPlan?.title || null,
        periods: p.periods.map((per) => ({
          id: per.id,
          planId: per.planId,
          label: per.label,
          orderIndex: per.orderIndex,
          dueDate: per.dueDate.toISOString(),
          isClosed: per.isClosed,
        })),
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const input = contributionPlanSchema.parse(req.body);

    const year = input.year;
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const result = await prisma.$transaction(async (tx) => {
      // Create plan
      const plan = await tx.contributionPlan.create({
        data: {
          tenantId,
          title: input.title,
          cycle: input.cycle,
          defaultAmount: input.defaultAmount,
          startDate,
          endDate,
          targetAccountId: input.targetAccountId,
          predecessorPlanId: input.predecessorPlanId || undefined,
          isActive: true,
        },
      });

      // Generate periods based on cycle
      const periodsData = [];
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      if (input.cycle === PlanCycle.MONTHLY) {
        for (let i = 0; i < 12; i++) {
          periodsData.push({
            planId: plan.id,
            label: `${monthNames[i]} ${year}`,
            orderIndex: i + 1,
            dueDate: new Date(year, i, 28),
          });
        }
      } else if (input.cycle === PlanCycle.WEEKLY) {
        let currentWeekDate = new Date(year, 0, 7);
        for (let w = 1; w <= 52; w++) {
          const mName = monthNames[currentWeekDate.getMonth()];
          const dayNum = currentWeekDate.getDate();
          periodsData.push({
            planId: plan.id,
            label: `W${w < 10 ? '0' + w : w} (${mName} ${dayNum})`,
            orderIndex: w,
            dueDate: new Date(currentWeekDate),
          });
          currentWeekDate = new Date(currentWeekDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else if (input.cycle === PlanCycle.QUARTERLY) {
        const quarters = [
          { label: `Q1 ${year} (Jan - Mar)`, due: new Date(year, 2, 31) },
          { label: `Q2 ${year} (Apr - Jun)`, due: new Date(year, 5, 30) },
          { label: `Q3 ${year} (Jul - Sep)`, due: new Date(year, 8, 30) },
          { label: `Q4 ${year} (Oct - Dec)`, due: new Date(year, 11, 31) },
        ];
        quarters.forEach((q, idx) => {
          periodsData.push({
            planId: plan.id,
            label: q.label,
            orderIndex: idx + 1,
            dueDate: q.due,
          });
        });
      } else if (input.cycle === PlanCycle.YEARLY) {
        periodsData.push({
          planId: plan.id,
          label: `Annual ${year}`,
          orderIndex: 1,
          dueDate: new Date(year, 11, 31),
        });
      }

      await tx.contributionPeriod.createMany({
        data: periodsData,
      });

      const periods = await tx.contributionPeriod.findMany({
        where: { planId: plan.id },
        orderBy: { orderIndex: 'asc' },
      });

      // Create assessments for all active members
      const activeMembers = await tx.member.findMany({
        where: { tenantId, status: 'ACTIVE' },
      });

      const assessmentsData = [];
      for (const period of periods) {
        for (const member of activeMembers) {
          const memberJoined = member.joinedDate || new Date();
          const isBeforeJoin = period.dueDate < memberJoined;

          assessmentsData.push({
            periodId: period.id,
            memberId: member.id,
            expectedAmount: isBeforeJoin ? 0 : input.defaultAmount,
            paidAmount: 0,
            status: isBeforeJoin ? AssessmentStatus.PAID : AssessmentStatus.UNPAID,
            surplusAmount: 0,
          });
        }
      }

      if (assessmentsData.length > 0) {
        await tx.contributionAssessment.createMany({
          data: assessmentsData,
        });
      }

      // Auto-apply advance credit balance for any member who has prepaid credit
      for (const member of activeMembers) {
        let availCredit = Number(member.creditBalance);
        if (availCredit <= 0) continue;

        const memberAssessments = await tx.contributionAssessment.findMany({
          where: {
            memberId: member.id,
            periodId: { in: periods.map((p) => p.id) },
          },
          include: { period: true },
          orderBy: { period: { orderIndex: 'asc' } },
        });

        let creditUsed = 0;
        for (const assess of memberAssessments) {
          if (availCredit <= 0) break;
          const exp = Number(assess.expectedAmount);
          if (exp <= 0) continue; // Exempt

          const needed = exp - Number(assess.paidAmount);
          if (needed > 0) {
            const allocate = Math.min(availCredit, needed);
            availCredit -= allocate;
            creditUsed += allocate;
            const updatedPaid = Number(assess.paidAmount) + allocate;

            await tx.contributionAssessment.update({
              where: { id: assess.id },
              data: {
                paidAmount: updatedPaid,
                surplusAmount: 0,
                status: updatedPaid >= exp ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL,
              },
            });
          }
        }

        if (creditUsed > 0) {
          await tx.member.update({
            where: { id: member.id },
            data: { creditBalance: { decrement: creditUsed } },
          });
        }
      }

      return { plan, periods };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMatrix = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { planId } = req.query;

    let targetPlan;
    if (planId && typeof planId === 'string') {
      targetPlan = await prisma.contributionPlan.findFirst({
        where: { id: planId, tenantId },
        include: {
          predecessorPlan: {
            select: { id: true, title: true },
          },
          periods: { orderBy: { orderIndex: 'asc' } },
        },
      });
    } else {
      // Default to active plan or most recent
      targetPlan = await prisma.contributionPlan.findFirst({
        where: { tenantId, isActive: true },
        include: {
          predecessorPlan: {
            select: { id: true, title: true },
          },
          periods: { orderBy: { orderIndex: 'asc' } },
        },
        orderBy: { startDate: 'desc' },
      });
    }

    if (!targetPlan) {
      res.status(404).json({ message: 'No contribution plan found' });
      return;
    }

    // Auto-heal if plan has 0 periods (e.g. created previously under unsupported cycle)
    if (targetPlan.periods.length === 0) {
      const year = targetPlan.startDate.getFullYear();
      const periodsData = [];
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      if (targetPlan.cycle === PlanCycle.MONTHLY) {
        for (let i = 0; i < 12; i++) {
          periodsData.push({
            planId: targetPlan.id,
            label: `${monthNames[i]} ${year}`,
            orderIndex: i + 1,
            dueDate: new Date(year, i, 28),
          });
        }
      } else if (targetPlan.cycle === PlanCycle.WEEKLY) {
        let currentWeekDate = new Date(year, 0, 7);
        for (let w = 1; w <= 52; w++) {
          const mName = monthNames[currentWeekDate.getMonth()];
          const dayNum = currentWeekDate.getDate();
          periodsData.push({
            planId: targetPlan.id,
            label: `W${w < 10 ? '0' + w : w} (${mName} ${dayNum})`,
            orderIndex: w,
            dueDate: new Date(currentWeekDate),
          });
          currentWeekDate = new Date(currentWeekDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      } else if (targetPlan.cycle === PlanCycle.QUARTERLY) {
        const quarters = [
          { label: `Q1 ${year} (Jan - Mar)`, due: new Date(year, 2, 31) },
          { label: `Q2 ${year} (Apr - Jun)`, due: new Date(year, 5, 30) },
          { label: `Q3 ${year} (Jul - Sep)`, due: new Date(year, 8, 30) },
          { label: `Q4 ${year} (Oct - Dec)`, due: new Date(year, 11, 31) },
        ];
        quarters.forEach((q, idx) => {
          periodsData.push({
            planId: targetPlan.id,
            label: q.label,
            orderIndex: idx + 1,
            dueDate: q.due,
          });
        });
      } else if (targetPlan.cycle === PlanCycle.YEARLY) {
        periodsData.push({
          planId: targetPlan.id,
          label: `Annual ${year}`,
          orderIndex: 1,
          dueDate: new Date(year, 11, 31),
        });
      }

      if (periodsData.length > 0) {
        await prisma.contributionPeriod.createMany({ data: periodsData });
        const newPeriods = await prisma.contributionPeriod.findMany({
          where: { planId: targetPlan.id },
          orderBy: { orderIndex: 'asc' },
        });

        const activeMembers = await prisma.member.findMany({
          where: { tenantId, status: 'ACTIVE' },
        });

        const assessmentsData = [];
        for (const period of newPeriods) {
          for (const member of activeMembers) {
            const memberJoined = member.joinedDate || new Date();
            const isBeforeJoin = period.dueDate < memberJoined;
            assessmentsData.push({
              periodId: period.id,
              memberId: member.id,
              expectedAmount: isBeforeJoin ? 0 : Number(targetPlan.defaultAmount),
              paidAmount: 0,
              status: isBeforeJoin ? AssessmentStatus.PAID : AssessmentStatus.UNPAID,
              surplusAmount: 0,
            });
          }
        }

        if (assessmentsData.length > 0) {
          await prisma.contributionAssessment.createMany({ data: assessmentsData });
        }

        targetPlan.periods = newPeriods;
      }
    }

    const periods = targetPlan.periods;
    const periodIds = periods.map((p) => p.id);

    // Fetch members and their assessments
    const members = await prisma.member.findMany({
      where: { tenantId },
      include: {
        assessments: {
          where: { periodId: { in: periodIds } },
        },
      },
      orderBy: [{ fullName: 'asc' }],
    });

    // Check predecessor plan arrears if predecessorPlanId is set
    const previousArrearsByMember: Record<string, number> = {};
    if (targetPlan.predecessorPlanId) {
      const predecessorAssessments = await prisma.contributionAssessment.findMany({
        where: {
          period: { planId: targetPlan.predecessorPlanId },
          member: { tenantId },
        },
        select: {
          memberId: true,
          expectedAmount: true,
          paidAmount: true,
        },
      });

      for (const pa of predecessorAssessments) {
        const exp = Number(pa.expectedAmount);
        const paid = Number(pa.paidAmount);
        if (exp > paid) {
          previousArrearsByMember[pa.memberId] =
            (previousArrearsByMember[pa.memberId] || 0) + (exp - paid);
        }
      }
    }

    // Initialize period totals
    const totalsByPeriod: Record<
      string,
      {
        expected: number;
        collected: number;
        surplus: number;
        remaining: number;
        collectionRate: number;
      }
    > = {};

    for (const p of periods) {
      totalsByPeriod[p.id] = {
        expected: 0,
        collected: 0,
        surplus: 0,
        remaining: 0,
        collectionRate: 0,
      };
    }

    let grandTotalExpected = 0;
    let grandTotalCollected = 0;
    let grandTotalSurplus = 0;
    let grandTotalAdvance = 0;
    let grandTotalRemaining = 0;
    let grandTotalPreviousArrears = 0;

    const rows = members.map((member) => {
      const cells: Record<string, any> = {};
      let totalPaid = 0;
      let totalExpected = 0;
      let totalRemaining = 0;

      for (const p of periods) {
        const assess = member.assessments.find((a) => a.periodId === p.id);
        const expected = assess ? Number(assess.expectedAmount) : Number(targetPlan.defaultAmount);
        const isExempt = assess ? expected === 0 : false;
        const paid = assess ? Number(assess.paidAmount) : 0;
        const remaining = isExempt ? 0 : Math.max(0, expected - paid);
        let status = assess ? assess.status : AssessmentStatus.UNPAID;
        if (status === AssessmentStatus.SURPLUS) {
          status = AssessmentStatus.PAID;
        }

        cells[p.id] = {
          assessmentId: assess?.id,
          periodId: p.id,
          expectedAmount: expected,
          paidAmount: paid,
          surplusAmount: 0,
          remainingAmount: remaining,
          status,
          isExempt,
        };

        totalPaid += paid;
        totalExpected += expected;
        totalRemaining += remaining;

        // Add to period summary
        totalsByPeriod[p.id].expected += expected;
        totalsByPeriod[p.id].collected += paid;
        totalsByPeriod[p.id].surplus = 0;
        totalsByPeriod[p.id].remaining += remaining;
      }

      grandTotalExpected += totalExpected;
      grandTotalCollected += totalPaid;
      grandTotalRemaining += totalRemaining;

      const previousArrears = previousArrearsByMember[member.id] || 0;
      grandTotalPreviousArrears += previousArrears;
      const totalDueWithArrears = totalRemaining + previousArrears;

      const advanceCredit = Number(member.creditBalance);
      grandTotalAdvance += advanceCredit;

      let overallStatus: AssessmentStatus = AssessmentStatus.UNPAID;
      if (totalDueWithArrears === 0) {
        overallStatus = AssessmentStatus.PAID;
      } else if (totalPaid > 0) {
        overallStatus = AssessmentStatus.PARTIAL;
      }

      return {
        member: {
          id: member.id,
          tenantId: member.tenantId,
          membershipCode: member.membershipCode,
          fullName: member.fullName,
          phone: member.phone,
          email: member.email,
          gender: member.gender,
          status: member.status,
          creditBalance: Number(member.creditBalance),
          createdAt: member.createdAt.toISOString(),
        },
        cells,
        totalPaid,
        totalExpected,
        totalSurplus: 0,
        advanceCredit,
        totalRemaining,
        previousArrears,
        totalDueWithArrears,
        overallStatus,
      };
    });

    // Compute period collection rates
    for (const p of periods) {
      const exp = totalsByPeriod[p.id].expected;
      const col = totalsByPeriod[p.id].collected;
      totalsByPeriod[p.id].collectionRate = exp > 0 ? Math.round((col / exp) * 100) : 0;
    }

    const overallCollectionRate =
      grandTotalExpected > 0 ? Math.round((grandTotalCollected / grandTotalExpected) * 100) : 0;

    res.json({
      plan: {
        id: targetPlan.id,
        tenantId: targetPlan.tenantId,
        title: targetPlan.title,
        cycle: targetPlan.cycle,
        defaultAmount: Number(targetPlan.defaultAmount),
        startDate: targetPlan.startDate.toISOString(),
        endDate: targetPlan.endDate?.toISOString(),
        isActive: targetPlan.isActive,
        targetAccountId: targetPlan.targetAccountId,
        predecessorPlanId: targetPlan.predecessorPlanId,
        predecessorPlanTitle: (targetPlan as any).predecessorPlan?.title || null,
      },
      periods: periods.map((p) => ({
        id: p.id,
        planId: p.planId,
        label: p.label,
        orderIndex: p.orderIndex,
        dueDate: p.dueDate.toISOString(),
        isClosed: p.isClosed,
      })),
      rows,
      totalsByPeriod,
      grandTotalExpected,
      grandTotalCollected,
      grandTotalSurplus: 0,
      grandTotalAdvance,
      grandTotalRemaining,
      grandTotalPreviousArrears,
      predecessorPlanTitle: (targetPlan as any).predecessorPlan?.title || null,
      overallCollectionRate,
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const userId = req.user!.id;
    const input = recordPaymentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Verify account belongs to tenant
      const account = await tx.account.findFirstOrThrow({
        where: { id: input.accountId, tenantId },
      });

      // 1. Create base Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId,
          memberId: input.memberId,
          accountId: input.accountId,
          amount: input.amount,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          method: input.method,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          recordedByUserId: userId,
        },
      });

      // 2. Increment account balance
      await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: input.amount } },
      });

      // 3. Process allocation based on targetType
      if (input.targetType === 'UMUSANZU_SINGLE') {
        if (!input.periodId) {
          throw new Error('periodId is required for UMUSANZU_SINGLE');
        }

        const startPeriod = await tx.contributionPeriod.findUniqueOrThrow({
          where: { id: input.periodId },
          include: { plan: true },
        });

        // Load all periods in the plan starting from the selected period
        const eligiblePeriods = await tx.contributionPeriod.findMany({
          where: {
            planId: startPeriod.planId,
            orderIndex: { gte: startPeriod.orderIndex },
          },
          orderBy: { orderIndex: 'asc' },
        });

        let remainingPool = input.amount;

        for (const period of eligiblePeriods) {
          if (remainingPool <= 0) break;

          let assess = await tx.contributionAssessment.findUnique({
            where: {
              periodId_memberId: {
                periodId: period.id,
                memberId: input.memberId,
              },
            },
          });

          if (!assess) {
            assess = await tx.contributionAssessment.create({
              data: {
                periodId: period.id,
                memberId: input.memberId,
                expectedAmount: startPeriod.plan.defaultAmount,
                paidAmount: 0,
                status: AssessmentStatus.UNPAID,
                surplusAmount: 0,
              },
            });
          }

          const expected = Number(assess.expectedAmount);
          if (expected <= 0) continue; // Exempt / joined later

          const currentPaid = Number(assess.paidAmount);
          const needed = Math.max(0, expected - currentPaid);

          if (needed > 0) {
            const allocate = Math.min(remainingPool, needed);
            const updatedPaid = currentPaid + allocate;
            remainingPool -= allocate;

            const isDone = updatedPaid >= expected;

            await tx.contributionAssessment.update({
              where: { id: assess.id },
              data: {
                paidAmount: updatedPaid,
                surplusAmount: 0,
                status: isDone ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL,
              },
            });

            await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                contributionAssessmentId: assess.id,
                allocatedAmount: allocate,
                surplusAmount: 0,
              },
            });
          }
        }

        // If extra money still remains after covering all future periods of this plan,
        // store the remainder directly in the member's advance credit balance!
        if (remainingPool > 0) {
          await tx.member.update({
            where: { id: input.memberId },
            data: {
              creditBalance: { increment: remainingPool },
            },
          });
        }
      } else if (input.targetType === 'UMUSANZU_YEAR_ADVANCE') {
        const plan = await tx.contributionPlan.findFirstOrThrow({
          where: {
            id: input.planId,
            tenantId,
          },
          include: {
            periods: { orderBy: { orderIndex: 'asc' } },
          },
        });

        let remainingPool = input.amount;

        for (const period of plan.periods) {
          if (remainingPool <= 0) break;

          let assess = await tx.contributionAssessment.findUnique({
            where: {
              periodId_memberId: {
                periodId: period.id,
                memberId: input.memberId,
              },
            },
          });

          if (!assess) {
            assess = await tx.contributionAssessment.create({
              data: {
                periodId: period.id,
                memberId: input.memberId,
                expectedAmount: plan.defaultAmount,
                paidAmount: 0,
                status: AssessmentStatus.UNPAID,
                surplusAmount: 0,
              },
            });
          }

          const expected = Number(assess.expectedAmount);
          if (expected <= 0) continue; // Exempt / joined later

          const currentPaid = Number(assess.paidAmount);
          const needed = Math.max(0, expected - currentPaid);

          if (needed > 0) {
            const allocate = Math.min(remainingPool, needed);
            const updatedPaid = currentPaid + allocate;
            remainingPool -= allocate;

            const isDone = updatedPaid >= expected;

            await tx.contributionAssessment.update({
              where: { id: assess.id },
              data: {
                paidAmount: updatedPaid,
                surplusAmount: 0,
                status: isDone ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL,
              },
            });

            await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                contributionAssessmentId: assess.id,
                allocatedAmount: allocate,
                surplusAmount: 0,
              },
            });
          }
        }

        // If extra money still remains after covering all periods, store as advance credit balance!
        if (remainingPool > 0) {
          await tx.member.update({
            where: { id: input.memberId },
            data: {
              creditBalance: { increment: remainingPool },
            },
          });
        }
      } else if (input.targetType === 'EVENT_SUBEVENT') {
        if (!input.subEventId) {
          throw new Error('subEventId is required for EVENT_SUBEVENT');
        }

        let eventAssess = await tx.memberEventAssessment.findUnique({
          where: {
            subEventId_memberId: {
              subEventId: input.subEventId,
              memberId: input.memberId,
            },
          },
        });

        if (!eventAssess) {
          const subEvent = await tx.subEvent.findUniqueOrThrow({
            where: { id: input.subEventId },
          });

          eventAssess = await tx.memberEventAssessment.create({
            data: {
              subEventId: input.subEventId,
              memberId: input.memberId,
              assignedAmount: subEvent.defaultAmount,
              paidAmount: 0,
              status: AssessmentStatus.UNPAID,
              surplusAmount: 0,
            },
          });
        }

        const newPaid = Number(eventAssess.paidAmount) + input.amount;
        const assigned = Number(eventAssess.assignedAmount);
        let status: AssessmentStatus = AssessmentStatus.PAID;
        let surplus = 0;

        if (newPaid > assigned) {
          status = AssessmentStatus.SURPLUS;
          surplus = newPaid - assigned;
        } else if (newPaid === assigned) {
          status = AssessmentStatus.PAID;
        } else {
          status = AssessmentStatus.PARTIAL;
        }

        await tx.memberEventAssessment.update({
          where: { id: eventAssess.id },
          data: {
            paidAmount: newPaid,
            status,
            surplusAmount: surplus,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            eventAssessmentId: eventAssess.id,
            allocatedAmount: input.amount,
            surplusAmount: surplus,
          },
        });
      }

      return payment;
    });

    const member = await prisma.member.findUnique({ where: { id: input.memberId } });
    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    await recordAuditLog({
      tenantId,
      userId,
      actorName: req.user!.fullName,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.id,
      description: `${req.user!.fullName} recorded a payment of ${input.amount.toLocaleString()} RWF for ${member?.fullName || 'Member'} (${input.targetType.replace(/_/g, ' ')}) credited into "${account?.name}".`,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
