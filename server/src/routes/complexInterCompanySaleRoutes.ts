/**
 * Complex Inter-Company Sale Routes
 * مسارات المبيعات المعقدة بين الشركات
 */

import { Router } from 'express';
import { ComplexInterCompanySaleController } from '../controllers/ComplexInterCompanySaleController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const complexInterCompanySaleController = new ComplexInterCompanySaleController();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

/**
 * @route POST /api/complex-inter-company-sales
 * @desc إنشاء عملية بيع معقدة بين الشركات
 * @access Private
 * @body customerId, branchCompanyId, parentCompanyId, lines, profitMargin?
 */
router.post('/', (req, res) => complexInterCompanySaleController.createComplexInterCompanySale(req, res));

/**
 * @route POST /api/complex-inter-company-sales/:parentSaleId/settle
 * @desc تسوية فاتورة الشراء من الشركة الأم
 * @access Private
 * @body amount, paymentMethod
 */
router.post('/:parentSaleId/settle', (req, res) => complexInterCompanySaleController.settleParentSale(req, res));

/**
 * @route GET /api/complex-inter-company-sales/stats
 * @desc الحصول على إحصائيات المبيعات المعقدة
 * @access Private
 */
router.get('/stats', (req, res) => complexInterCompanySaleController.getComplexInterCompanyStats(req, res));

export default router;


