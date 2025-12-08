import express from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  resetUserPassword 
} from '../controllers/usersController';
import { authenticateToken } from '../middleware/auth';
import { authorizePermissions } from '../middleware/authorization';

const router = express.Router();

// الحصول على جميع المستخدمين
router.get('/users', 
  authenticateToken, 
  authorizePermissions(['screen.users', 'screen.all']), 
  getUsers
);

// إضافة مستخدم جديد
router.post('/users', 
  authenticateToken, 
  authorizePermissions(['screen.users', 'screen.all']), 
  createUser
);

// تحديث مستخدم
router.put('/users/:id', 
  authenticateToken, 
  authorizePermissions(['screen.users', 'screen.all']), 
  updateUser
);

// حذف مستخدم
router.delete('/users/:id', 
  authenticateToken, 
  authorizePermissions(['screen.users', 'screen.all']), 
  deleteUser
);

// إعادة تعيين كلمة مرور المستخدم
router.put('/users/:id/reset-password', 
  authenticateToken, 
  authorizePermissions(['screen.users', 'screen.all']), 
  resetUserPassword
);

// الحصول على الأدوار
router.get('/roles', 
  authenticateToken, 
  getRoles
);

// إنشاء دور جديد
router.post('/roles',
  authenticateToken,
  authorizePermissions(['screen.users', 'screen.all']),
  createRole
);

// تحديث دور
router.put('/roles/:id',
  authenticateToken,
  authorizePermissions(['screen.users', 'screen.all']),
  updateRole
);

// حذف دور
router.delete('/roles/:id',
  authenticateToken,
  authorizePermissions(['screen.users', 'screen.all']),
  deleteRole
);

export default router;
