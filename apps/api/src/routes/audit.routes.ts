import { Router } from 'express';
import { getCommunityAuditLogs } from '../controllers/audit.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getCommunityAuditLogs);

export default router;
