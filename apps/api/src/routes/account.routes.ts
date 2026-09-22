import { Router } from 'express';
import {
  getAccounts,
  createAccount,
  getAccountLedger,
} from '../controllers/account.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/', getAccounts);
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), createAccount);
router.get('/:id/ledger', getAccountLedger);

export default router;
