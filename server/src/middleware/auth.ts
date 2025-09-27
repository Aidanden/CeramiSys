import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { responseHelper } from '../utils/responseHelper';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  companyId: number;
  roleId: string;
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

    if (!token) {
      responseHelper.error(res, 'رمز المصادقة مطلوب', 401);
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'] || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // التحقق من صحة المستخدم ونشاط الجلسة
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

    // إضافة معلومات المستخدم إلى الطلب
    req.user = {
      id: decoded.userId, // إضافة id للتوافق مع الكود الموجود
      userId: decoded.userId,
      companyId: decoded.companyId,
      roleId: decoded.roleId,
      roleName: user.Role.RoleName,
      permissions: user.Role.Permissions,
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