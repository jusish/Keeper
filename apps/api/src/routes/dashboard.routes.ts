import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/metrics', getDashboardMetrics);

export default router;
