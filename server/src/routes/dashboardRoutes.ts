import { Router } from 'express';
import DashboardController from '../controllers/DashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// إحصائيات مبيعات المستخدمين
router.get('/users-sales', authenticateToken, DashboardController.getUsersSalesStats);

// بيانات الرسم البياني الشامل
router.get('/comprehensive-chart', authenticateToken, DashboardController.getComprehensiveChartData);

export default router;

