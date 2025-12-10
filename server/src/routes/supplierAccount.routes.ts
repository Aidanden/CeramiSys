import { Router } from 'express';
import supplierAccountController from '../controllers/supplierAccount.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

// جلب ملخص جميع حسابات الموردين
router.get('/summary', supplierAccountController.getAllSuppliersAccountSummary);

// جلب تفاصيل حساب مورد واحد
router.get('/:supplierId', supplierAccountController.getSupplierAccount);

// جلب المشتريات المفتوحة للمورد
router.get('/:supplierId/open-purchases', supplierAccountController.getSupplierOpenPurchases);

export default router;
