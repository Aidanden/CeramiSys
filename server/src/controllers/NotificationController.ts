import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import {
  CreateNotificationSchema,
  UpdateNotificationSchema,
  GetNotificationsSchema,
  MarkAsReadSchema,
  BulkCreateNotificationsSchema
} from '../dto/notificationDto';
import { AuthRequest } from '../middleware/auth';

const notificationService = new NotificationService();

/**
 * إنشاء إشعار جديد
 */
export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = CreateNotificationSchema.parse(req.body);
    
    const notification = await notificationService.createNotification(validatedData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإشعار بنجاح',
      data: notification
    });
  } catch (error: any) {
    console.error('خطأ في إنشاء الإشعار:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * إنشاء إشعارات متعددة
 */
export const bulkCreateNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = BulkCreateNotificationsSchema.parse(req.body);
    
    const notifications = await notificationService.bulkCreateNotifications(validatedData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإشعارات بنجاح',
      data: notifications
    });
  } catch (error: any) {
    console.error('خطأ في إنشاء الإشعارات المتعددة:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * جلب الإشعارات مع الفلترة والترقيم
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      type: req.query.type as string,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      userId: req.query.userId as string,
      companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
      entityType: req.query.entityType as string,
      search: req.query.search as string
    };

    const validatedQuery = GetNotificationsSchema.parse(query);
    
    const result = await notificationService.getNotifications(
      validatedQuery,
      req.user!.userId,
      req.user!.companyId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('خطأ في جلب الإشعارات:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'معاملات البحث غير صحيحة',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * جلب إحصائيات الإشعارات
 */
export const getNotificationStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await notificationService.getNotificationStats(
      req.user!.userId,
      req.user!.companyId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('خطأ في جلب إحصائيات الإشعارات:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * جلب إشعار واحد
 */
export const getNotificationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id!);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'معرف الإشعار غير صحيح'
      });
      return;
    }

    // جلب الإشعار مع التحقق من الصلاحية
    const result = await notificationService.getNotifications(
      { page: 1, limit: 1 },
      req.user!.userId,
      req.user!.companyId,
      req.user!.isSystemUser || false
    );

    const notification = result.notifications.find((n: any) => n.id === id);
    
    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود أو ليس لديك صلاحية للوصول إليه'
      });
      return;
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error('خطأ في جلب الإشعار:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * تحديث إشعار
 */
export const updateNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id!);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'معرف الإشعار غير صحيح'
      });
      return;
    }

    const validatedData = UpdateNotificationSchema.parse(req.body);
    
    const notification = await notificationService.updateNotification(
      id,
      validatedData,
      req.user!.userId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      message: 'تم تحديث الإشعار بنجاح',
      data: notification
    });
  } catch (error: any) {
    console.error('خطأ في تحديث الإشعار:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * تمييز إشعارات كمقروءة
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = MarkAsReadSchema.parse(req.body);
    
    const result = await notificationService.markAsRead(
      validatedData,
      req.user!.userId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      message: 'تم تمييز الإشعارات كمقروءة',
      data: result
    });
  } catch (error: any) {
    console.error('خطأ في تمييز الإشعارات كمقروءة:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * تمييز جميع الإشعارات كمقروءة
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || req.user!.userId;
    
    const result = await notificationService.markAllAsRead(
      userId,
      req.user!.userId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      message: 'تم تمييز جميع الإشعارات كمقروءة',
      data: result
    });
  } catch (error: any) {
    console.error('خطأ في تمييز جميع الإشعارات كمقروءة:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * حذف إشعار
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id!);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'معرف الإشعار غير صحيح'
      });
      return;
    }

    await notificationService.deleteNotification(
      id,
      req.user!.userId,
      req.user!.isSystemUser || false
    );

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
  } catch (error: any) {
    console.error('خطأ في حذف الإشعار:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};

/**
 * تنظيف الإشعارات القديمة (للمشرفين فقط)
 */
export const cleanupOldNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // التحقق من أن المستخدم مشرف نظام
    if (!req.user!.isSystemUser) {
      res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
      });
      return;
    }

    const daysOld = parseInt(req.query.days as string) || 30;
    
    const result = await notificationService.cleanupOldNotifications(daysOld);

    res.json({
      success: true,
      message: 'تم تنظيف الإشعارات القديمة بنجاح',
      data: result
    });
  } catch (error: any) {
    console.error('خطأ في تنظيف الإشعارات القديمة:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
};
