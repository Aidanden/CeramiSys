import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../models/prismaClient';
import { responseHelper } from '../utils/responseHelper';

interface JwtPayload {
  userId: string;
  companyId: number;
  roleId: string;
  isSystemUser?: boolean;
}

interface StoreJwtPayload {
  id: string;
  storeId: number;
  username: string;
  type: string;
}

// تعريف نوع AuthRequest
export interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId: string;
    companyId: number;
    roleId: string;
    roleName?: string;
    permissions?: any;
    isSystemUser?: boolean;
  };
  storeUser?: {
    id: string;
    storeId: number;
    username: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        userId: string;
        companyId: number;
        roleId: string;
        roleName?: string;
        permissions?: any;
        isSystemUser?: boolean;
      };
      storeUser?: {
        id: string;
        storeId: number;
        username: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Auth Debug:', {
        path: req.path,
        authHeader: authHeader ? 'exists' : 'null',
        token: token ? 'exists' : 'null'
      });
    }

    if (!token) {
      responseHelper.error(res, 'رمز المصادقة مطلوب', 401);
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'] || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    const user = await prisma.users.findFirst({
      where: {
        UserID: decoded.userId,
        IsActive: true,
      },
      include: {
        Role: {
          select: {
            RoleName: true,
            Permissions: true,
          }
        },
        Sessions: {
          where: {
            Token: token,
            IsActive: true,
            ExpiresAt: {
              gt: new Date()
            }
          }
        }
      }
    });

    if (!user) {
      responseHelper.error(res, 'المستخدم غير موجود أو غير نشط', 401);
      return;
    }

    if (user.Sessions.length === 0) {
      responseHelper.error(res, 'الجلسة منتهية الصلاحية أو غير صحيحة', 401);
      return;
    }

    // تحويل Permissions من JSON إلى array
    // أولوية للـ Permissions المباشرة من المستخدم، ثم من الـ Role
    let permissions: string[] = [];
    const userPermissions = (user as any).Permissions;
    const rolePermissions = user.Role?.Permissions;

    // استخدام permissions المستخدم إذا كانت موجودة، وإلا استخدم permissions الـ Role
    const permissionsSource = userPermissions || rolePermissions;

    if (permissionsSource) {
      if (Array.isArray(permissionsSource)) {
        permissions = (permissionsSource as any[]).filter(p => typeof p === 'string') as string[];
      } else if (typeof permissionsSource === 'object') {
        // إذا كان JSON object، نحوله لـ array
        permissions = Object.values(permissionsSource as any).filter(p => typeof p === 'string') as string[];
      }
    }

    // إضافة معلومات المستخدم إلى الطلب
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      companyId: decoded.companyId,
      roleId: decoded.roleId,
      roleName: user.Role?.RoleName || 'مستخدم',
      permissions: permissions,
      isSystemUser: decoded.isSystemUser || user.IsSystemUser,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      responseHelper.error(res, 'رمز المصادقة غير صحيح', 401);
      return;
    }
    responseHelper.error(res, 'خطأ في المصادقة', 500);
    return;
  }
};

/**
 * Middleware للمصادقة الخاصة بمستخدمي المحلات الخارجية
 */
export const authenticateStoreToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      responseHelper.error(res, 'رمز المصادقة مطلوب', 401);
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'] || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as StoreJwtPayload;

    // التحقق من أن التوكن من نوع store
    if (decoded.type !== 'store') {
      responseHelper.error(res, 'رمز المصادقة غير صحيح', 401);
      return;
    }

    // التحقق من الجلسة
    const session = await prisma.externalStoreSession.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          include: {
            store: true
          }
        }
      }
    });

    if (!session) {
      responseHelper.error(res, 'الجلسة منتهية الصلاحية أو غير صحيحة', 401);
      return;
    }

    if (!session.user.isActive) {
      responseHelper.error(res, 'الحساب غير نشط', 403);
      return;
    }

    if (!session.user.store.isActive) {
      responseHelper.error(res, 'المحل غير نشط', 403);
      return;
    }

    // إضافة معلومات مستخدم المحل إلى الطلب
    req.storeUser = {
      id: session.user.id,
      storeId: session.user.storeId,
      username: session.user.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      responseHelper.error(res, 'رمز المصادقة غير صحيح', 401);
      return;
    }
    responseHelper.error(res, 'خطأ في المصادقة', 500);
    return;
  }
};