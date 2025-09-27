import express from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRoles, 
  resetUserPassword 
} from '../controllers/usersController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';

const router = express.Router();

// الحصول على جميع المستخدمين
router.get('/users', 
  authenticateToken, 
  authorizePermissions(['users.view']), 
  getUsers
);

// إضافة مستخدم جديد
router.post('/users', 
  authenticateToken, 
  authorizePermissions(['users.create']), 
  createUser
);

// تحديث مستخدم
router.put('/users/:id', 
  authenticateToken, 
  authorizePermissions(['users.edit']), 
  updateUser
);

// حذف مستخدم
router.delete('/users/:id', 
  authenticateToken, 
  authorizePermissions(['users.delete']), 
  deleteUser
);

// إعادة تعيين كلمة مرور المستخدم
router.put('/users/:id/reset-password', 
  authenticateToken, 
  authorizePermissions(['users.edit']), 
  resetUserPassword
);

// الحصول على الأدوار
router.get('/roles', 
  authenticateToken, 
  getRoles
);

export default router;
