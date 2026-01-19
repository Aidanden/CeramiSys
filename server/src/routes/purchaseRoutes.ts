import { Router } from 'express';
import { PurchaseController } from '../controllers/PurchaseController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();

// Apply middleware to all routes
router.use(authenticateToken);
router.use(authorizePermissions([SCREEN_PERMISSIONS.PURCHASES, SCREEN_PERMISSIONS.ALL]));

// Purchase routes
router.post('/purchases',
  PurchaseController.createPurchase
);

router.get('/purchases',
  PurchaseController.getPurchases
);

router.get('/purchases/stats',
  PurchaseController.getPurchaseStats
);

router.get('/purchases/:id',
  PurchaseController.getPurchaseById
);

router.put('/purchases/:id',
  PurchaseController.updatePurchase
);

router.delete('/purchases/:id',
  PurchaseController.deletePurchase
);

// Purchase payment routes
router.post('/purchases/payments',
  PurchaseController.addPayment
);

// Supplier routes
router.post('/suppliers',
  PurchaseController.createSupplier
);

router.get('/suppliers',
  PurchaseController.getSuppliers
);

router.get('/suppliers/:id',
  PurchaseController.getSupplierById
);

router.put('/suppliers/:id',
  PurchaseController.updateSupplier
);

router.delete('/suppliers/:id',
  PurchaseController.deleteSupplier
);

export default router;
