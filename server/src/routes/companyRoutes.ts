import { Router } from 'express';
import { CompanyController } from '../controllers/CompanyController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

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
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
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
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
  companyController.getCompanies
);

/**
 * @route   GET /api/company/companies/hierarchy
 * @desc    الحصول على الهيكل الهرمي للشركات
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/hierarchy',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
  companyController.getCompanyHierarchy
);

/**
 * @route   GET /api/company/companies/stats
 * @desc    إحصائيات الشركات
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/stats',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
  companyController.getCompanyStats
);

/**
 * @route   GET /api/company/companies/:parentId/branches
 * @desc    الحصول على الشركات التابعة للشركة الأم
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/:parentId/branches',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
  companyController.getBranchCompanies
);

/**
 * @route   GET /api/company/companies/:id
 * @desc    الحصول على شركة بواسطة المعرف
 * @access  Admin, Manager, Cashier, Accountant
 */
router.get(
  '/companies/:id',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]), // using COMPANIES
  companyController.getCompanyById
);

/**
 * @route   PUT /api/company/companies/:id
 * @desc    تحديث الشركة
 * @access  Admin, Manager
 */
router.put(
  '/companies/:id',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
  companyController.updateCompany
);

/**
 * @route   DELETE /api/company/companies/:id
 * @desc    حذف الشركة
 * @access  Admin only
 */
router.delete(
  '/companies/:id',
  authorizePermissions([SCREEN_PERMISSIONS.COMPANIES]),
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
