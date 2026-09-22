import { Router } from 'express';
import { getExpenses, recordExpense } from '../controllers/expense.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/', getExpenses);
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), recordExpense);

export default router;
