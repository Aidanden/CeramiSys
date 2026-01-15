import { Router } from "express";
import { ReportsController } from "../controllers/ReportsController";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const reportsController = new ReportsController();

// جميع routes التقارير محمية بالمصادقة
router.use(authenticateToken);

// تقرير المبيعات
router.get("/sales", reportsController.getSalesReport);

// تقرير المخزون
router.get("/stock", reportsController.getStockReport);

// تقرير العملاء
router.get("/customers", reportsController.getCustomerReport);

// تقرير المنتجات الأكثر مبيعاً
router.get("/top-products", reportsController.getTopProductsReport);

// تقرير الموردين
router.get("/suppliers", reportsController.getSupplierReport);

// تقرير المشتريات
router.get("/purchases", reportsController.getPurchaseReport);

// تقرير حركة الصنف
router.get("/product-movement", reportsController.getProductMovementReport);

// تقرير الأرباح (التقرير المالي)
router.get("/financial", reportsController.getFinancialReport);

// تقرير بضاعة الموردين (جديد)
router.get("/supplier-stock", reportsController.getSupplierStockReport);

// تقرير بضاعة المجموعات (جديد)
router.get("/group-stock", reportsController.getGroupStockReport);

export default router;

