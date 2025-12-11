import express from 'express';
import { login, logout, getCurrentUser, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// تسجيل الدخول
router.post('/login', login);

// تسجيل الخروج
router.post('/logout', authenticateToken, logout);

// الحصول على معلومات المستخدم الحالي
router.get('/me', authenticateToken, getCurrentUser);

// تغيير كلمة المرور
router.put('/change-password', authenticateToken, changePassword);

export default router;
