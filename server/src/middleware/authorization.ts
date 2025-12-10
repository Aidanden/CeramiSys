import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '../utils/responseHelper';

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const userRole = req.user.roleName;

      if (!userRole || !allowedRoles.includes(userRole)) {
        responseHelper.error(res, 'ليس لديك صلاحية للوصول إلى هذا المورد', 403);
        return;
      }

      next();
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من الصلاحيات', 500);
      return;
    }
  };
};

export const authorizePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const userPermissions = req.user.permissions as string[] || [];

      console.log('🔐 Authorization Check:', {
        userId: req.user.userId,
        userPermissions,
        requiredPermissions,
        path: req.path
      });

      // إذا كان لدى المستخدم صلاحية "all" أو "screen.all"، يُسمح له بكل شيء
      if (userPermissions.includes('all') || userPermissions.includes('screen.all')) {
        console.log('✅ Access granted: User has "all" or "screen.all" permission');
        next();
        return;
      }

      // التحقق من أن المستخدم لديه واحدة على الأقل من الصلاحيات المطلوبة
      const hasPermission = requiredPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        console.log('❌ Access denied: User lacks required permissions');
        responseHelper.error(res, 'ليس لديك الصلاحيات المطلوبة لهذا الإجراء', 403);
        return;
      }

      console.log('✅ Access granted: User has required permission');

      next();
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من الصلاحيات', 500);
      return;
    }
  };
};

// middleware للتحقق من أن المستخدم ينتمي لنفس الشركة أو شركة أم
export const authorizeCompanyAccess = (allowParentCompany: boolean = true) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const targetCompanyId = parseInt(req.params['companyId'] as string) ||
        parseInt(req.body.companyId) ||
        req.user.companyId;

      // إذا كان المستخدم من نفس الشركة
      if (req.user.companyId === targetCompanyId) {
        next();
        return;
      }

      // إذا كان allowParentCompany = true، تحقق من أن الشركة المستهدفة تابعة للشركة الأم
      if (allowParentCompany) {
        const { default: prisma } = await import('../models/prismaClient'); // Dynamic import for singleton

        const userCompany = await prisma.company.findUnique({
          where: { id: req.user.companyId }
        });

        const targetCompany = await prisma.company.findUnique({
          where: { id: targetCompanyId }
        });

        // إذا كان المستخدم من شركة أم والشركة المستهدفة تابعة لها
        if (userCompany?.isParent && targetCompany?.parentId === req.user.companyId) {
          next();
          return;
        }
      }

      responseHelper.error(res, 'ليس لديك صلاحية للوصول إلى بيانات هذه الشركة', 403);
      return;
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من صلاحية الشركة', 500);
      return;
    }
  };
};
