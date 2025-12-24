import { Router } from 'express';
import financialContactController from '../controllers/FinancialContactController';
import generalReceiptController from '../controllers/GeneralReceiptController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all general receipt routes
router.use(authenticateToken);

// Financial Contacts
router.get('/contacts', financialContactController.getAll);
router.get('/contacts/:id', financialContactController.getById);
router.post('/contacts', financialContactController.create);
router.put('/contacts/:id', financialContactController.update);
router.get('/contacts/:id/statement', financialContactController.getStatement);

// General Receipts
router.get('/receipts', generalReceiptController.getAll);
router.get('/receipts/:id', generalReceiptController.getById);
router.post('/receipts', generalReceiptController.create);

export default router;
