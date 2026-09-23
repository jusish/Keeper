import { Router } from 'express';
import {
  getPlatformMetrics,
  getAllUsers,
  getGlobalAuditLogs,
  createCommunity,
  toggleUserStatus,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.SUPER_ADMIN));

router.get('/metrics', getPlatformMetrics);
router.get('/users', getAllUsers);
router.get('/audit-logs', getGlobalAuditLogs);
router.post('/communities', createCommunity);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
