import { PrismaClient, AssessmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Repairing existing Umusanzu surplus records...');

  const surplusAssessments = await prisma.contributionAssessment.findMany({
    where: {
      surplusAmount: { gt: 0 },
    },
    include: {
      period: {
        include: { plan: true },
      },
      member: true,
    },
  });

  console.log(`Found ${surplusAssessments.length} assessment(s) with surplus.`);

  for (const assess of surplusAssessments) {
    let surplusToDistribute = Number(assess.surplusAmount);
    console.log(`Processing ${assess.member.fullName}: ${surplusToDistribute} RWF surplus from ${assess.period.label}`);

    // Set surplusAmount on current assessment to 0 and fix paidAmount to expectedAmount
    const expected = Number(assess.expectedAmount);
    await prisma.contributionAssessment.update({
      where: { id: assess.id },
      data: {
        paidAmount: expected,
        surplusAmount: 0,
        status: AssessmentStatus.PAID,
      },
    });

    // Find subsequent periods of this plan
    const nextPeriods = await prisma.contributionPeriod.findMany({
      where: {
        planId: assess.period.planId,
        orderIndex: { gt: assess.period.orderIndex },
      },
      orderBy: { orderIndex: 'asc' },
    });

    for (const nextP of nextPeriods) {
      if (surplusToDistribute <= 0) break;

      let nextAssess = await prisma.contributionAssessment.findUnique({
        where: {
          periodId_memberId: {
            periodId: nextP.id,
            memberId: assess.memberId,
          },
        },
      });

      if (!nextAssess) {
        nextAssess = await prisma.contributionAssessment.create({
          data: {
            periodId: nextP.id,
            memberId: assess.memberId,
            expectedAmount: assess.period.plan.defaultAmount,
            paidAmount: 0,
            status: AssessmentStatus.UNPAID,
            surplusAmount: 0,
          },
        });
      }

      const exp = Number(nextAssess.expectedAmount);
      if (exp <= 0) continue; // Exempt

      const currentPaid = Number(nextAssess.paidAmount);
      const needed = Math.max(0, exp - currentPaid);

      if (needed > 0) {
        const allocate = Math.min(surplusToDistribute, needed);
        surplusToDistribute -= allocate;
        const newPaid = currentPaid + allocate;

        await prisma.contributionAssessment.update({
          where: { id: nextAssess.id },
          data: {
            paidAmount: newPaid,
            surplusAmount: 0,
            status: newPaid >= exp ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL,
          },
        });

        console.log(`  -> Rolled ${allocate} RWF into ${nextP.label} (Paid: ${newPaid}/${exp})`);
      }
    }

    // If still extra remaining, add to member creditBalance
    if (surplusToDistribute > 0) {
      await prisma.member.update({
        where: { id: assess.memberId },
        data: {
          creditBalance: { increment: surplusToDistribute },
        },
      });
      console.log(`  -> Credited remaining ${surplusToDistribute} RWF to ${assess.member.fullName} creditBalance.`);
    }
  }

  console.log('✅ Umusanzu surplus repair completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
