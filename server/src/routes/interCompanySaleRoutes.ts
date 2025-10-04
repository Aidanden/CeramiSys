/**
 * Inter-Company Sale Routes
 * مسارات المبيعات بين الشركات
 */

import express from 'express';
import {
  createInterCompanySale,
  getInterCompanySales,
  getInterCompanySaleById,
  getInterCompanySalesStats
} from '../controllers/InterCompanySaleController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// جميع المسارات تتطلب المصادقة
router.use(authenticateToken);

// إنشاء فاتورة مبيعات بين الشركات
router.post('/', createInterCompanySale);

// الحصول على جميع المبيعات بين الشركات
router.get('/', getInterCompanySales);

// الحصول على إحصائيات المبيعات بين الشركات
router.get('/stats', getInterCompanySalesStats);

// الحصول على فاتورة مبيعات بين الشركات بالتفصيل
router.get('/:id', getInterCompanySaleById);

export default router;
