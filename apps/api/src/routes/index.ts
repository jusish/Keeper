import { Router } from 'express';
import authRoutes from './auth.routes.js';
import memberRoutes from './member.routes.js';
import accountRoutes from './account.routes.js';
import contributionRoutes from './contribution.routes.js';
import eventRoutes from './event.routes.js';
import expenseRoutes from './expense.routes.js';
import attendanceRoutes from './attendance.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import auditRoutes from './audit.routes.js';
import debtRoutes from './debt.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Keeper API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/accounts', accountRoutes);
router.use('/contributions', contributionRoutes);
router.use('/events', eventRoutes);
router.use('/expenses', expenseRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/audit', auditRoutes);
router.use('/debts', debtRoutes);

export default router;
