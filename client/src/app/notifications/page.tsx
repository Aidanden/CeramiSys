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

  // API calls
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6" />
              الإشعارات
            </h1>
            <p className="text-gray-600 mt-1">إدارة جميع الإشعارات والتنبيهات</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إشعار جديد
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الإشعارات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">غير مقروءة</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold">{stats.unread}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">مقروءة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.total - stats.unread}</p>
                </div>
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المبيعات</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.byType.SALE || 0}</p>
                </div>
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الإشعارات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 space-x-reverse">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الكل ({stats?.total || 0})
            </button>
            <button
              onClick={() => setSelectedTab('unread')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedTab === 'unread'
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد إشعارات</h3>
            <p className="text-gray-500">
              {selectedTab === 'unread' 
                ? 'لا توجد إشعارات غير مقروءة' 
                : 'لم يتم العثور على إشعارات'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <h3 className={`text-lg font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      
                      {notification.message && (
                        <p className="text-gray-600 mb-3 leading-relaxed">
                          {notification.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          <span className={`text-xs px-3 py-1 rounded-full border ${
                            getNotificationColor(notification.type)
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                        
                        {notification.user && (
                          <span className="text-sm text-gray-500">
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
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  عرض {((currentPage - 1) * limit) + 1} إلى {Math.min(currentPage * limit, pagination.total)} من {pagination.total} إشعار
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  
                  <span className="px-3 py-1 text-sm">
                    {currentPage} من {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">إنشاء إشعار جديد</h3>
            
            <form onSubmit={handleCreateNotification}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    العنوان *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="rtl"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرسالة
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="rtl"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    النوع *
                  </label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إنشاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
