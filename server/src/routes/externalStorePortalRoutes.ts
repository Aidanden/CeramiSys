import { Router } from 'express';
import { ExternalStoreInvoiceController } from '../controllers/ExternalStoreInvoiceController';
import { authenticateToken, authenticateStoreToken } from '../middleware/auth';

const router = Router();
const controller = new ExternalStoreInvoiceController();

// ============== Store Portal Routes ==============

/**
 * @route   GET /api/store-portal/invoices
 * @desc    الحصول على فواتير المحل
 * @access  Private (Store)
 */
router.get('/invoices', authenticateStoreToken, controller.getInvoices.bind(controller));

/**
 * @route   POST /api/store-portal/invoices
 * @desc    إنشاء فاتورة جديدة
 * @access  Private (Store)
 */
router.post('/invoices', authenticateStoreToken, controller.createInvoice.bind(controller));

/**
 * @route   GET /api/store-portal/invoices/stats
 * @desc    إحصائيات فواتير المحل
 * @access  Private (Store)
 */
router.get('/invoices/stats', authenticateStoreToken, controller.getInvoiceStats.bind(controller));

/**
 * @route   GET /api/store-portal/products
 * @desc    الحصول على المنتجات المتاحة للمحل
 * @access  Private (Store)
 */
router.get('/products', authenticateStoreToken, controller.getAvailableProducts.bind(controller));

/**
 * @route   GET /api/store-portal/invoices/:id
 * @desc    الحصول على فاتورة واحدة
 * @access  Private (Store)
 */
router.get('/invoices/:id', authenticateStoreToken, controller.getInvoiceById.bind(controller));

/**
 * @route   PUT /api/store-portal/invoices/:id
 * @desc    تحديث فاتورة معلقة
 * @access  Private (Store)
 */
router.put('/invoices/:id', authenticateStoreToken, controller.updateInvoice.bind(controller));

/**
 * @route   DELETE /api/store-portal/invoices/:id
 * @desc    حذف فاتورة معلقة
 * @access  Private (Store)
 */
router.delete('/invoices/:id', authenticateStoreToken, controller.deleteInvoice.bind(controller));

export default router;
