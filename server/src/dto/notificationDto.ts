import { z } from 'zod';

// Enums
export const NotificationTypeEnum = z.enum([
  'INFO',
  'SUCCESS', 
  'WARNING',
  'ERROR',
  'SALE',
  'STOCK',
  'USER',
  'SYSTEM'
]);

export type NotificationType = z.infer<typeof NotificationTypeEnum>;

// Create Notification DTO
export const CreateNotificationSchema = z.object({
  title: z.string().min(1, 'عنوان الإشعار مطلوب').max(255, 'عنوان الإشعار طويل جداً'),
  message: z.string().max(1000, 'نص الإشعار طويل جداً').optional(),
  type: NotificationTypeEnum.default('INFO'),
  userId: z.string().min(1, 'معرف المستخدم مطلوب'),
  companyId: z.number().int().positive().optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(255).optional(),
  actionUrl: z.string().url('رابط غير صحيح').optional().or(z.literal(''))
});

export type CreateNotificationRequest = z.infer<typeof CreateNotificationSchema>;

// Update Notification DTO
export const UpdateNotificationSchema = z.object({
  title: z.string().min(1, 'عنوان الإشعار مطلوب').max(255, 'عنوان الإشعار طويل جداً').optional(),
  message: z.string().max(1000, 'نص الإشعار طويل جداً').optional(),
  type: NotificationTypeEnum.optional(),
  isRead: z.boolean().optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().max(255).optional(),
  actionUrl: z.string().url('رابط غير صحيح').optional().or(z.literal(''))
});

export type UpdateNotificationRequest = z.infer<typeof UpdateNotificationSchema>;

// Mark as Read DTO
export const MarkAsReadSchema = z.object({
  notificationIds: z.array(z.number().int().positive()).min(1, 'يجب تحديد إشعار واحد على الأقل')
});

export type MarkAsReadRequest = z.infer<typeof MarkAsReadSchema>;

// Query Notifications DTO
export const GetNotificationsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  type: NotificationTypeEnum.optional(),
  isRead: z.boolean().optional(),
  userId: z.string().optional(),
  companyId: z.number().int().positive().optional(),
  entityType: z.string().optional(),
  search: z.string().max(255).optional()
});

export type GetNotificationsRequest = z.infer<typeof GetNotificationsSchema>;

// Bulk Create Notifications DTO
export const BulkCreateNotificationsSchema = z.object({
  notifications: z.array(CreateNotificationSchema).min(1, 'يجب إضافة إشعار واحد على الأقل').max(100, 'لا يمكن إضافة أكثر من 100 إشعار في المرة الواحدة')
});

export type BulkCreateNotificationsRequest = z.infer<typeof BulkCreateNotificationsSchema>;

// Response DTOs
export interface NotificationResponse {
  id: number;
  title: string;
  message?: string;
  type: NotificationType;
  isRead: boolean;
  userId: string;
  companyId?: number;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
  user?: {
    UserID: string;
    UserName: string;
    FullName: string;
  };
  company?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface NotificationStatsResponse {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recent: NotificationResponse[];
}

export interface PaginatedNotificationsResponse {
  notifications: NotificationResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper function to create system notifications
export const createSystemNotification = (
  userId: string,
  title: string,
  message?: string,
  companyId?: number,
  actionUrl?: string
): CreateNotificationRequest => ({
  title,
  message,
  type: 'SYSTEM',
  userId,
  companyId,
  entityType: 'system',
  actionUrl
});

// Helper function to create sale notifications
export const createSaleNotification = (
  userId: string,
  saleId: string,
  title: string,
  message?: string,
  companyId?: number
): CreateNotificationRequest => ({
  title,
  message,
  type: 'SALE',
  userId,
  companyId,
  entityType: 'sale',
  entityId: saleId,
  actionUrl: `/sales/${saleId}`
});

// Helper function to create stock notifications
export const createStockNotification = (
  userId: string,
  productId: string,
  title: string,
  message?: string,
  companyId?: number
): CreateNotificationRequest => ({
  title,
  message,
  type: 'STOCK',
  userId,
  companyId,
  entityType: 'product',
  entityId: productId,
  actionUrl: `/products/${productId}`
});
