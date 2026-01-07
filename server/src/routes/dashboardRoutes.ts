import { Router } from 'express';
import DashboardController from '../controllers/DashboardController';

const router = Router();

// إحصائيات مبيعات المستخدمين
router.get('/users-sales', DashboardController.getUsersSalesStats);

// بيانات الرسم البياني الشامل
router.get('/comprehensive-chart', DashboardController.getComprehensiveChartData);

export default router;

