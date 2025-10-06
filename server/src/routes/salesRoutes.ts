/**
 * Sales Routes
 * مسارات المبيعات
 */

import { Router } from 'express';
import { SalesController } from '../controllers/SalesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const salesController = new SalesController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

// ============== مسارات المبيعات ==============

/**
 * @route   GET /api/sales
 * @desc    الحصول على قائمة المبيعات
 * @access  Private
 */
router.get('/', salesController.getSales.bind(salesController));

/**
 * @route   POST /api/sales
 * @desc    إنشاء فاتورة مبيعات جديدة
 * @access  Private
 */
router.post('/', salesController.createSale.bind(salesController));

/**
 * @route   GET /api/sales/stats
 * @desc    الحصول على إحصائيات المبيعات
 * @access  Private
 */
router.get('/stats', salesController.getSalesStats.bind(salesController));

/**
 * @route   GET /api/sales/chart/daily
 * @desc    الحصول على بيانات الرسم البياني للمبيعات اليومية
 * @access  Private
 */
router.get('/chart/daily', salesController.getDailySalesChart.bind(salesController));

// ============== مسارات العملاء ==============

/**
 * @route   GET /api/sales/customers
 * @desc    الحصول على قائمة العملاء
 * @access  Private
 */
router.get('/customers', salesController.getCustomers.bind(salesController));

/**
 * @route   POST /api/sales/customers
 * @desc    إنشاء عميل جديد
 * @access  Private
 */
router.post('/customers', salesController.createCustomer.bind(salesController));

/**
 * @route   GET /api/sales/customers/:id
 * @desc    الحصول على عميل واحد
 * @access  Private
 */
router.get('/customers/:id', salesController.getCustomerById.bind(salesController));

/**
 * @route   PUT /api/sales/customers/:id
 * @desc    تحديث عميل
 * @access  Private
 */
router.put('/customers/:id', salesController.updateCustomer.bind(salesController));

/**
 * @route   DELETE /api/sales/customers/:id
 * @desc    حذف عميل
 * @access  Private
 */
router.delete('/customers/:id', salesController.deleteCustomer.bind(salesController));

// ============== مسارات المبيعات بـ ID ==============

/**
 * @route   GET /api/sales/:id
 * @desc    الحصول على فاتورة مبيعات واحدة
 * @access  Private
 */
router.get('/:id', salesController.getSaleById.bind(salesController));

/**
 * @route   PUT /api/sales/:id
 * @desc    تحديث فاتورة مبيعات
 * @access  Private
 */
router.put('/:id', salesController.updateSale.bind(salesController));

/**
 * @route   DELETE /api/sales/:id
 * @desc    حذف فاتورة مبيعات
 * @access  Private
 */
router.delete('/:id', salesController.deleteSale.bind(salesController));

export default router;
