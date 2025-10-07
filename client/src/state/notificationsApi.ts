import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";
import { API_CACHE_CONFIG } from "@/lib/config";

// Types
export type NotificationType = 
  | "INFO"
  | "SUCCESS" 
  | "WARNING"
  | "ERROR"
  | "SALE"
  | "STOCK"
  | "USER"
  | "SYSTEM";

export interface Notification {
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
  createdAt: string;
  readAt?: string;
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

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recent: Notification[];
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateNotificationRequest {
  title: string;
  message?: string;
  type?: NotificationType;
  userId: string;
  companyId?: number;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  type?: NotificationType;
  isRead?: boolean;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface MarkAsReadRequest {
  notificationIds: number[];
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
  userId?: string;
  companyId?: number;
  entityType?: string;
  search?: string;
}

export interface BulkCreateNotificationsRequest {
  notifications: CreateNotificationRequest[];
}

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["Notifications", "Notification", "NotificationStats"],
  ...API_CACHE_CONFIG.notifications,
  endpoints: (build) => ({
    // Get notifications with pagination and filters
    getNotifications: build.query<
      { success: boolean; data: PaginatedNotifications },
      GetNotificationsParams
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.type) searchParams.append("type", params.type);
        if (typeof params.isRead === "boolean") searchParams.append("isRead", params.isRead.toString());
        if (params.userId) searchParams.append("userId", params.userId);
        if (params.companyId) searchParams.append("companyId", params.companyId.toString());
        if (params.entityType) searchParams.append("entityType", params.entityType);
        if (params.search) searchParams.append("search", params.search);

        return {
          url: `/notifications?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) => {
        if (result?.data?.notifications) {
          return [
            ...result.data.notifications.map(({ id }) => ({ type: "Notification" as const, id })),
            { type: "Notifications", id: "LIST" },
          ];
        }
        return [{ type: "Notifications", id: "LIST" }];
      },
    }),

    // Get notification statistics
    getNotificationStats: build.query<
      { success: boolean; data: NotificationStats },
      void
    >({
      query: () => ({
        url: "/notifications/stats",
        method: "GET",
      }),
      providesTags: [{ type: "NotificationStats", id: "STATS" }],
    }),

    // Get single notification by ID
    getNotificationById: build.query<
      { success: boolean; data: Notification },
      number
    >({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Notification", id }],
    }),

    // Create new notification
    createNotification: build.mutation<
      { success: boolean; message: string; data: Notification },
      CreateNotificationRequest
    >({
      query: (notification) => ({
        url: "/notifications",
        method: "POST",
        body: notification,
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Bulk create notifications
    bulkCreateNotifications: build.mutation<
      { success: boolean; message: string; data: Notification[] },
      BulkCreateNotificationsRequest
    >({
      query: (data) => ({
        url: "/notifications/bulk",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Update notification
    updateNotification: build.mutation<
      { success: boolean; message: string; data: Notification },
      { id: number; data: UpdateNotificationRequest }
    >({
      query: ({ id, data }) => ({
        url: `/notifications/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Notification", id },
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Mark notifications as read
    markAsRead: build.mutation<
      { success: boolean; message: string; data: { updated: number } },
      MarkAsReadRequest
    >({
      query: (data) => ({
        url: "/notifications/mark-read",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Mark all notifications as read
    markAllAsRead: build.mutation<
      { success: boolean; message: string; data: { updated: number } },
      { userId?: string }
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.userId) searchParams.append("userId", params.userId);

        return {
          url: `/notifications/mark-all-read?${searchParams.toString()}`,
          method: "PATCH",
        };
      },
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Delete notification
    deleteNotification: build.mutation<
      { success: boolean; message: string },
      number
    >({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Notification", id },
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),

    // Cleanup old notifications (admin only)
    cleanupOldNotifications: build.mutation<
      { success: boolean; message: string; data: { deleted: number } },
      { days?: number }
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.days) searchParams.append("days", params.days.toString());

        return {
          url: `/notifications/cleanup/old?${searchParams.toString()}`,
          method: "DELETE",
        };
      },
      invalidatesTags: [
        { type: "Notifications", id: "LIST" },
        { type: "NotificationStats", id: "STATS" },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useGetNotificationByIdQuery,
  useCreateNotificationMutation,
  useBulkCreateNotificationsMutation,
  useUpdateNotificationMutation,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useCleanupOldNotificationsMutation,
} = notificationsApi;
