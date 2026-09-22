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
          assessmentsData.push({
            periodId: period.id,
            memberId: member.id,
            expectedAmount: input.defaultAmount,
            paidAmount: 0,
            status: AssessmentStatus.UNPAID,
            surplusAmount: 0,
          });
        }
      }

      if (assessmentsData.length > 0) {
        await tx.contributionAssessment.createMany({
          data: assessmentsData,
        });
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
          periods: { orderBy: { orderIndex: 'asc' } },
        },
      });
    } else {
      // Default to active plan or most recent
      targetPlan = await prisma.contributionPlan.findFirst({
        where: { tenantId, isActive: true },
        include: {
          periods: { orderBy: { orderIndex: 'asc' } },
        },
        orderBy: { startDate: 'desc' },
      });
    }

    if (!targetPlan) {
      res.status(404).json({ message: 'No contribution plan found' });
      return;
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
      orderBy: [{ voicePart: 'asc' }, { fullName: 'asc' }],
    });

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
    let grandTotalRemaining = 0;

    const rows = members.map((member) => {
      const cells: Record<string, any> = {};
      let totalPaid = 0;
      let totalExpected = 0;
      let totalSurplus = 0;
      let totalRemaining = 0;

      for (const p of periods) {
        const assess = member.assessments.find((a) => a.periodId === p.id);
        const expected = assess ? Number(assess.expectedAmount) : Number(targetPlan.defaultAmount);
        const paid = assess ? Number(assess.paidAmount) : 0;
        const surplus = assess ? Number(assess.surplusAmount) : 0;
        const remaining = Math.max(0, expected - paid);
        const status = assess ? assess.status : AssessmentStatus.UNPAID;

        cells[p.id] = {
          assessmentId: assess?.id,
          periodId: p.id,
          expectedAmount: expected,
          paidAmount: paid,
          surplusAmount: surplus,
          remainingAmount: remaining,
          status,
        };

        totalPaid += paid;
        totalExpected += expected;
        totalSurplus += surplus;
        totalRemaining += remaining;

        // Add to period summary
        totalsByPeriod[p.id].expected += expected;
        totalsByPeriod[p.id].collected += paid;
        totalsByPeriod[p.id].surplus += surplus;
        totalsByPeriod[p.id].remaining += remaining;
      }

      grandTotalExpected += totalExpected;
      grandTotalCollected += totalPaid;
      grandTotalSurplus += totalSurplus;
      grandTotalRemaining += totalRemaining;

      let overallStatus: AssessmentStatus = AssessmentStatus.UNPAID;
      if (totalPaid >= totalExpected && totalSurplus > 0) {
        overallStatus = AssessmentStatus.SURPLUS;
      } else if (totalPaid >= totalExpected) {
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
          voicePart: member.voicePart,
          status: member.status,
          creditBalance: Number(member.creditBalance),
          createdAt: member.createdAt.toISOString(),
        },
        cells,
        totalPaid,
        totalExpected,
        totalSurplus,
        totalRemaining,
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
      grandTotalSurplus,
      grandTotalRemaining,
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

        let assessment = await tx.contributionAssessment.findUnique({
          where: {
            periodId_memberId: {
              periodId: input.periodId,
              memberId: input.memberId,
            },
          },
        });

        if (!assessment) {
          // Fallback create assessment
          const period = await tx.contributionPeriod.findUniqueOrThrow({
            where: { id: input.periodId },
            include: { plan: true },
          });

          assessment = await tx.contributionAssessment.create({
            data: {
              periodId: input.periodId,
              memberId: input.memberId,
              expectedAmount: period.plan.defaultAmount,
              paidAmount: 0,
              status: AssessmentStatus.UNPAID,
              surplusAmount: 0,
            },
          });
        }

        const newPaidAmount = Number(assessment.paidAmount) + input.amount;
        const expected = Number(assessment.expectedAmount);
        let status: AssessmentStatus = AssessmentStatus.PAID;
        let surplus = 0;

        if (newPaidAmount > expected) {
          status = AssessmentStatus.SURPLUS;
          surplus = newPaidAmount - expected;
        } else if (newPaidAmount === expected) {
          status = AssessmentStatus.PAID;
        } else {
          status = AssessmentStatus.PARTIAL;
        }

        await tx.contributionAssessment.update({
          where: { id: assessment.id },
          data: {
            paidAmount: newPaidAmount,
            status,
            surplusAmount: surplus,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            contributionAssessmentId: assessment.id,
            allocatedAmount: input.amount,
            surplusAmount: surplus,
          },
        });
      } else if (input.targetType === 'UMUSANZU_YEAR_ADVANCE') {
        // Distribute amount across periods sequentially
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

          const currentPaid = Number(assess.paidAmount);
          const expected = Number(assess.expectedAmount);
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
                status: isDone ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL,
              },
            });

            await tx.paymentAllocation.create({
              data: {
                paymentId: payment.id,
                contributionAssessmentId: assess.id,
                allocatedAmount: allocate,
              },
            });
          }
        }

        // If extra money still remains after covering all periods, record as surplus on last period
        if (remainingPool > 0 && plan.periods.length > 0) {
          const lastPeriod = plan.periods[plan.periods.length - 1];
          const lastAssess = await tx.contributionAssessment.findUniqueOrThrow({
            where: {
              periodId_memberId: {
                periodId: lastPeriod.id,
                memberId: input.memberId,
              },
            },
          });

          await tx.contributionAssessment.update({
            where: { id: lastAssess.id },
            data: {
              paidAmount: { increment: remainingPool },
              surplusAmount: { increment: remainingPool },
              status: AssessmentStatus.SURPLUS,
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
