import { Router } from 'express';
import { ProductGroupController } from '../controllers/ProductGroupController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();
const productGroupController = new ProductGroupController();

// تطبيق المصادقة والصلاحيات على جميع المسارات
router.use(authenticateToken);
router.use(authorizePermissions([SCREEN_PERMISSIONS.PRODUCT_GROUPS, SCREEN_PERMISSIONS.ALL]));

// البحث في مجموعات الأصناف (يجب أن يكون قبل /:id)
router.get('/search', productGroupController.searchProductGroups.bind(productGroupController));

// الحصول على جميع مجموعات الأصناف
router.get('/', productGroupController.getAllProductGroups.bind(productGroupController));

// الحصول على مجموعة أصناف محددة
router.get('/:id', productGroupController.getProductGroupById.bind(productGroupController));

// إنشاء مجموعة أصناف جديدة
router.post('/', productGroupController.createProductGroup.bind(productGroupController));

// تحديث مجموعة أصناف
router.put('/:id', productGroupController.updateProductGroup.bind(productGroupController));

// حذف مجموعة أصناف
router.delete('/:id', productGroupController.deleteProductGroup.bind(productGroupController));

// الحصول على الأصناف التابعة لمجموعة
router.get('/:id/products', productGroupController.getProductsByGroup.bind(productGroupController));

// تقرير المشتريات لمجموعة أصناف
router.get('/:id/purchase-report', productGroupController.getGroupPurchaseReport.bind(productGroupController));

export default router;
