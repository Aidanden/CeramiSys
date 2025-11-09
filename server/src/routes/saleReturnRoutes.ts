/**
 * Sale Return Routes
 * مسارات المردودات
 */

import { Router } from 'express';
import { SaleReturnController } from '../controllers/SaleReturnController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new SaleReturnController();

// جميع المسارات تحتاج مصادقة
router.use(authenticateToken);

// مسارات المردودات
router.post('/', controller.createSaleReturn.bind(controller));
router.get('/', controller.getSaleReturns.bind(controller));
router.get('/:id', controller.getSaleReturnById.bind(controller));
router.post('/:id/approve', controller.approveSaleReturn.bind(controller));
router.post('/:id/reject', controller.rejectSaleReturn.bind(controller));
router.delete('/:id', controller.deleteSaleReturn.bind(controller));

// مسارات دفعات المردودات
router.post('/payments', controller.createReturnPayment.bind(controller));
router.get('/payments', controller.getReturnPayments.bind(controller));
router.delete('/payments/:paymentId', controller.deleteReturnPayment.bind(controller));

export default router;
