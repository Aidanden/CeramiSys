import { Router } from 'express';
import { DamageReportController } from '../controllers/DamageReportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const damageReportController = new DamageReportController();

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// إنشاء محضر إتلاف
router.post('/', damageReportController.createDamageReport);

// الحصول على قائمة محاضر الإتلاف
router.get('/', damageReportController.getDamageReports);

// الحصول على إحصائيات محاضر الإتلاف
router.get('/stats', damageReportController.getDamageReportStats);

// الحصول على محضر إتلاف واحد
router.get('/:id', damageReportController.getDamageReportById);

// حذف محضر إتلاف
router.delete('/:id', damageReportController.deleteDamageReport);

export default router;
