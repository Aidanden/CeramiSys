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

// تقرير الأرباح
router.get("/profit", reportsController.getProfitReport);

// تقرير العملاء
router.get("/customers", reportsController.getCustomerReport);

// تقرير المنتجات الأكثر مبيعاً
router.get("/top-products", reportsController.getTopProductsReport);

export default router;
