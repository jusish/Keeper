import { Router } from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from '../controllers/member.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/', getMembers);
router.get('/:id', getMemberById);
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), createMember);
router.put('/:id', requireRole(Role.ADMIN, Role.MANAGER), updateMember);
router.delete('/:id', requireRole(Role.ADMIN), deleteMember);

export default router;
