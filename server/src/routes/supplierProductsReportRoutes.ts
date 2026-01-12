import { Router } from 'express';
import { SupplierProductsReportController } from '../controllers/SupplierProductsReportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new SupplierProductsReportController();

// جميع المسارات تتطلب المصادقة
router.use(authenticateToken);

// الحصول على قائمة الموردين الذين لديهم فواتير بضاعة
router.get('/suppliers', controller.getSuppliersWithPurchases.bind(controller));

// الحصول على المديونية لمورد معين
router.get('/:supplierId/debt', controller.getSupplierDebt.bind(controller));

// الحصول على التقرير الكامل لمورد معين
router.get('/:supplierId', controller.getSupplierReport.bind(controller));

export default router;

