import express from 'express';
import { 
  getAllScreens, 
  getUserScreens, 
  getScreensByCategory 
} from '../controllers/screensController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// الحصول على جميع الشاشات المتاحة في النظام
router.get('/screens', 
  authenticateToken, 
  getAllScreens
);

// الحصول على الشاشات المصرح بها للمستخدم الحالي
router.get('/users/me/screens', 
  authenticateToken, 
  getUserScreens
);

// الحصول على الشاشات حسب الفئة
router.get('/screens/category/:category', 
  authenticateToken, 
  getScreensByCategory
);

export default router;
