/**
 * Sale Payment Routes
 * مسارات دفعات المبيعات الآجلة
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getCreditSales,
  getCreditSaleById,
  createPayment,
  getSalePayments,
  deletePayment,
  getCreditSalesStats,
  updatePaymentMethod
} from '../controllers/SalePaymentController';

const router = Router();

// المبيعات الآجلة - المسارات الثابتة أولاً
router.get('/credit-sales/stats', authenticateToken, getCreditSalesStats);
router.get('/credit-sales/:id', authenticateToken, getCreditSaleById);
router.get('/credit-sales', authenticateToken, getCreditSales);

// الدفعات
router.get('/payments', authenticateToken, getSalePayments);
router.post('/payments', authenticateToken, createPayment);
router.patch('/payments/:id/method', authenticateToken, updatePaymentMethod);
router.delete('/payments/:id', authenticateToken, deletePayment);

export default router;
