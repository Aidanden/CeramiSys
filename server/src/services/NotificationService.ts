import { PrismaClient } from '@prisma/client';
import {
  CreateNotificationRequest,
  UpdateNotificationRequest,
  GetNotificationsRequest,
  MarkAsReadRequest,
  BulkCreateNotificationsRequest,
  NotificationResponse,
  NotificationStatsResponse,
  PaginatedNotificationsResponse
} from '../dto/notificationDto';

export class NotificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * تحويل نتيجة Prisma إلى NotificationResponse
   */
  private transformNotification(notification: any): NotificationResponse {
    return {
      ...notification,
      message: notification.message ?? undefined,
      companyId: notification.companyId ?? undefined,
      entityType: notification.entityType ?? undefined,
      entityId: notification.entityId ?? undefined,
      actionUrl: notification.actionUrl ?? undefined,
      readAt: notification.readAt ?? undefined,
      company: notification.company ?? undefined,
      user: notification.user ?? undefined
    };
  }

  /**
   * إنشاء إشعار جديد
   */
  async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    try {
      // التحقق من وجود المستخدم
      const user = await this.prisma.users.findUnique({
        where: { UserID: data.userId }
      });

      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      // التحقق من وجود الشركة إذا تم تحديدها
      if (data.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: data.companyId }
        });

        if (!company) {
          throw new Error('الشركة غير موجودة');
        }
      }

      const notification = await this.prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          userId: data.userId,
          companyId: data.companyId,
          entityType: data.entityType,
          entityId: data.entityId,
          actionUrl: data.actionUrl
        },
        include: {
          user: {
            select: {
              UserID: true,
              UserName: true,
              FullName: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      return this.transformNotification(notification);
    } catch (error) {
      console.error('خطأ في إنشاء الإشعار:', error);
      throw new Error('فشل في إنشاء الإشعار');
    }
  }

  /**
   * إنشاء إشعارات متعددة
   */
  async bulkCreateNotifications(data: BulkCreateNotificationsRequest): Promise<NotificationResponse[]> {
    try {
      const notifications = await Promise.all(
        data.notifications.map(notification => this.createNotification(notification))
      );

      return notifications;
    } catch (error) {
      console.error('خطأ في إنشاء الإشعارات المتعددة:', error);
      throw new Error('فشل في إنشاء الإشعارات');
    }
  }

  /**
   * جلب الإشعارات مع الفلترة والترقيم
   */
  async getNotifications(
    params: GetNotificationsRequest,
    requestingUserId: string,
    userCompanyId: number,
    isSystemUser: boolean
  ): Promise<PaginatedNotificationsResponse> {
    try {
      const { page, limit, type, isRead, userId, companyId, entityType, search } = params;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: any = {};

      // إذا لم يكن مستخدم نظام، يرى إشعاراته فقط أو إشعارات شركته
      if (!isSystemUser) {
        where.OR = [
          { userId: requestingUserId }, // إشعاراته الشخصية
          { 
            companyId: userCompanyId,
            userId: { not: requestingUserId } // إشعارات الشركة للآخرين (اختياري)
          }
        ];
      } else {
        // مستخدم النظام يرى جميع الإشعارات أو حسب الفلاتر
        if (userId) {
          where.userId = userId;
        }
        if (companyId) {
          where.companyId = companyId;
        }
      }

      // فلاتر إضافية
      if (type) {
        where.type = type;
      }

      if (typeof isRead === 'boolean') {
        where.isRead = isRead;
      }

      if (entityType) {
        where.entityType = entityType;
      }

      if (search) {
        where.OR = [
          ...(where.OR || []),
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } }
        ];
      }

      // جلب الإشعارات
      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                UserID: true,
                UserName: true,
                FullName: true
              }
            },
            company: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }),
        this.prisma.notification.count({ where })
      ]);

      return {
        notifications: notifications.map(n => this.transformNotification(n)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      throw new Error('فشل في جلب الإشعارات');
    }
  }

  /**
   * جلب إحصائيات الإشعارات
   */
  async getNotificationStats(
    userId: string,
    companyId: number,
    isSystemUser: boolean
  ): Promise<NotificationStatsResponse> {
    try {
      const where: any = {};

      // إذا لم يكن مستخدم نظام، يرى إشعاراته فقط
      if (!isSystemUser) {
        where.userId = userId;
      } else {
        // مستخدم النظام يرى جميع الإشعارات
        // يمكن إضافة فلتر للشركة هنا إذا لزم الأمر
      }

      // إحصائيات عامة
      const [total, unread] = await Promise.all([
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({ 
          where: { ...where, isRead: false } 
        })
      ]);

      // إحصائيات حسب النوع
      const typeStats = await this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: {
          type: true
        }
      });

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat.type] = stat._count.type;
      });

      // أحدث الإشعارات
      const recent = await this.prisma.notification.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              UserID: true,
              UserName: true,
              FullName: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      return {
        total,
        unread,
        byType: byType as Record<any, number>,
        recent: recent.map(n => this.transformNotification(n))
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الإشعارات:', error);
      throw new Error('فشل في جلب إحصائيات الإشعارات');
    }
  }

  /**
   * تحديث إشعار
   */
  async updateNotification(
    id: number,
    data: UpdateNotificationRequest,
    requestingUserId: string,
    isSystemUser: boolean
  ): Promise<NotificationResponse> {
    try {
      // التحقق من وجود الإشعار والصلاحية
      const existingNotification = await this.prisma.notification.findUnique({
        where: { id }
      });

      if (!existingNotification) {
        throw new Error('الإشعار غير موجود');
      }

      // التحقق من الصلاحية (المستخدم يمكنه تعديل إشعاراته فقط أو مستخدم النظام)
      if (!isSystemUser && existingNotification.userId !== requestingUserId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا الإشعار');
      }

      const notification = await this.prisma.notification.update({
        where: { id },
        data: {
          ...data,
          readAt: data.isRead === true && !existingNotification.isRead ? new Date() : undefined
        },
        include: {
          user: {
            select: {
              UserID: true,
              UserName: true,
              FullName: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      return this.transformNotification(notification);
    } catch (error) {
      console.error('خطأ في تحديث الإشعار:', error);
      throw error;
    }
  }

  /**
   * تمييز إشعارات كمقروءة
   */
  async markAsRead(
    data: MarkAsReadRequest,
    requestingUserId: string,
    isSystemUser: boolean
  ): Promise<{ updated: number }> {
    try {
      const where: any = {
        id: { in: data.notificationIds },
        isRead: false
      };

      // إذا لم يكن مستخدم نظام، يمكنه تمييز إشعاراته فقط
      if (!isSystemUser) {
        where.userId = requestingUserId;
      }

      const result = await this.prisma.notification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { updated: result.count };
    } catch (error) {
      console.error('خطأ في تمييز الإشعارات كمقروءة:', error);
      throw new Error('فشل في تمييز الإشعارات كمقروءة');
    }
  }

  /**
   * تمييز جميع إشعارات المستخدم كمقروءة
   */
  async markAllAsRead(
    userId: string,
    requestingUserId: string,
    isSystemUser: boolean
  ): Promise<{ updated: number }> {
    try {
      // التحقق من الصلاحية
      if (!isSystemUser && userId !== requestingUserId) {
        throw new Error('ليس لديك صلاحية لتمييز إشعارات مستخدم آخر');
      }

      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { updated: result.count };
    } catch (error) {
      console.error('خطأ في تمييز جميع الإشعارات كمقروءة:', error);
      throw error;
    }
  }

  /**
   * حذف إشعار
   */
  async deleteNotification(
    id: number,
    requestingUserId: string,
    isSystemUser: boolean
  ): Promise<void> {
    try {
      // التحقق من وجود الإشعار والصلاحية
      const existingNotification = await this.prisma.notification.findUnique({
        where: { id }
      });

      if (!existingNotification) {
        throw new Error('الإشعار غير موجود');
      }

      // التحقق من الصلاحية
      if (!isSystemUser && existingNotification.userId !== requestingUserId) {
        throw new Error('ليس لديك صلاحية لحذف هذا الإشعار');
      }

      await this.prisma.notification.delete({
        where: { id }
      });
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
      throw error;
    }
  }

  /**
   * حذف إشعارات قديمة (تنظيف)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true // حذف المقروءة فقط
        }
      });

      return { deleted: result.count };
    } catch (error) {
      console.error('خطأ في تنظيف الإشعارات القديمة:', error);
      throw new Error('فشل في تنظيف الإشعارات القديمة');
    }
  }
}
