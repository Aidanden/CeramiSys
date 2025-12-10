import express from 'express';
import {
  createNotification,
  bulkCreateNotifications,
  getNotifications,
  getNotificationStats,
  getNotificationById,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupOldNotifications
} from '../controllers/NotificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// تطبيق middleware المصادقة على جميع المسارات
router.use(authenticateToken);

// Routes للإشعارات
router.post('/', createNotification);
router.post('/bulk', bulkCreateNotifications);
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/:id', getNotificationById);
router.put('/:id', updateNotification);
router.patch('/mark-read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/cleanup/old', cleanupOldNotifications);

export default router;
