/**
 * Warehouse Routes
 * مسارات أوامر صرف المخزن
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDispatchOrders,
  getDispatchOrderById,
  createDispatchOrder,
  updateDispatchOrderStatus,
  deleteDispatchOrder,
  getDispatchOrderStats,
  getReturnOrders,
  updateReturnOrderStatus
} from '../controllers/WarehouseController';

import { authorizePermissions } from '../middleware/authorization';
import { SCREEN_PERMISSIONS } from '../constants/screenPermissions';

const router = Router();

// أوامر الصرف - المسارات الثابتة أولاً
router.get('/dispatch-orders/stats',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  getDispatchOrderStats
);
router.get('/dispatch-orders/:id',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  getDispatchOrderById
);
router.get('/dispatch-orders',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  getDispatchOrders
);
router.post('/dispatch-orders',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  createDispatchOrder
);
router.patch('/dispatch-orders/:id/status',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  updateDispatchOrderStatus
);
router.delete('/dispatch-orders/:id',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH, SCREEN_PERMISSIONS.ALL]),
  deleteDispatchOrder
);

// طلبات استلام المردودات
router.get('/return-orders',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_RETURNS, SCREEN_PERMISSIONS.ALL]),
  getReturnOrders
);
router.patch('/return-orders/:id/status',
  authenticateToken,
  authorizePermissions([SCREEN_PERMISSIONS.WAREHOUSE_RETURNS, SCREEN_PERMISSIONS.ALL]),
  updateReturnOrderStatus
);

export default router;
