"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, Eye, Trash2, CheckCheck } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  type Notification,
  type NotificationType
} from '@/state/notificationsApi';
import { useAppSelector } from '@/app/redux';

// Helper function to get notification icon
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS':
      return '✅';
    case 'ERROR':
      return '❌';
    case 'WARNING':
      return '⚠️';
    case 'SALE':
      return '💰';
    case 'STOCK':
      return '📦';
    case 'USER':
      return '👤';
    case 'SYSTEM':
      return '⚙️';
    default:
      return 'ℹ️';
  }
};

// Helper function to get notification color
const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'SUCCESS':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'ERROR':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'WARNING':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'SALE':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'STOCK':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'USER':
      return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'SYSTEM':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

// Helper function to format time
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'الآن';
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
  
  return date.toLocaleDateString('ar-SA');
};

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // API calls with fast polling for real-time updates
  const { data: statsData } = useGetNotificationStatsQuery(undefined, {
    pollingInterval: 5000, // تحديث كل 5 ثواني
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  const { data: notificationsData, isLoading, refetch } = useGetNotificationsQuery({
    page: 1,
    limit: 20,
    isRead: selectedTab === 'unread' ? false : undefined
  }, {
    pollingInterval: 5000, // تحديث كل 5 ثواني
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });
  
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const stats = statsData?.data;
  const notifications = notificationsData?.data?.notifications || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    try {
      await deleteNotification(notificationId).unwrap();
      refetch();
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        aria-label="الإشعارات"
      >
        <Bell className="w-6 h-6" />
        {stats && stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">الإشعارات</h3>
              {stats && stats.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  تمييز الكل كمقروء
                </button>
              )}
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-1 space-x-reverse">
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTab === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                الكل ({stats?.total || 0})
              </button>
              <button
                onClick={() => setSelectedTab('unread')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTab === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                غير مقروءة ({stats?.unread || 0})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2">جاري التحميل...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h4 className={`text-sm font-medium truncate ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        {notification.message && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            getNotificationColor(notification.type)
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="تمييز كمقروء"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                عرض جميع الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
