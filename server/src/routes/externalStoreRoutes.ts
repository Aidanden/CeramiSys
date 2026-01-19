import { Router } from 'express';
import { ExternalStoreController } from '../controllers/ExternalStoreController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();
const controller = new ExternalStoreController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);
router.use(authorizePermissions([SCREEN_PERMISSIONS.EXTERNAL_STORES, SCREEN_PERMISSIONS.ALL]));

/**
 * @route   GET /api/external-stores
 * @desc    الحصول على قائمة المحلات الخارجية
 * @access  Private (Accountant)
 */
router.get('/', controller.getStores.bind(controller));

/**
 * @route   POST /api/external-stores
 * @desc    إنشاء محل خارجي جديد
 * @access  Private (Accountant)
 */
router.post('/', controller.createStore.bind(controller));

/**
 * @route   GET /api/external-stores/:id
 * @desc    الحصول على محل واحد
 * @access  Private (Accountant)
 */
router.get('/:id', controller.getStoreById.bind(controller));

/**
 * @route   PUT /api/external-stores/:id
 * @desc    تحديث محل
 * @access  Private (Accountant)
 */
router.put('/:id', controller.updateStore.bind(controller));

/**
 * @route   DELETE /api/external-stores/:id
 * @desc    حذف محل (soft delete)
 * @access  Private (Accountant)
 */
router.delete('/:id', controller.deleteStore.bind(controller));

/**
 * @route   POST /api/external-stores/:id/users
 * @desc    إنشاء مستخدم للمحل
 * @access  Private (Accountant)
 */
router.post('/:id/users', controller.createStoreUser.bind(controller));

/**
 * @route   PUT /api/external-stores/:id/users/:userId
 * @desc    تحديث بيانات مستخدم المحل
 * @access  Private (Accountant)
 */
router.put('/:id/users/:userId', controller.updateStoreUser.bind(controller));

/**
 * @route   GET /api/external-stores/:id/products
 * @desc    الحصول على منتجات المحل
 * @access  Private (Accountant)
 */
router.get('/:id/products', controller.getStoreProducts.bind(controller));

/**
 * @route   POST /api/external-stores/:id/products
 * @desc    ربط منتجات بالمحل
 * @access  Private (Accountant)
 */
router.post('/:id/products', controller.assignProducts.bind(controller));

/**
 * @route   DELETE /api/external-stores/:id/products/:productId
 * @desc    إزالة منتج من المحل
 * @access  Private (Accountant)
 */
router.delete('/:id/products/:productId', controller.removeProduct.bind(controller));

export default router;
