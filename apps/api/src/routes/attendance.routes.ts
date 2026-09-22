import { Router } from 'express';
import {
  getSessions,
  getSessionById,
  createSession,
  markAttendance,
  cancelSession,
} from '../controllers/attendance.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/sessions', getSessions);
router.get('/sessions/:id', getSessionById);
router.post('/sessions', requireRole(Role.ADMIN, Role.MANAGER), createSession);
router.post(
  '/sessions/:id/mark',
  requireRole(Role.ADMIN, Role.MANAGER),
  markAttendance
);
router.post(
  '/sessions/:id/cancel',
  requireRole(Role.ADMIN, Role.MANAGER),
  cancelSession
);

export default router;
