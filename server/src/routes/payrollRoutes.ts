/**
 * Payroll Routes
 * مسارات المرتبات
 */

import express from 'express';
import PayrollController from '../controllers/PayrollController';
import { authenticateToken as authMiddleware } from '../middleware/auth';

const router = express.Router();

// ============== إدارة الموظفين ==============

// الحصول على قائمة الموظفين
router.get('/employees', authMiddleware, PayrollController.getEmployees.bind(PayrollController));

// الحصول على موظف واحد
router.get('/employees/:id', authMiddleware, PayrollController.getEmployeeById.bind(PayrollController));

// إنشاء موظف جديد
router.post('/employees', authMiddleware, PayrollController.createEmployee.bind(PayrollController));

// تحديث موظف
router.put('/employees/:id', authMiddleware, PayrollController.updateEmployee.bind(PayrollController));

// حذف موظف
router.delete('/employees/:id', authMiddleware, PayrollController.deleteEmployee.bind(PayrollController));

// ============== صرف المرتبات ==============

// صرف مرتب لموظف
router.post('/salaries/pay', authMiddleware, PayrollController.paySalary.bind(PayrollController));

// صرف مرتبات لعدة موظفين
router.post('/salaries/pay-multiple', authMiddleware, PayrollController.payMultipleSalaries.bind(PayrollController));

// الحصول على سجل مرتبات شهر معين
router.get('/salaries', authMiddleware, PayrollController.getSalaryPaymentsByMonth.bind(PayrollController));

// ============== المكافآت والزيادات ==============

// صرف مكافأة أو زيادة
router.post('/bonuses/pay', authMiddleware, PayrollController.payBonus.bind(PayrollController));

// ============== الإحصائيات ==============

// إحصائيات المرتبات
router.get('/stats', authMiddleware, PayrollController.getPayrollStats.bind(PayrollController));

export default router;
