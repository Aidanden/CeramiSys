/**
 * Product Routes
 * مسارات الأصناف
 */

import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const productController = new ProductController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

/**
 * @route GET /api/products
 * @desc الحصول على جميع الأصناف مع التصفية والبحث
 * @access Private
 * @query page, limit, search, companyId, unit
 */
router.get('/', (req, res) => productController.getProducts(req, res));

/**
 * @route GET /api/products/stats
 * @desc الحصول على إحصائيات الأصناف
 * @access Private
 */
router.get('/stats', (req, res) => productController.getProductStats(req, res));

/**
 * @route GET /api/products/top-selling
 * @desc الحصول على الأصناف الأكثر مبيعاً
 * @access Private
 * @query limit, companyId
 */
router.get('/top-selling', (req, res) => productController.getTopSellingProducts(req, res));

/**
 * @route GET /api/products/low-stock
 * @desc الحصول على الأصناف التي ستنتهي قريباً
 * @access Private
 * @query limit, companyId
 */
router.get('/low-stock', (req, res) => productController.getLowStockProducts(req, res));

/**
 * @route GET /api/products/parent-company
 * @desc الحصول على أصناف الشركة الأم مع أسعارها
 * @access Private
 * @query parentCompanyId
 */
router.get('/parent-company', (req, res) => productController.getParentCompanyProducts(req, res));

/**
 * @route GET /api/products/:id
 * @desc الحصول على صنف واحد بالمعرف
 * @access Private
 */
router.get('/:id', (req, res) => productController.getProductById(req, res));

/**
 * @route POST /api/products
 * @desc إنشاء صنف جديد
 * @access Private
 * @body sku, name, unit?, createdByCompanyId, sellPrice?, initialQuantity?
 */
router.post('/', (req, res) => productController.createProduct(req, res));

/**
 * @route PUT /api/products/:id
 * @desc تحديث صنف
 * @access Private
 * @body sku?, name?, unit?, sellPrice?
 */
router.put('/:id', (req, res) => productController.updateProduct(req, res));

/**
 * @route DELETE /api/products/:id
 * @desc حذف صنف
 * @access Private
 */
router.delete('/:id', (req, res) => productController.deleteProduct(req, res));

/**
 * @route PUT /api/products/stock/update
 * @desc تحديث المخزون
 * @access Private
 * @body productId, companyId, quantity
 */
router.put('/stock/update', (req, res) => productController.updateStock(req, res));

/**
 * @route PUT /api/products/price/update
 * @desc تحديث السعر
 * @access Private
 * @body productId, companyId, sellPrice
 */
router.put('/price/update', (req, res) => productController.updatePrice(req, res));

/**
 * @route PUT /api/products/groups/bulk-update
 * @desc تحديث مجموعة الأصناف لمجموعة من المنتجات
 * @access Private
 * @body productIds[], groupId
 */
router.put('/groups/bulk-update', (req, res) => productController.bulkUpdateProductGroup(req, res));

export default router;
