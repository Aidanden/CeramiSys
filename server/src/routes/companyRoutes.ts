import { Router } from 'express';
import { CompanyController } from '../controllers/CompanyController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorization';

const router = Router();
const companyController = new CompanyController();

// =============================================
// Company Routes
// =============================================

// تطبيق المصادقة على جميع مسارات الشركات
router.use('/companies*', authenticateToken); // تم تفعيل المصادقة

/**
 * @route   POST /api/company/companies
 * @desc    إنشاء شركة جديدة
 * @access  Admin, Manager
 */
router.post(
  '/companies',
   authorizeRoles(['admin', 'manager']), // معطل مؤقتاً للاختبار
  companyController.createCompany
);

/**
 * @route   GET /api/company/companies
 * @desc    الحصول على جميع الشركات مع التصفية والبحث
 * @access  Admin, Manager, Cashier, Accountant
 * @query   page, limit, search, isParent, parentId
 */
router.get(
  '/companies',
   authorizeRoles(['admin', 'manager', 'cashier', 'accountant']), // معطل مؤقتاً للاختبار
  companyController.getCompanies
);

/**
 * @route   GET /api/company/companies/hierarchy
 * @desc    الحصول على الهيكل الهرمي للشركات
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/hierarchy',
   authorizeRoles(['admin', 'manager', 'cashier', 'accountant']), // معطل مؤقتاً للاختبار
  companyController.getCompanyHierarchy
);

/**
 * @route   GET /api/company/companies/stats
 * @desc    إحصائيات الشركات
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/stats',
   authorizeRoles(['admin', 'manager', 'cashier', 'accountant']), // توسيع الصلاحيات لتشمل جميع المستخدمين
  companyController.getCompanyStats
);

/**
 * @route   GET /api/company/companies/:parentId/branches
 * @desc    الحصول على الشركات التابعة للشركة الأم
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/:parentId/branches',
   authorizeRoles(['admin', 'manager', 'cashier', 'accountant']), // معطل مؤقتاً للاختبار
  companyController.getBranchCompanies
);

/**
 * @route   GET /api/company/companies/:id
 * @desc    الحصول على شركة بواسطة المعرف
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/:id',
   authorizeRoles(['admin', 'manager', 'cashier', 'accountant']), // معطل مؤقتاً للاختبار
  companyController.getCompanyById
);

/**
 * @route   PUT /api/company/companies/:id
 * @desc    تحديث الشركة
 * @access  Admin, Manager
 */
router.put(
  '/companies/:id',
   authorizeRoles(['admin', 'manager']), // معطل مؤقتاً للاختبار
  companyController.updateCompany
);

/**
 * @route   DELETE /api/company/companies/:id
 * @desc    حذف الشركة
 * @access  Admin only
 */
router.delete(
  '/companies/:id',
   authorizeRoles(['admin']), // معطل مؤقتاً للاختبار
  companyController.deleteCompany
);

// =============================================
// يمكن إضافة routes أخرى هنا مستقبلاً:
// - Products Routes
// - Sales Routes  
// - Inventory Routes
// - Reports Routes
// إلخ...
// =============================================

export default router;
