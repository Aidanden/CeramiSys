import { Router } from 'express';
import { PurchaseController } from '../controllers/PurchaseController';
import { authenticateToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorization';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Purchase routes
router.post('/purchases', 
  authorizeRoles(['admin', 'manager', 'purchase_manager']), 
  PurchaseController.createPurchase
);

router.get('/purchases', 
  authorizeRoles(['admin', 'manager', 'purchase_manager', 'viewer']), 
  PurchaseController.getPurchases
);

router.get('/purchases/stats', 
  authorizeRoles(['admin', 'manager', 'purchase_manager', 'viewer']), 
  PurchaseController.getPurchaseStats
);

router.get('/purchases/:id', 
  authorizeRoles(['admin', 'manager', 'purchase_manager', 'viewer']), 
  PurchaseController.getPurchaseById
);

router.put('/purchases/:id', 
  authorizeRoles(['admin', 'manager', 'purchase_manager']), 
  PurchaseController.updatePurchase
);

router.delete('/purchases/:id', 
  authorizeRoles(['admin', 'manager']), 
  PurchaseController.deletePurchase
);

// Purchase payment routes
router.post('/purchases/payments', 
  authorizeRoles(['admin', 'manager', 'purchase_manager']), 
  PurchaseController.addPayment
);

// Supplier routes
router.post('/suppliers', 
  authorizeRoles(['admin', 'manager', 'purchase_manager']), 
  PurchaseController.createSupplier
);

router.get('/suppliers', 
  authorizeRoles(['admin', 'manager', 'purchase_manager', 'viewer']), 
  PurchaseController.getSuppliers
);

router.get('/suppliers/:id', 
  authorizeRoles(['admin', 'manager', 'purchase_manager', 'viewer']), 
  PurchaseController.getSupplierById
);

router.put('/suppliers/:id', 
  authorizeRoles(['admin', 'manager', 'purchase_manager']), 
  PurchaseController.updateSupplier
);

router.delete('/suppliers/:id', 
  authorizeRoles(['admin', 'manager']), 
  PurchaseController.deleteSupplier
);

export default router;
