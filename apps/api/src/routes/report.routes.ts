import { Router } from 'express';
import { getWhatsAppSummary } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/whatsapp-summary', getWhatsAppSummary);

export default router;
