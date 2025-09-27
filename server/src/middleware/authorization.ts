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

      // إذا كان لدى المستخدم صلاحية "all"، يُسمح له بكل شيء
      if (userPermissions.includes('all')) {
        next();
        return;
      }

      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        responseHelper.error(res, 'ليس لديك الصلاحيات المطلوبة لهذا الإجراء', 403);
        return;
      }

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
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const userCompany = await prisma.company.findUnique({
          where: { id: req.user.companyId }
        });

        const targetCompany = await prisma.company.findUnique({
          where: { id: targetCompanyId }
        });

        // إذا كان المستخدم من شركة أم والشركة المستهدفة تابعة لها
        if (userCompany?.isParent && targetCompany?.parentId === req.user.companyId) {
          await prisma.$disconnect();
          next();
          return;
        }

        await prisma.$disconnect();
      }

      responseHelper.error(res, 'ليس لديك صلاحية للوصول إلى بيانات هذه الشركة', 403);
      return;
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من صلاحية الشركة', 500);
      return;
    }
  };
};
