/**
 * Activity Routes
 * مسارات الأنشطة
 */

import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const activityController = new ActivityController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

/**
 * @route GET /api/activities/recent
 * @desc الحصول على الأنشطة الأخيرة
 * @access Private
 * @query limit
 */
router.get('/recent', (req, res) => activityController.getRecentActivities(req, res));

export default router;

