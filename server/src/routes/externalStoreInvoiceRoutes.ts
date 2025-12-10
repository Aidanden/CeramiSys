import { Router } from 'express';
import { ExternalStoreInvoiceController } from '../controllers/ExternalStoreInvoiceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new ExternalStoreInvoiceController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

/**
 * @route   GET /api/external-store-invoices
 * @desc    الحصول على جميع فواتير المحلات
 * @access  Private (Accountant)
 */
router.get('/', controller.getInvoices.bind(controller));

/**
 * @route   GET /api/external-store-invoices/stats
 * @desc    إحصائيات فواتير المحلات
 * @access  Private (Accountant)
 */
router.get('/stats', controller.getInvoiceStats.bind(controller));

/**
 * @route   GET /api/external-store-invoices/:id
 * @desc    الحصول على فاتورة واحدة
 * @access  Private (Accountant)
 */
router.get('/:id', controller.getInvoiceById.bind(controller));

/**
 * @route   POST /api/external-store-invoices/:id/approve
 * @desc    الموافقة على فاتورة
 * @access  Private (Accountant)
 */
router.post('/:id/approve', controller.approveInvoice.bind(controller));

/**
 * @route   POST /api/external-store-invoices/:id/reject
 * @desc    رفض فاتورة
 * @access  Private (Accountant)
 */
router.post('/:id/reject', controller.rejectInvoice.bind(controller));

export default router;
