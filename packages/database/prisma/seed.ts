import { PrismaClient, Role, Gender, MemberStatus, AccountType, PlanCycle, AssessmentStatus, EventStatus, TargetAudience, PaymentMethod, ExpenseCategory, SessionType, SessionStatus, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Keeper seed with Super Admin & Audit Logs...');

  // Clean all existing data
  await prisma.auditLog.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.expenseAccountSplit.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.memberEventAssessment.deleteMany({});
  await prisma.subEvent.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.contributionAssessment.deleteMany({});
  await prisma.contributionPeriod.deleteMany({});
  await prisma.contributionPlan.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 1. Create Communities (Tenants)
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Kigali Community Association',
      slug: 'kigali-community',
      currency: 'RWF',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Saint Luc Cultural Cooperative',
      slug: 'saint-luc-coop',
      currency: 'RWF',
    },
  });

  console.log('Created 2 communities:', tenant1.name, 'and', tenant2.name);

  // 2. Passwords
  const superAdminHashed = await bcrypt.hash('Keeper@Admin!@', 10);
  const commonHashed = await bcrypt.hash('password123', 10);

  // SUPER ADMIN (as specifically requested)
  const superAdmin = await prisma.user.create({
    data: {
      tenantId: null, // Global Platform Admin
      email: 'ishimwejustin67@gmail.com',
      passwordHash: superAdminHashed,
      fullName: 'Justin Ishimwe (Platform Super Admin)',
      phone: '+250788990011',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log('Created Super Admin:', superAdmin.email);

  // Chorale de Kigali Users
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'admin@keeper.rw',
      passwordHash: commonHashed,
      fullName: 'Jean-Paul Mugisha (President)',
      phone: '+250788112233',
      role: Role.ADMIN,
    },
  });

  const accountantUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'accountant@keeper.rw',
      passwordHash: commonHashed,
      fullName: 'Aline Umutoni (Treasurer & Accountant)',
      phone: '+250788223344',
      role: Role.MANAGER,
    },
  });

  const disciplinaryUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'discipline@keeper.rw',
      passwordHash: commonHashed,
      fullName: 'David Nkurunziza (Discipline Officer)',
      phone: '+250788334455',
      role: Role.MANAGER,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      tenantId: tenant1.id,
      email: 'member@keeper.rw',
      passwordHash: commonHashed,
      fullName: 'Marie Uwase (Community Member)',
      phone: '+250788445566',
      role: Role.VIEWER,
    },
  });

  // Saint Luc Community Users
  const saintLucAdmin = await prisma.user.create({
    data: {
      tenantId: tenant2.id,
      email: 'admin@saintluc.rw',
      passwordHash: commonHashed,
      fullName: 'Gisele Uwimbabazi (Director)',
      phone: '+250788556677',
      role: Role.ADMIN,
    },
  });

  console.log('Created community users');

  // 3. Accounts for Chorale de Kigali
  const umusanzuAccount = await prisma.account.create({
    data: {
      tenantId: tenant1.id,
      name: 'Main Umusanzu Fund',
      type: AccountType.GENERAL_DUES,
      balance: 1850000,
      isDefault: true,
      description: 'Account holding recurring monthly contributions',
    },
  });

  const concertAccount = await prisma.account.create({
    data: {
      tenantId: tenant1.id,
      name: 'Easter Concert 2026 Fund',
      type: AccountType.EVENT_PROJECT,
      balance: 650000,
      description: 'Designated account for Easter concert and uniforms',
    },
  });

  const momoAccount = await prisma.account.create({
    data: {
      tenantId: tenant1.id,
      name: 'Treasurer MoMo Cashbox',
      type: AccountType.MOBILE_MONEY,
      accountNumber: '*182*8*1*042#',
      balance: 420000,
      description: 'Mobile money cashbox for collections & spontaneous expenses',
    },
  });

  const bankAccount = await prisma.account.create({
    data: {
      tenantId: tenant1.id,
      name: 'Bank of Kigali Operating',
      type: AccountType.BANK_ACCOUNT,
      accountNumber: '00042-12345678-90',
      balance: 3500000,
      description: 'Main bank account for official transfers and investments',
    },
  });

  // Account for Saint Luc
  await prisma.account.create({
    data: {
      tenantId: tenant2.id,
      name: 'Saint Luc General Treasury',
      type: AccountType.GENERAL_DUES,
      balance: 950000,
      isDefault: true,
    },
  });

  // 4. Members for Kigali Community Association
  const memberData = [
    { fullName: 'Eric Manzi', gender: Gender.MALE, code: 'MEM-001', phone: '+250788100001' },
    { fullName: 'Alice Mutoni', gender: Gender.FEMALE, code: 'MEM-002', phone: '+250788100002' },
    { fullName: 'Gaston Habimana', gender: Gender.MALE, code: 'MEM-003', phone: '+250788100003' },
    { fullName: 'Clarisse Keza', gender: Gender.FEMALE, code: 'MEM-004', phone: '+250788100004' },
    { fullName: 'Patrick Bizimana', gender: Gender.MALE, code: 'MEM-005', phone: '+250788100005' },
    { fullName: 'Solange Uwera', gender: Gender.FEMALE, code: 'MEM-006', phone: '+250788100006' },
    { fullName: 'Innocent Niyitegeka', gender: Gender.MALE, code: 'MEM-007', phone: '+250788100007' },
    { fullName: 'Diane Mukamana', gender: Gender.FEMALE, code: 'MEM-008', phone: '+250788100008' },
    { fullName: 'Emmanuel Nshimiyimana', gender: Gender.MALE, code: 'MEM-009', phone: '+250788100009' },
    { fullName: 'Grace Uwimana', gender: Gender.FEMALE, code: 'MEM-010', phone: '+250788100010' },
    { fullName: 'Claude Twahirwa', gender: Gender.MALE, code: 'MEM-011', phone: '+250788100011' },
    { fullName: 'Honorine Ingabire', gender: Gender.FEMALE, code: 'MEM-012', phone: '+250788100012' },
    { fullName: 'Jean-Damascene Rukundo', gender: Gender.MALE, code: 'MEM-013', phone: '+250788100013' },
    { fullName: 'Fiona Ishimwe', gender: Gender.FEMALE, code: 'MEM-014', phone: '+250788100014' },
    { fullName: 'Aimable Kwizera', gender: Gender.MALE, code: 'MEM-015', phone: '+250788100015' },
    { fullName: 'Nathalie Mukeshimana', gender: Gender.FEMALE, code: 'MEM-016', phone: '+250788100016' },
    { fullName: 'Pacifique Tuyishime', gender: Gender.MALE, code: 'MEM-017', phone: '+250788100017' },
    { fullName: 'Yvette Uwase', gender: Gender.FEMALE, code: 'MEM-018', phone: '+250788100018' },
    { fullName: 'Fabrice Mugisha', gender: Gender.MALE, code: 'MEM-019', phone: '+250788100019' },
    { fullName: 'Sandrine Gasana', gender: Gender.FEMALE, code: 'MEM-020', phone: '+250788100020' },
  ];

  const members = [];
  for (const m of memberData) {
    const created = await prisma.member.create({
      data: {
        tenantId: tenant1.id,
        fullName: m.fullName,
        gender: m.gender,
        membershipCode: m.code,
        phone: m.phone,
        status: MemberStatus.ACTIVE,
        joinedDate: new Date('2024-01-15'),
      },
    });
    members.push(created);
  }

  // 5. Umusanzu Plan (2026 Annual Plan)
  const plan = await prisma.contributionPlan.create({
    data: {
      tenantId: tenant1.id,
      title: 'Umusanzu 2026 (Monthly Dues)',
      cycle: PlanCycle.MONTHLY,
      defaultAmount: 5000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      targetAccountId: umusanzuAccount.id,
      isActive: true,
    },
  });

  const monthNames = [
    'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026',
    'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026',
    'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
  ];

  const periods = [];
  for (let i = 0; i < 12; i++) {
    const period = await prisma.contributionPeriod.create({
      data: {
        planId: plan.id,
        label: monthNames[i],
        orderIndex: i + 1,
        dueDate: new Date(2026, i, 28),
      },
    });
    periods.push(period);
  }

  for (const period of periods) {
    for (const member of members) {
      await prisma.contributionAssessment.create({
        data: {
          periodId: period.id,
          memberId: member.id,
          expectedAmount: 5000,
          paidAmount: 0,
          status: AssessmentStatus.UNPAID,
          surplusAmount: 0,
        },
      });
    }
  }

  // - Eric Manzi (KOR-001): Paid whole year in advance! (60,000 RWF)
  const advancePayment = await prisma.payment.create({
    data: {
      tenantId: tenant1.id,
      memberId: members[0].id,
      accountId: umusanzuAccount.id,
      amount: 60000,
      paymentDate: new Date('2026-01-05'),
      method: PaymentMethod.MOBILE_MONEY,
      referenceNumber: 'ADV-2026-YEAR-001',
      notes: 'Paid entire year 2026 Umusanzu in advance at once',
      recordedByUserId: accountantUser.id,
    },
  });

  for (const period of periods) {
    const assessment = await prisma.contributionAssessment.findUniqueOrThrow({
      where: {
        periodId_memberId: {
          periodId: period.id,
          memberId: members[0].id,
        },
      },
    });

    await prisma.contributionAssessment.update({
      where: { id: assessment.id },
      data: {
        paidAmount: 5000,
        status: AssessmentStatus.PAID,
      },
    });

    await prisma.paymentAllocation.create({
      data: {
        paymentId: advancePayment.id,
        contributionAssessmentId: assessment.id,
        allocatedAmount: 5000,
      },
    });
  }

  // - Alice Mutoni (KOR-002): Paid with SURPLUS in Jan (7,000 RWF -> +2,000 surplus)
  const surplusPayment = await prisma.payment.create({
    data: {
      tenantId: tenant1.id,
      memberId: members[1].id,
      accountId: umusanzuAccount.id,
      amount: 7000,
      paymentDate: new Date('2026-01-12'),
      method: PaymentMethod.MOBILE_MONEY,
      referenceNumber: 'MM-772910',
      notes: 'Paid 7,000 RWF with 2,000 surplus credit',
      recordedByUserId: accountantUser.id,
    },
  });

  const aliceJanAssessment = await prisma.contributionAssessment.findUniqueOrThrow({
    where: {
      periodId_memberId: {
        periodId: periods[0].id,
        memberId: members[1].id,
      },
    },
  });

  await prisma.contributionAssessment.update({
    where: { id: aliceJanAssessment.id },
    data: {
      paidAmount: 7000,
      surplusAmount: 2000,
      status: AssessmentStatus.SURPLUS,
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: surplusPayment.id,
      contributionAssessmentId: aliceJanAssessment.id,
      allocatedAmount: 5000,
      surplusAmount: 2000,
    },
  });

  // - Members 2 to 14: Paid Jan and Feb in full
  for (let mIdx = 2; mIdx <= 14; mIdx++) {
    for (let pIdx = 0; pIdx < 2; pIdx++) {
      const p = await prisma.payment.create({
        data: {
          tenantId: tenant1.id,
          memberId: members[mIdx].id,
          accountId: umusanzuAccount.id,
          amount: 5000,
          paymentDate: new Date(2026, pIdx, 15),
          method: PaymentMethod.MOBILE_MONEY,
          referenceNumber: `MM-${100000 + mIdx * 10 + pIdx}`,
          recordedByUserId: accountantUser.id,
        },
      });

      const assess = await prisma.contributionAssessment.findUniqueOrThrow({
        where: {
          periodId_memberId: {
            periodId: periods[pIdx].id,
            memberId: members[mIdx].id,
          },
        },
      });

      await prisma.contributionAssessment.update({
        where: { id: assess.id },
        data: {
          paidAmount: 5000,
          status: AssessmentStatus.PAID,
        },
      });

      await prisma.paymentAllocation.create({
        data: {
          paymentId: p.id,
          contributionAssessmentId: assess.id,
          allocatedAmount: 5000,
        },
      });
    }
  }

  // 6. Events & Sub-events
  const concert = await prisma.event.create({
    data: {
      tenantId: tenant1.id,
      title: 'Annual Community Assembly & Cultural Gala 2026',
      eventDate: new Date('2026-04-12T15:00:00Z'),
      location: 'Kigali Cultural Village Conference Hall',
      status: EventStatus.ACTIVE,
      description: 'Annual community general assembly featuring project reports, exhibitions, and member recognitions',
    },
  });

  const uniformMen = await prisma.subEvent.create({
    data: {
      eventId: concert.id,
      title: 'Gala Formal Attire (Men - Blazers & Trousers)',
      targetAudience: TargetAudience.MEN_ONLY,
      defaultAmount: 25000,
      targetAccountId: concertAccount.id,
    },
  });

  const uniformWomen = await prisma.subEvent.create({
    data: {
      eventId: concert.id,
      title: 'Gala Formal Attire (Women - Traditional Imishanana)',
      targetAudience: TargetAudience.WOMEN_ONLY,
      defaultAmount: 30000,
      targetAccountId: concertAccount.id,
    },
  });

  const venueContrib = await prisma.subEvent.create({
    data: {
      eventId: concert.id,
      title: 'Venue & Technical Sound Contribution',
      targetAudience: TargetAudience.ALL,
      defaultAmount: 10000,
      targetAccountId: concertAccount.id,
    },
  });

  for (const m of members) {
    await prisma.memberEventAssessment.create({
      data: {
        subEventId: venueContrib.id,
        memberId: m.id,
        assignedAmount: 10000,
        paidAmount: 10000,
        status: AssessmentStatus.PAID,
      },
    });

    if (m.gender === Gender.MALE) {
      await prisma.memberEventAssessment.create({
        data: {
          subEventId: uniformMen.id,
          memberId: m.id,
          assignedAmount: 25000,
          paidAmount: 25000,
          status: AssessmentStatus.PAID,
        },
      });
    } else {
      await prisma.memberEventAssessment.create({
        data: {
          subEventId: uniformWomen.id,
          memberId: m.id,
          assignedAmount: 30000,
          paidAmount: 15000,
          status: AssessmentStatus.PARTIAL,
        },
      });
    }
  }

  // 7. Expenses
  await prisma.expense.create({
    data: {
      tenantId: tenant1.id,
      title: 'Professional Facilitator Retainer (Jan 2026)',
      category: ExpenseCategory.FACILITATOR_TRAINER,
      amount: 150000,
      expenseDate: new Date('2026-01-31'),
      isPlanned: true,
      vendorName: 'Jean-Claude Ndayisaba (Consultant & Trainer)',
      recordedByUserId: accountantUser.id,
      splits: {
        create: [{ accountId: umusanzuAccount.id, amount: 150000 }],
      },
    },
  });

  await prisma.expense.create({
    data: {
      tenantId: tenant1.id,
      eventId: concert.id,
      title: 'Bulk Materials & Textiles for Community Gala',
      category: ExpenseCategory.MATERIALS_SUPPLIES,
      amount: 400000,
      expenseDate: new Date('2026-02-10'),
      isPlanned: true,
      vendorName: 'Utexrwa Textile Mills Kigali',
      recordedByUserId: accountantUser.id,
      splits: {
        create: [
          { accountId: concertAccount.id, amount: 250000 },
          { accountId: momoAccount.id, amount: 150000 },
        ],
      },
    },
  });

  // 8. Attendance Sessions
  const session1 = await prisma.attendanceSession.create({
    data: {
      tenantId: tenant1.id,
      title: 'Tuesday General Coordination & Planning Assembly',
      sessionType: SessionType.REGULAR_MEETING,
      sessionDate: new Date('2026-02-17T18:00:00Z'),
      startTime: '18:00',
      endTime: '20:00',
      isRecurring: true,
      recurrenceRule: 'WEEKLY_TUESDAY',
      status: SessionStatus.COMPLETED,
      recordedByUserId: disciplinaryUser.id,
      notes: 'Reviewed community agenda and project milestones',
    },
  });

  for (let i = 0; i < members.length; i++) {
    let status = AttendanceStatus.PRESENT;
    let reasonNote: string | undefined = undefined;

    if (i === 3) {
      status = AttendanceStatus.ABSENT_EXCUSED;
      reasonNote = 'Hospital nursing night shift duty - officially approved';
    } else if (i === 8) {
      status = AttendanceStatus.LATE;
      reasonNote = 'Arrived 35 minutes late due to Nyabugogo traffic jam';
    } else if (i === 17) {
      status = AttendanceStatus.ABSENT_UNEXCUSED;
      reasonNote = 'No prior notice or explanation submitted';
    }

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session1.id,
        memberId: members[i].id,
        status,
        reasonNote,
        checkInTime: status === AttendanceStatus.PRESENT ? new Date('2026-02-17T17:55:00Z') : null,
      },
    });
  }

  // Cancelled session
  await prisma.attendanceSession.create({
    data: {
      tenantId: tenant1.id,
      title: 'Thursday Community Project Workshop',
      sessionType: SessionType.WORKSHOP_TRAINING,
      sessionDate: new Date('2026-02-19T17:30:00Z'),
      startTime: '17:30',
      endTime: '19:30',
      isRecurring: true,
      recurrenceRule: 'WEEKLY_THURSDAY',
      status: SessionStatus.CANCELLED,
      cancellationReason: 'Flash torrential rainstorm causing road flooding across Kigali. Executive committee called off session for member safety.',
      recordedByUserId: disciplinaryUser.id,
    },
  });

  // 9. HUMAN-READABLE AUDIT LOGS (as specifically requested)
  console.log('Seeding human-readable audit log entries...');

  const auditData = [
    {
      tenantId: null,
      userId: superAdmin.id,
      actorName: superAdmin.fullName,
      action: 'PLATFORM_INITIALIZED',
      entityType: 'Platform',
      description: 'Justin Ishimwe initialized the Keeper platform environment and root configuration.',
      timestamp: new Date('2026-01-01T08:00:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: adminUser.id,
      actorName: adminUser.fullName,
      action: 'COMMUNITY_CREATED',
      entityType: 'Tenant',
      description: 'Jean-Paul Mugisha established the workspace for "Kigali Community Association".',
      timestamp: new Date('2026-01-01T09:00:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: accountantUser.id,
      actorName: accountantUser.fullName,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      description: 'Aline Umutoni (Treasurer) recorded advance annual payment of 60,000 RWF for Eric Manzi (Year 2026 in advance) credited into "Main Umusanzu Fund".',
      timestamp: new Date('2026-01-05T10:30:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: accountantUser.id,
      actorName: accountantUser.fullName,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      description: 'Aline Umutoni (Treasurer) recorded payment of 7,000 RWF for Alice Mutoni with +2,000 RWF surplus credit towards January 2026 dues into "Main Umusanzu Fund".',
      timestamp: new Date('2026-01-12T14:15:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: accountantUser.id,
      actorName: accountantUser.fullName,
      action: 'EXPENSE_RECORDED',
      entityType: 'Expense',
      description: 'Aline Umutoni (Treasurer) recorded planned expense "Professional Facilitator Retainer" of 150,000 RWF debited from "Main Umusanzu Fund".',
      timestamp: new Date('2026-01-31T16:00:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: accountantUser.id,
      actorName: accountantUser.fullName,
      action: 'SPLIT_EXPENSE_RECORDED',
      entityType: 'Expense',
      description: 'Aline Umutoni (Treasurer) executed multi-account expense "Bulk Materials & Textiles for Community Gala" of 400,000 RWF (split: 250,000 RWF from "Gala Project Fund" + 150,000 RWF from "Treasurer MoMo Cashbox").',
      timestamp: new Date('2026-02-10T11:20:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: disciplinaryUser.id,
      actorName: disciplinaryUser.fullName,
      action: 'SESSION_CANCELLED',
      entityType: 'AttendanceSession',
      description: 'David Nkurunziza (Discipline) cancelled Thursday workshop due to "Flash torrential rainstorm causing road flooding across Kigali".',
      timestamp: new Date('2026-02-19T16:45:00Z'),
    },
    {
      tenantId: tenant1.id,
      userId: disciplinaryUser.id,
      actorName: disciplinaryUser.fullName,
      action: 'ATTENDANCE_FINALIZED',
      entityType: 'AttendanceSession',
      description: 'David Nkurunziza (Discipline) finalized attendance roster for "Tuesday General Coordination & Planning Assembly" (17 present, 1 late, 1 excused with reason, 1 unexcused).',
      timestamp: new Date('2026-02-17T20:35:00Z'),
    },
    {
      tenantId: tenant2.id,
      userId: saintLucAdmin.id,
      actorName: saintLucAdmin.fullName,
      action: 'COMMUNITY_CREATED',
      entityType: 'Tenant',
      description: 'Gisele Uwimbabazi registered "Saint Luc Cultural Cooperative" community on the Keeper platform.',
      timestamp: new Date('2026-02-01T10:00:00Z'),
    },
  ];

  for (const log of auditData) {
    await prisma.auditLog.create({
      data: log,
    });
  }

  console.log(`Created ${auditData.length} human-readable audit logs`);
  console.log('✅ Keeper seed successfully finished!');
  console.log('Super Admin credentials:');
  console.log('  Super Admin: ishimwejustin67@gmail.com / Keeper@Admin!@');
  console.log('Community credentials:');
  console.log('  Admin:       admin@keeper.rw / password123');
  console.log('  Treasurer:   accountant@keeper.rw / password123');
  console.log('  Discipline:  discipline@keeper.rw / password123');
  console.log('  Member:      member@keeper.rw / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
