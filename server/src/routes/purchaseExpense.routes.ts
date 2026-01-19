import { Router } from 'express';
import purchaseExpenseController from '../controllers/purchaseExpense.controller';
import addExpensesToApprovedPurchaseController from '../controllers/addExpensesToApprovedPurchase.controller';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();

// جميع المسارات تتطلب المصادقة
router.use(authenticateToken);

// ==================== فئات المصروفات ====================
router.get('/categories',
    authorizePermissions([SCREEN_PERMISSIONS.EXPENSE_CATEGORIES, SCREEN_PERMISSIONS.PURCHASES, SCREEN_PERMISSIONS.ALL]),
    purchaseExpenseController.getAllExpenseCategories.bind(purchaseExpenseController)
);
router.get('/categories/:id',
    authorizePermissions([SCREEN_PERMISSIONS.EXPENSE_CATEGORIES, SCREEN_PERMISSIONS.ALL]),
    purchaseExpenseController.getExpenseCategoryById.bind(purchaseExpenseController)
);
router.post('/categories',
    authorizePermissions([SCREEN_PERMISSIONS.EXPENSE_CATEGORIES, SCREEN_PERMISSIONS.ALL]),
    purchaseExpenseController.createExpenseCategory.bind(purchaseExpenseController)
);
router.put('/categories/:id',
    authorizePermissions([SCREEN_PERMISSIONS.EXPENSE_CATEGORIES, SCREEN_PERMISSIONS.ALL]),
    purchaseExpenseController.updateExpenseCategory.bind(purchaseExpenseController)
);
router.delete('/categories/:id',
    authorizePermissions([SCREEN_PERMISSIONS.EXPENSE_CATEGORIES, SCREEN_PERMISSIONS.ALL]),
    purchaseExpenseController.deleteExpenseCategory.bind(purchaseExpenseController)
);

// ==================== اعتماد الفاتورة والمصروفات ====================
router.post('/approve', purchaseExpenseController.approvePurchase.bind(purchaseExpenseController));
router.get('/purchase/:purchaseId', purchaseExpenseController.getPurchaseExpenses.bind(purchaseExpenseController));
router.delete('/expense/:expenseId', purchaseExpenseController.deletePurchaseExpense.bind(purchaseExpenseController));

// ==================== إضافة مصروفات للفواتير المعتمدة ====================
router.post('/add-to-approved', addExpensesToApprovedPurchaseController.addExpensesToApprovedPurchase.bind(addExpensesToApprovedPurchaseController));

// ==================== تاريخ التكلفة ====================
router.get('/cost-history/:productId', purchaseExpenseController.getProductCostHistory.bind(purchaseExpenseController));

export default router;
