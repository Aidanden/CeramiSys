/**
 * Bad Debt Routes
 * مسارات المصروفات المعدومة
 */

import express from 'express';
import BadDebtController from '../controllers/BadDebtController';
import { authenticateToken as authMiddleware } from '../middleware/auth';

const router = express.Router();

// ============== إدارة البنود ==============

// الحصول على قائمة البنود
router.get('/categories', authMiddleware, BadDebtController.getCategories.bind(BadDebtController));

// الحصول على بند واحد
router.get('/categories/:id', authMiddleware, BadDebtController.getCategoryById.bind(BadDebtController));

// إنشاء بند جديد
router.post('/categories', authMiddleware, BadDebtController.createCategory.bind(BadDebtController));

// تحديث بند
router.put('/categories/:id', authMiddleware, BadDebtController.updateCategory.bind(BadDebtController));

// حذف بند
router.delete('/categories/:id', authMiddleware, BadDebtController.deleteCategory.bind(BadDebtController));

// ============== صرف المصروفات المعدومة ==============

// صرف مصروف معدوم
router.post('/expenses/pay', authMiddleware, BadDebtController.payBadDebt.bind(BadDebtController));

// الحصول على قائمة المصروفات
router.get('/expenses', authMiddleware, BadDebtController.getExpenses.bind(BadDebtController));

// ============== الإحصائيات والتقارير ==============

// إحصائيات المصروفات المعدومة
router.get('/stats', authMiddleware, BadDebtController.getBadDebtStats.bind(BadDebtController));

// التقرير الشهري
router.get('/reports/monthly', authMiddleware, BadDebtController.getMonthlyReport.bind(BadDebtController));

export default router;
