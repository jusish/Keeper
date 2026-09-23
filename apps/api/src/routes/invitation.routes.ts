import { Router } from 'express';
import {
  createInvitation,
  getInvitations,
  resendInvitation,
  validateInvitationToken,
  acceptInvitation,
  getTenantUsers,
  deleteInvitation,
  updateTenantUserRole,
} from '../controllers/invitation.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

// Public routes (for invitees clicking email link)
router.get('/validate', validateInvitationToken);
router.post('/accept', acceptInvitation);

// Protected routes (for tenant admins and managers)
router.use(requireAuth);

// Team Users
router.get('/users', getTenantUsers);
router.patch('/users/:id/role', requireRole(Role.ADMIN, Role.SUPER_ADMIN), updateTenantUserRole);

// Invitations
router.get('/', getInvitations);
router.post('/', requireRole(Role.ADMIN, Role.SUPER_ADMIN), createInvitation);
router.post('/:id/resend', requireRole(Role.ADMIN, Role.SUPER_ADMIN), resendInvitation);
router.delete('/:id', requireRole(Role.ADMIN, Role.SUPER_ADMIN), deleteInvitation);

export default router;
