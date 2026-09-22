import { Router } from 'express';
import {
  getPlatformMetrics,
  getAllUsers,
  getGlobalAuditLogs,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.SUPER_ADMIN));

router.get('/metrics', getPlatformMetrics);
router.get('/users', getAllUsers);
router.get('/audit-logs', getGlobalAuditLogs);

export default router;
