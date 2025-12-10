import { Router } from 'express';
import purchaseExpenseController from '../controllers/purchaseExpense.controller';
import addExpensesToApprovedPurchaseController from '../controllers/addExpensesToApprovedPurchase.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// جميع المسارات تتطلب المصادقة
router.use(authenticateToken);

// ==================== فئات المصروفات ====================
router.get('/categories', purchaseExpenseController.getAllExpenseCategories.bind(purchaseExpenseController));
router.get('/categories/:id', purchaseExpenseController.getExpenseCategoryById.bind(purchaseExpenseController));
router.post('/categories', purchaseExpenseController.createExpenseCategory.bind(purchaseExpenseController));
router.put('/categories/:id', purchaseExpenseController.updateExpenseCategory.bind(purchaseExpenseController));
router.delete('/categories/:id', purchaseExpenseController.deleteExpenseCategory.bind(purchaseExpenseController));

// ==================== اعتماد الفاتورة والمصروفات ====================
router.post('/approve', purchaseExpenseController.approvePurchase.bind(purchaseExpenseController));
router.get('/purchase/:purchaseId', purchaseExpenseController.getPurchaseExpenses.bind(purchaseExpenseController));
router.delete('/expense/:expenseId', purchaseExpenseController.deletePurchaseExpense.bind(purchaseExpenseController));

// ==================== إضافة مصروفات للفواتير المعتمدة ====================
router.post('/add-to-approved', addExpensesToApprovedPurchaseController.addExpensesToApprovedPurchase.bind(addExpensesToApprovedPurchaseController));

// ==================== تاريخ التكلفة ====================
router.get('/cost-history/:productId', purchaseExpenseController.getProductCostHistory.bind(purchaseExpenseController));

export default router;
