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

// Overview & Metrics aliases
router.get('/metrics', getPlatformMetrics);
router.get('/overview', getPlatformMetrics);
router.get('/communities', getPlatformMetrics);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);

// Audit Trail aliases
router.get('/audit', getGlobalAuditLogs);
router.get('/audit-logs', getGlobalAuditLogs);

// Community Management
router.post('/communities', createCommunity);

export default router;
