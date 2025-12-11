import express from 'express';
import CustomerAccountController from '../controllers/CustomerAccountController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// جلب ملخص حسابات جميع العملاء
router.get('/summary', CustomerAccountController.getAllCustomersAccountSummary);

// جلب الفواتير المفتوحة لعميل معين
router.get('/:customerId/open-invoices', CustomerAccountController.getCustomerOpenInvoices);

// جلب الرصيد الحالي لعميل
router.get('/:customerId/balance', CustomerAccountController.getCurrentBalance);

// جلب حساب عميل معين
router.get('/:customerId', CustomerAccountController.getCustomerAccount);

export default router;


