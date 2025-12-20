/**
 * Product Cost Routes
 * مسارات API لإدارة تكلفة الأصناف
 */

import { Router } from 'express';
import { ProductCostController } from '../controllers/ProductCostController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// جميع المسارات تتطلب تسجيل الدخول
router.use(authenticateToken);

// الحصول على قائمة الأصناف مع معلومات التكلفة
router.get('/products', ProductCostController.getProductsWithCostInfo);

// الحصول على معلومات تكلفة صنف معين
router.get('/products/:id', ProductCostController.getProductCostInfo);

// حساب التكلفة مع سعر صرف مخصص
router.post('/products/:id/calculate', ProductCostController.calculateCostWithCustomRate);

// تحديث تكلفة الصنف
router.post('/update', ProductCostController.updateProductCost);

export default router;
