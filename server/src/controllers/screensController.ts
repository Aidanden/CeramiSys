import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  SCREEN_METADATA,
  CATEGORY_NAMES,
  getAuthorizedScreens,
  getScreensByCategory as getScreensByCategoryUtil
} from '../constants/screenPermissions';

/**
 * الحصول على جميع الشاشات المتاحة في النظام
 * GET /api/screens
 */
export const getAllScreens = async (req: Request, res: Response): Promise<void> => {
  try {
    // تجميع الشاشات حسب الفئة
    const screensByCategory = SCREEN_METADATA.reduce((acc, screen) => {
      if (!acc[screen.category]) {
        acc[screen.category] = [];
      }
      acc[screen.category]!.push(screen);
      return acc;
    }, {} as Record<string, typeof SCREEN_METADATA>);

    res.json({
      success: true,
      data: {
        screens: SCREEN_METADATA,
        screensByCategory,
        categories: CATEGORY_NAMES
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على الشاشات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * الحصول على الشاشات المصرح بها للمستخدم الحالي
 * GET /api/users/me/screens
 */
export const getUserScreens = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح'
      });
      return;
    }

    // التعامل مع permissions سواء كان JSON object أو array
    let userPermissions: string[] = [];
    if (req.user.permissions) {
      if (Array.isArray(req.user.permissions)) {
        userPermissions = req.user.permissions;
      } else if (typeof req.user.permissions === 'object') {
        // إذا كان JSON object من Prisma
        userPermissions = Object.values(req.user.permissions as any).filter(p => typeof p === 'string') as string[];
      }
    }

    console.log('User permissions:', userPermissions); // للتشخيص
    
    const authorizedScreens = getAuthorizedScreens(userPermissions);

    // تجميع الشاشات المصرح بها حسب الفئة
    const screensByCategory = authorizedScreens.reduce((acc, screen) => {
      if (!acc[screen.category]) {
        acc[screen.category] = [];
      }
      acc[screen.category]!.push(screen);
      return acc;
    }, {} as Record<string, typeof authorizedScreens>);

    res.json({
      success: true,
      data: {
        screens: authorizedScreens,
        screensByCategory,
        categories: CATEGORY_NAMES,
        hasAllAccess: userPermissions.includes('screen.all')
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على شاشات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

/**
 * الحصول على الشاشات حسب الفئة
 * GET /api/screens/category/:category
 */
export const getScreensByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    if (!category || !CATEGORY_NAMES[category]) {
      res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
      return;
    }

    const screens = getScreensByCategoryUtil(category);

    res.json({
      success: true,
      data: {
        category,
        categoryName: CATEGORY_NAMES[category],
        screens
      }
    });
  } catch (error) {
    console.error('خطأ في الحصول على شاشات الفئة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};
