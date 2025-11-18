import { Router } from 'express';
import paymentReceiptController from '../controllers/paymentReceipt.controller';
import paymentInstallmentController from '../controllers/paymentInstallment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// جميع المسارات تتطلب المصادقة
router.use(authenticateToken);

// ==================== إيصالات الدفع ====================
router.get('/', paymentReceiptController.getAllPaymentReceipts.bind(paymentReceiptController));
router.get('/stats', paymentReceiptController.getPaymentReceiptsStats.bind(paymentReceiptController));
router.get('/:id', paymentReceiptController.getPaymentReceiptById.bind(paymentReceiptController));
router.post('/', paymentReceiptController.createPaymentReceipt.bind(paymentReceiptController));
router.put('/:id', paymentReceiptController.updatePaymentReceipt.bind(paymentReceiptController));
router.delete('/:id', paymentReceiptController.deletePaymentReceipt.bind(paymentReceiptController));

// ==================== عمليات الدفع ====================
router.post('/:id/pay', paymentReceiptController.payReceipt.bind(paymentReceiptController));
router.post('/:id/cancel', paymentReceiptController.cancelReceipt.bind(paymentReceiptController));

// ==================== الدفعات الجزئية ====================
router.post('/installments', paymentInstallmentController.addInstallment.bind(paymentInstallmentController));
router.get('/:paymentReceiptId/installments', paymentInstallmentController.getInstallmentsByReceiptId.bind(paymentInstallmentController));
router.delete('/installments/:id', paymentInstallmentController.deleteInstallment.bind(paymentInstallmentController));

export default router;
