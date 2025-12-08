import { Router } from 'express';
import { ExternalStoreAuthController } from '../controllers/ExternalStoreAuthController';
import { authenticateStoreToken } from '../middleware/auth';

const router = Router();
const controller = new ExternalStoreAuthController();

/**
 * @route   POST /api/store-portal/auth/login
 * @desc    تسجيل دخول مستخدم المحل
 * @access  Public
 */
router.post('/auth/login', controller.login.bind(controller));

/**
 * @route   POST /api/store-portal/auth/logout
 * @desc    تسجيل خروج مستخدم المحل
 * @access  Private (Store)
 */
router.post('/auth/logout', authenticateStoreToken, controller.logout.bind(controller));

/**
 * @route   GET /api/store-portal/auth/me
 * @desc    الحصول على معلومات المستخدم الحالي
 * @access  Private (Store)
 */
router.get('/auth/me', authenticateStoreToken, controller.getCurrentUser.bind(controller));

/**
 * @route   PUT /api/store-portal/auth/change-password
 * @desc    تغيير كلمة المرور
 * @access  Private (Store)
 */
router.put('/auth/change-password', authenticateStoreToken, controller.changePassword.bind(controller));

/**
 * @route   POST /api/store-portal/auth/forgot-password
 * @desc    نسيت كلمة المرور
 * @access  Public
 */
router.post('/auth/forgot-password', controller.forgotPassword.bind(controller));

export default router;
