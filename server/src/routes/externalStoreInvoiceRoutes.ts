import { Router } from 'express';
import { ExternalStoreInvoiceController } from '../controllers/ExternalStoreInvoiceController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();
const controller = new ExternalStoreInvoiceController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);
router.use(authorizePermissions([SCREEN_PERMISSIONS.EXTERNAL_STORE_INVOICES, SCREEN_PERMISSIONS.ALL]));

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

/**
 * @route   PUT /api/external-store-invoices/:id
 * @desc    تحديث فاتورة (للمسؤول)
 * @access  Private (Accountant)
 */
router.put('/:id', controller.adminUpdateInvoice.bind(controller));

export default router;
