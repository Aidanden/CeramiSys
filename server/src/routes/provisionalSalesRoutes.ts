/**
 * Provisional Sales Routes
 * مسارات API للفواتير المبدئية
 */

import { Router } from 'express';
import { ProvisionalSalesController } from '../controllers/ProvisionalSalesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const provisionalSalesController = new ProvisionalSalesController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

// ============== مسارات الفواتير المبدئية ==============

// إنشاء فاتورة مبدئية جديدة
router.post('/', (req, res) => provisionalSalesController.createProvisionalSale(req, res));

// الحصول على قائمة الفواتير المبدئية مع البحث والفلترة
router.get('/', (req, res) => provisionalSalesController.getProvisionalSales(req, res));

// الحصول على فاتورة مبدئية واحدة
router.get('/:id', (req, res) => provisionalSalesController.getProvisionalSaleById(req, res));

// تحديث فاتورة مبدئية
router.put('/:id', (req, res) => provisionalSalesController.updateProvisionalSale(req, res));

// حذف فاتورة مبدئية
router.delete('/:id', (req, res) => provisionalSalesController.deleteProvisionalSale(req, res));

// ============== مسارات خاصة ==============

// تغيير حالة الفاتورة المبدئية
router.patch('/:id/status', (req, res) => provisionalSalesController.updateStatus(req, res));

// ترحيل فاتورة مبدئية إلى فاتورة مبيعات عادية
router.post('/:id/convert', (req, res) => provisionalSalesController.convertToSale(req, res));

export default router;
