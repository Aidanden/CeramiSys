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
  getDispatchOrderStats
} from '../controllers/WarehouseController';

const router = Router();

// أوامر الصرف - المسارات الثابتة أولاً
router.get('/dispatch-orders/stats', authenticateToken, getDispatchOrderStats);
router.get('/dispatch-orders/:id', authenticateToken, getDispatchOrderById);
router.get('/dispatch-orders', authenticateToken, getDispatchOrders);
router.post('/dispatch-orders', authenticateToken, createDispatchOrder);
router.patch('/dispatch-orders/:id/status', authenticateToken, updateDispatchOrderStatus);
router.delete('/dispatch-orders/:id', authenticateToken, deleteDispatchOrder);

export default router;
