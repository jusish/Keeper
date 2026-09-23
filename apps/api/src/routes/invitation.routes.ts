import { Router } from 'express';
import {
  createInvitation,
  getInvitations,
  resendInvitation,
  validateInvitationToken,
  acceptInvitation,
} from '../controllers/invitation.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

// Public routes (for invitees clicking email link)
router.get('/validate', validateInvitationToken);
router.post('/accept', acceptInvitation);

// Protected routes (for tenant admins)
router.use(requireAuth);
router.use(requireRole(Role.ADMIN, Role.SUPER_ADMIN));

router.post('/', createInvitation);
router.get('/', getInvitations);
router.post('/:id/resend', resendInvitation);

export default router;
