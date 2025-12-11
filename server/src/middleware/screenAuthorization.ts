import { Request, Response, NextFunction } from 'express';
import { responseHelper } from '../utils/responseHelper';
import { SCREEN_PERMISSIONS, hasScreenAccess } from '../constants/screenPermissions';

/**
 * Middleware للتحقق من صلاحية الوصول لشاشة معينة
 */
export const authorizeScreen = (screenPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const userPermissions = (req.user.permissions as string[]) || [];

      // التحقق من صلاحية الوصول للشاشة
      if (!hasScreenAccess(userPermissions, screenPermission)) {
        responseHelper.error(res, 'ليس لديك صلاحية الوصول لهذه الشاشة', 403);
        return;
      }

      next();
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من الصلاحيات', 500);
      return;
    }
  };
};

/**
 * Middleware للتحقق من صلاحية الوصول لأي شاشة من قائمة
 */
export const authorizeAnyScreen = (screenPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const userPermissions = (req.user.permissions as string[]) || [];

      // المدير له صلاحية الوصول لكل شيء
      if (userPermissions.includes(SCREEN_PERMISSIONS.ALL)) {
        next();
        return;
      }

      // التحقق من وجود أي صلاحية من القائمة
      const hasAnyAccess = screenPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAnyAccess) {
        responseHelper.error(res, 'ليس لديك صلاحية الوصول لهذا المورد', 403);
        return;
      }

      next();
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من الصلاحيات', 500);
      return;
    }
  };
};

/**
 * Middleware للتحقق من صلاحية الوصول لجميع الشاشات من قائمة
 */
export const authorizeAllScreens = (screenPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        responseHelper.error(res, 'المصادقة مطلوبة', 401);
        return;
      }

      const userPermissions = (req.user.permissions as string[]) || [];

      // المدير له صلاحية الوصول لكل شيء
      if (userPermissions.includes(SCREEN_PERMISSIONS.ALL)) {
        next();
        return;
      }

      // التحقق من وجود جميع الصلاحيات
      const hasAllAccess = screenPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllAccess) {
        responseHelper.error(res, 'ليس لديك جميع الصلاحيات المطلوبة لهذا المورد', 403);
        return;
      }

      next();
    } catch (error) {
      responseHelper.error(res, 'خطأ في التحقق من الصلاحيات', 500);
      return;
    }
  };
};
