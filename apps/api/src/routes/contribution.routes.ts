import { Router } from 'express';
import {
  getPlans,
  createPlan,
  getMatrix,
  recordPayment,
} from '../controllers/contribution.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/plans', getPlans);
router.post('/plans', requireRole(Role.ADMIN, Role.MANAGER), createPlan);
router.get('/matrix', getMatrix);
router.post('/payments', requireRole(Role.ADMIN, Role.MANAGER), recordPayment);

export default router;
