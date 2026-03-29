"use client";

import React, { useState } from 'react';
import {
  Bell,
  Check,
  X,
  Eye,
  Trash2,
  CheckCheck,
  Filter,
  Search,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useCreateNotificationMutation,
  type Notification,
  type NotificationType
} from '@/state/notificationsApi';
import { useAppSelector } from '@/app/redux';
import PermissionGuard from '@/components/PermissionGuard';

// Helper functions (same as NotificationDropdown)
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS': return '✅';
    case 'ERROR': return '❌';
    case 'WARNING': return '⚠️';
    case 'SALE': return '💰';
    case 'STOCK': return '📦';
    case 'USER': return '👤';
    case 'SYSTEM': return '⚙️';
    default: return 'ℹ️';
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS': return 'text-green-600 bg-green-50 border-green-200';
    case 'ERROR': return 'text-red-600 bg-red-50 border-red-200';
    case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'SALE': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'STOCK': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'USER': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'SYSTEM': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const NotificationsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentUser = useAppSelector((state) => state.auth.user);
  const limit = 20;

  // API calls - هذه الصفحة محمية بـ PermissionGuard لذلك لا حاجة لـ skip
  const { data: statsData } = useGetNotificationStatsQuery();
  const {
    data: notificationsData,
    isLoading,
    refetch
  } = useGetNotificationsQuery({
    page: currentPage,
    limit,
    isRead: selectedTab === 'unread' ? false : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    search: searchQuery || undefined
  });

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [createNotification] = useCreateNotificationMutation();

  const stats = statsData?.data;
  const notifications = notificationsData?.data?.notifications || [];
  const pagination = notificationsData?.data?.pagination;

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead({ notificationIds: [notificationId] }).unwrap();
      refetch();
    } catch (error) {
      console.error('خطأ في تمييز الإشعار كمقروء:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({}).unwrap();
      refetch();
    } catch (error) {
      console.error('خطأ في تمييز جميع الإشعارات كمقروءة:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      try {
        await deleteNotification(notificationId).unwrap();
        refetch();
      } catch (error) {
        console.error('خطأ في حذف الإشعار:', error);
      }
    }
  };

  // Handle create notification (for testing)
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    try {
      await createNotification({
        title: formData.get('title') as string,
        message: formData.get('message') as string,
        type: formData.get('type') as NotificationType,
        userId: currentUser?.id || '',
      }).unwrap();

      setShowCreateModal(false);
      refetch();
    } catch (error) {
      console.error('خطأ في إنشاء الإشعار:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <PermissionGuard requiredPermission="screen.notifications">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-text-primary flex items-center gap-2">
                <Bell className="w-6 h-6" />
                الإشعارات
              </h1>
              <p className="text-slate-500 dark:text-text-secondary mt-1">إدارة جميع الإشعارات والتنبيهات</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary hover:bg-slate-100 dark:hover:bg-surface-hover rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                إشعار جديد
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-surface-primary p-4 rounded-lg border border-slate-200 dark:border-border-primary shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">إجمالي الإشعارات</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-text-primary">{stats.total}</p>
                  </div>
                  <Bell className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary p-4 rounded-lg border border-slate-200 dark:border-border-primary shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">غير مقروءة</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.unread}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 font-bold">{stats.unread}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary p-4 rounded-lg border border-slate-200 dark:border-border-primary shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">مقروءة</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total - stats.unread}</p>
                  </div>
                  <Check className="w-8 h-8 text-green-500 dark:text-green-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary p-4 rounded-lg border border-slate-200 dark:border-border-primary shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">المبيعات</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byType.SALE || 0}</p>
                  </div>
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-surface-primary p-4 rounded-lg border border-slate-200 dark:border-border-primary shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-text-tertiary w-4 h-4" />
                <input
                  type="text"
                  placeholder="البحث في الإشعارات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 space-x-reverse">
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${selectedTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                الكل ({stats?.total || 0})
              </button>
              <button
                onClick={() => setSelectedTab('unread')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${selectedTab === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                غير مقروءة ({stats?.unread || 0})
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as NotificationType | 'all')}
              className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
            >
              <option value="all">جميع الأنواع</option>
              <option value="INFO">معلومات</option>
              <option value="SUCCESS">نجاح</option>
              <option value="WARNING">تحذير</option>
              <option value="ERROR">خطأ</option>
              <option value="SALE">مبيعات</option>
              <option value="STOCK">مخزون</option>
              <option value="USER">مستخدمين</option>
              <option value="SYSTEM">نظام</option>
            </select>

            {/* Mark All as Read */}
            {stats && stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                تمييز الكل كمقروء
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-surface-primary rounded-lg border border-slate-200 dark:border-border-primary shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-text-secondary">جاري التحميل...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-text-tertiary" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-text-primary mb-2">لا توجد إشعارات</h3>
              <p className="text-slate-500 dark:text-text-secondary">
                {selectedTab === 'unread'
                  ? 'لا توجد إشعارات غير مقروءة'
                  : 'لم يتم العثور على إشعارات'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 dark:divide-border-primary">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10 border-r-4 border-blue-500 dark:border-blue-600' : ''
                      }`}    >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h3 className={`text-lg font-medium ${!notification.isRead ? 'text-slate-900 dark:text-text-primary' : 'text-slate-700 dark:text-text-secondary'
                            }`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          )}
                        </div>

                        {notification.message && (
                          <p className="text-slate-600 dark:text-text-secondary mb-3 leading-relaxed">
                            {notification.message}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full border ${getNotificationColor(notification.type)
                              }`}>
                              {notification.type}
                            </span>
                          </div>

                          {notification.user && (
                            <span className="text-sm text-slate-500 dark:text-text-tertiary">
                              بواسطة: {notification.user.FullName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mr-4">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="p-2 text-slate-400 dark:text-text-tertiary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="تمييز كمقروء"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="p-2 text-slate-400 dark:text-text-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 dark:border-border-primary flex items-center justify-between">
                  <div className="text-sm text-slate-500 dark:text-text-secondary">
                    عرض {((currentPage - 1) * limit) + 1} إلى {Math.min(currentPage * limit, pagination.total)} من {pagination.total} إشعار
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-border-primary rounded-lg hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      السابق
                    </button>

                    <span className="px-3 py-1 text-sm">
                      {currentPage} من {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-border-primary rounded-lg hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Notification Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-surface-primary rounded-lg p-6 w-full max-w-md mx-4 border border-slate-200 dark:border-border-primary shadow-xl">
              <h3 className="text-lg font-medium text-slate-900 dark:text-text-primary mb-4">إنشاء إشعار جديد</h3>

              <form onSubmit={handleCreateNotification}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      العنوان *
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      الرسالة
                    </label>
                    <textarea
                      name="message"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-text-secondary mb-1">
                      النوع *
                    </label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none transition-all"
                    >
                      <option value="INFO">معلومات</option>
                      <option value="SUCCESS">نجاح</option>
                      <option value="WARNING">تحذير</option>
                      <option value="ERROR">خطأ</option>
                      <option value="SALE">مبيعات</option>
                      <option value="STOCK">مخزون</option>
                      <option value="USER">مستخدمين</option>
                      <option value="SYSTEM">نظام</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-slate-800 dark:hover:text-text-primary transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    إنشاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
};

export default NotificationsPage;
