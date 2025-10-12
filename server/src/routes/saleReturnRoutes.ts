import { Router } from 'express';
import saleReturnController from '../controllers/saleReturnController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// جميع المسارات تحتاج authentication
router.use(authenticateToken);

// التحقق من صلاحية الفاتورة للمرتجع
router.get('/validate-sale/:saleId', saleReturnController.validateSale);

// الحصول على الإحصائيات
router.get('/stats', saleReturnController.getReturnStats);

// الحصول على جميع المرتجعات
router.get('/', saleReturnController.getReturns);

// الحصول على مرتجع واحد
router.get('/:id', saleReturnController.getReturnById);

// إنشاء مرتجع جديد
router.post('/', saleReturnController.createReturn);

// تحديث حالة المرتجع
router.patch('/:id/status', saleReturnController.updateReturnStatus);

// معالجة المرتجع (إرجاع المخزون)
router.post('/:id/process', saleReturnController.processReturn);

// حذف مرتجع
router.delete('/:id', saleReturnController.deleteReturn);

export default router;
