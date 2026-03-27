import express from 'express';
import OpeningBalanceController from '../controllers/OpeningBalanceController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// إضافة رصيد افتتاحي
router.post('/', OpeningBalanceController.createOpeningBalance);

// جلب الأرصدة الافتتاحية لعميل
router.get('/customer/:customerId', OpeningBalanceController.getCustomerOpeningBalances);

// جلب الأرصدة الافتتاحية لمورد
router.get('/supplier/:supplierId', OpeningBalanceController.getSupplierOpeningBalances);

// تسوية رصيد افتتاحي لمورد (دفع)
router.post('/settle-supplier', OpeningBalanceController.settleSupplierOpeningBalance);

// تسوية رصيد افتتاحي لعميل (قبض)
router.post('/settle-customer', OpeningBalanceController.settleCustomerOpeningBalance);

export default router;
