import { Router } from 'express';
import {
  getEvents,
  getEventSettlement,
  createEvent,
  updateAssessment,
} from '../controllers/event.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { Role } from '@keeper/shared';

const router = Router();

router.use(authenticate);

router.get('/', getEvents);
router.get('/:id/settlement', getEventSettlement);
router.post('/', requireRole(Role.ADMIN, Role.MANAGER), createEvent);
router.put(
  '/assessments/:assessmentId',
  requireRole(Role.ADMIN, Role.MANAGER),
  updateAssessment
);

export default router;
