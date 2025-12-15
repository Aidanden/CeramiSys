import { Router } from 'express';
import TreasuryController from '../controllers/TreasuryController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

// ============== مسارات الخزائن ==============

/**
 * @route   GET /api/treasury
 * @desc    الحصول على جميع الخزائن
 * @access  Private
 */
router.get('/', TreasuryController.getAllTreasuries.bind(TreasuryController));

/**
 * @route   GET /api/treasury/stats
 * @desc    إحصائيات الخزائن
 * @access  Private
 */
router.get('/stats', TreasuryController.getTreasuryStats.bind(TreasuryController));

/**
 * @route   GET /api/treasury/transactions
 * @desc    الحصول على جميع الحركات
 * @access  Private
 */
router.get('/transactions', TreasuryController.getAllTransactions.bind(TreasuryController));

/**
 * @route   GET /api/treasury/:id
 * @desc    الحصول على خزينة واحدة
 * @access  Private
 */
router.get('/:id', TreasuryController.getTreasuryById.bind(TreasuryController));

/**
 * @route   GET /api/treasury/:treasuryId/transactions
 * @desc    الحصول على حركات خزينة معينة
 * @access  Private
 */
router.get('/:treasuryId/transactions', TreasuryController.getTreasuryTransactions.bind(TreasuryController));

/**
 * @route   POST /api/treasury
 * @desc    إنشاء خزينة جديدة
 * @access  Private
 */
router.post('/', TreasuryController.createTreasury.bind(TreasuryController));

/**
 * @route   POST /api/treasury/transaction
 * @desc    إنشاء حركة يدوية (إيداع أو سحب)
 * @access  Private
 */
router.post('/transaction', TreasuryController.createManualTransaction.bind(TreasuryController));

/**
 * @route   POST /api/treasury/transfer
 * @desc    تحويل بين الخزائن
 * @access  Private
 */
router.post('/transfer', TreasuryController.transferBetweenTreasuries.bind(TreasuryController));

/**
 * @route   PUT /api/treasury/:id
 * @desc    تحديث خزينة
 * @access  Private
 */
router.put('/:id', TreasuryController.updateTreasury.bind(TreasuryController));

/**
 * @route   DELETE /api/treasury/:id
 * @desc    حذف خزينة
 * @access  Private
 */
router.delete('/:id', TreasuryController.deleteTreasury.bind(TreasuryController));

export default router;
