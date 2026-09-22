import { Router } from 'express';
import { Role } from '@keeper/shared';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getDebts,
  getDebtById,
  createDebt,
  recordDebtRepayment,
} from '../controllers/debt.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getDebts);
router.get('/:id', getDebtById);
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), createDebt);
router.post('/:id/repayments', requireRole(Role.ADMIN, Role.MANAGER), recordDebtRepayment);

export default router;
