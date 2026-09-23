import { Response, NextFunction } from 'express';
import { prisma, AssessmentStatus, AttendanceStatus } from '@keeper/database';
import { AuthenticatedRequest, getActiveTenantId } from '../middlewares/auth.middleware.js';

export const getWhatsAppSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = getActiveTenantId(req);
    const { type, id } = req.query;

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    let summaryText = '';

    if (type === 'UMUSANZU') {
      const plan = await prisma.contributionPlan.findFirst({
        where: { tenantId, isActive: true },
        include: {
          periods: {
            orderBy: { orderIndex: 'asc' },
            include: {
              assessments: {
                include: { member: true },
              },
            },
          },
        },
      });

      if (!plan || plan.periods.length === 0) {
        res.status(404).json({ message: 'No active plan found' });
        return;
      }

      const activePeriod = plan.periods[0]; // first or current period
      const paidMembers = activePeriod.assessments.filter(
        (a: any) => a.status === AssessmentStatus.PAID || a.status === AssessmentStatus.SURPLUS
      );
      const partialMembers = activePeriod.assessments.filter((a: any) => a.status === AssessmentStatus.PARTIAL);
      const unpaidMembers = activePeriod.assessments.filter((a: any) => a.status === AssessmentStatus.UNPAID);

      const totalExpected = activePeriod.assessments.reduce((s: number, a: any) => s + Number(a.expectedAmount), 0);
      const totalCollected = activePeriod.assessments.reduce((s: number, a: any) => s + Number(a.paidAmount), 0);
      const totalSurplus = activePeriod.assessments.reduce((s: number, a: any) => s + Number(a.surplusAmount), 0);
      const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      summaryText = `📊 *${tenant.name.toUpperCase()} - RAPORO Y'UMUSANZU*
📅 *Igihe:* ${activePeriod.label}
💰 *Umusanzu usanzwe:* ${Number(plan.defaultAmount).toLocaleString()} ${tenant.currency}
━━━━━━━━━━━━━━━━━━━
📈 *Incamake:*
• Amafaranga yinjiye: *${totalCollected.toLocaleString()} ${tenant.currency}* (${rate}%)
• Ayasigaye kwishyurwa: *${Math.max(0, totalExpected - totalCollected).toLocaleString()} ${tenant.currency}*
${totalSurplus > 0 ? `• Surplus (+): *+${totalSurplus.toLocaleString()} ${tenant.currency}*\n` : ''}
✅ *Abamaze kwishyura (${paidMembers.length}):*
${paidMembers.map((p: any, idx: number) => `${idx + 1}. ${p.member.fullName}${Number(p.surplusAmount) > 0 ? ` (+${Number(p.surplusAmount).toLocaleString()})` : ''}`).join('\n')}

${partialMembers.length > 0 ? `⚠️ *Abishyuye igice (${partialMembers.length}):*\n` + partialMembers.map((p: any, idx: number) => `${idx + 1}. ${p.member.fullName} (hasigaye: ${(Number(p.expectedAmount) - Number(p.paidAmount)).toLocaleString()} ${tenant.currency})`).join('\n') + '\n\n' : ''}${unpaidMembers.length > 0 ? `⏳ *Abatarishyura (${unpaidMembers.length}):*\n` + unpaidMembers.map((p: any, idx: number) => `${idx + 1}. ${p.member.fullName}`).join('\n') : ''}
━━━━━━━━━━━━━━━━━━━
_Raporo yakozwe na Keeper App kuri ${new Date().toLocaleDateString()}_`;
    } else if (type === 'EVENT' && id) {
      const event = await prisma.event.findFirst({
        where: { id: String(id), tenantId },
        include: {
          subEvents: {
            include: {
              assessments: { include: { member: true } },
            },
          },
          expenses: true,
        },
      });

      if (!event) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      let totalAssessed = 0;
      let totalCollected = 0;
      for (const se of event.subEvents) {
        for (const ass of se.assessments) {
          totalAssessed += Number(ass.assignedAmount);
          totalCollected += Number(ass.paidAmount);
        }
      }
      const totalExpenses = event.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);

      summaryText = `🎵 *${tenant.name.toUpperCase()}*
📌 *RAPORO Y'IGIKORWA: ${event.title.toUpperCase()}*
📅 *Itariki:* ${event.eventDate.toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━
💵 *Imibare y'imari:*
• Intego y'imisanzu: *${totalAssessed.toLocaleString()} ${tenant.currency}*
• Amafaranga yakiriwe: *${totalCollected.toLocaleString()} ${tenant.currency}*
• Ayasigaye hanze: *${Math.max(0, totalAssessed - totalCollected).toLocaleString()} ${tenant.currency}*
• Amafaranga yakoreshejwe (Expenses): *${totalExpenses.toLocaleString()} ${tenant.currency}*
• Asigaye kuri konti (Net): *${(totalCollected - totalExpenses).toLocaleString()} ${tenant.currency}*
━━━━━━━━━━━━━━━━━━━
_Keeper - Community Operations_`;
    } else if (type === 'ATTENDANCE' && id) {
      const session = await prisma.attendanceSession.findFirst({
        where: { id: String(id), tenantId },
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

      if (session.status === 'CANCELLED') {
        summaryText = `⚠️ *${tenant.name.toUpperCase()} - ITANGAZO RY'UBUTUMWA*
📌 *Gahunda:* ${session.title}
📅 *Itariki:* ${session.sessionDate.toLocaleDateString()}
❌ *Gahunda YAHAGAZITSE (CANCELLED)*
📝 *Impamvu:* ${session.cancellationReason || 'Nta mpamvu yatangajwe'}
━━━━━━━━━━━━━━━━━━━
_Keeper Disciplinary Committee_`;
      } else {
        const present = session.records.filter((r: any) => r.status === AttendanceStatus.PRESENT);
        const excused = session.records.filter((r: any) => r.status === AttendanceStatus.ABSENT_EXCUSED);
        const late = session.records.filter((r: any) => r.status === AttendanceStatus.LATE);
        const unexcused = session.records.filter((r: any) => r.status === AttendanceStatus.ABSENT_UNEXCUSED);

        summaryText = `📋 *${tenant.name.toUpperCase()} - RAPORO Y'UBWITABIRE*
📌 *Gahunda:* ${session.title}
📅 *Itariki:* ${session.sessionDate.toLocaleDateString()} ${session.startTime ? `(${session.startTime})` : ''}
━━━━━━━━━━━━━━━━━━━
👥 *Incamake:*
• Abaraho (Present): *${present.length}*
• Abasibye babiherewe uruhushya (Excused): *${excused.length}*
• Abakererewe (Late): *${late.length}*
• Abasibye nta ruhushya (Unexcused): *${unexcused.length}*

${excused.length > 0 ? `🟡 *Abafite impamvu yemewe:*\n` + excused.map((e: any) => `• ${e.member.fullName}: _${e.reasonNote || 'Nta bisobanuro'}_`).join('\n') + '\n\n' : ''}${unexcused.length > 0 ? `🔴 *Abasibye nta ruhushya:*\n` + unexcused.map((u: any) => `• ${u.member.fullName}`).join('\n') : ''}
━━━━━━━━━━━━━━━━━━━
_Raporo ya Discipline Committee | Keeper_`;
      }
    } else {
      res.status(400).json({ message: 'Specify a valid type (UMUSANZU, EVENT, ATTENDANCE)' });
      return;
    }

    res.json({ summaryText });
  } catch (error) {
    next(error);
  }
};
