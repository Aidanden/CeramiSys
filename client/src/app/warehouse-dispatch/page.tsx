'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetDispatchOrdersQuery,
  useUpdateDispatchOrderStatusMutation,
  useGetReturnOrdersQuery,
  useUpdateReturnOrderStatusMutation,
  DispatchOrder,
  ReturnOrder,
} from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import {
  useGetNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  type Notification,
  type NotificationType
} from '@/state/notificationsApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber } from '@/utils/formatArabicNumbers';
import { Bell, Trash2, X, Package, Printer } from 'lucide-react';



export default function WarehouseDispatchPage() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'returns'>('dispatch');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'CANCELLED' | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State for Dispatch Orders
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // State for Return Orders
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<ReturnOrder | null>(null);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);

  const [notes, setNotes] = useState('');

  // Notification state
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread'>('unread');
  const [enableCancelDispatch, setEnableCancelDispatch] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('enableCancelDispatch');
    setEnableCancelDispatch(saved === null ? true : saved === 'true');
  }, []);

  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const { success, error: showError } = useToast();

  // Notification queries with fast polling for real-time updates
  const { data: notificationStatsData, refetch: refetchNotificationStats } = useGetNotificationStatsQuery(undefined, {
    pollingInterval: 5000, // تحديث كل 5 ثواني
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const { data: notificationsData, isLoading: isLoadingNotifications, refetch: refetchNotifications } = useGetNotificationsQuery({
    page: 1,
    limit: 20,
    type: 'STOCK',
    isRead: notificationTab === 'unread' ? false : undefined
  }, {
    pollingInterval: 5000, // تحديث كل 5 ثواني
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notificationStats = notificationStatsData?.data;
  const notifications = notificationsData?.data?.notifications || [];
  const stockNotificationsCount = notificationStats?.byType?.STOCK || 0;

  // Helper function to get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'STOCK':
        return <Package className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600 dark:text-text-secondary" />;
    }
  };

  // Helper function to format time
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;

    return date.toLocaleDateString('ar-LY');
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead({ notificationIds: [notificationId] }).unwrap();
      refetchNotifications();
      refetchNotificationStats();
    } catch (error) {
      console.error('خطأ في تمييز الإشعار كمقروء:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({}).unwrap();
      refetchNotifications();
      refetchNotificationStats();
      success('تم تمييز جميع الإشعارات كمقروءة');
    } catch (error) {
      console.error('خطأ في تمييز جميع الإشعارات كمقروءة:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId).unwrap();
      refetchNotifications();
      refetchNotificationStats();
    } catch (error) {
      console.error('خطأ في حذف الإشعار:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  // Query for Dispatch Orders with fast polling
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetDispatchOrdersQuery(
    {
      page: currentPage,
      limit: 10,
      status: statusFilter || undefined,
      search: searchTerm || customerName || customerPhone || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },

    {
      refetchOnMountOrArgChange: true,
      pollingInterval: 10000, // تحديث كل 10 ثواني
      refetchOnFocus: true,
      skip: activeTab !== 'dispatch'
    }
  );

  // Query for Return Orders with fast polling
  const {
    data: returnsData,
    isLoading: isLoadingReturns,
    refetch: refetchReturns,
  } = useGetReturnOrdersQuery(
    {
      page: currentPage,
      limit: 10,
      status: statusFilter || undefined,
      search: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },

    {
      refetchOnMountOrArgChange: true,
      pollingInterval: 10000, // تحديث كل 10 ثواني
      refetchOnFocus: true,
      skip: activeTab !== 'returns'
    }
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateDispatchOrderStatusMutation();
  const [updateReturnStatus, { isLoading: isUpdatingReturn }] = useUpdateReturnOrderStatusMutation();

  const handleUpdateStatus = async (
    orderId: number,
    newStatus: 'COMPLETED' | 'CANCELLED'
  ) => {
    try {
      await updateStatus({
        id: orderId,
        body: {
          status: newStatus,
          notes: notes || undefined,
        },
      }).unwrap();

      success(
        newStatus === 'COMPLETED'
          ? 'تم تسليم البضائع بنجاح'
          : 'تم إلغاء أمر الصرف'
      );

      setShowDetailsModal(false);
      setSelectedOrder(null);
      setNotes('');
      refetchOrders();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء تحديث حالة أمر الصرف');
    }
  };

  const handleUpdateReturnStatus = async (
    orderId: number,
    newStatus: 'COMPLETED' | 'CANCELLED'
  ) => {
    try {
      await updateReturnStatus({
        id: orderId,
        body: {
          status: newStatus,
          notes: notes || undefined,
        },
      }).unwrap();

      success(
        newStatus === 'COMPLETED'
          ? 'تم استلام المردود وتأكيد المخزون بنجاح'
          : 'تم إلغاء طلب الاستلام'
      );

      setShowReturnDetailsModal(false);
      setSelectedReturnOrder(null);
      setNotes('');
      refetchReturns();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء تحديث حالة الاستلام');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return activeTab === 'dispatch' ? 'معلق' : 'في انتظار الاستلام';
      case 'COMPLETED':
        return activeTab === 'dispatch' ? 'تم التسليم' : 'تم الاستلام';
      case 'CANCELLED':
        return 'ملغي';
      default:
        return status;
    }
  };

  // دالة لعرض الكمية بالصناديق (كما في الفاتورة)
  const formatQuantityDisplay = (qty: number, product: any) => {
    const isBox = product?.unit === 'صندوق';
    const unitsPerBox = product?.unitsPerBox || 0;

    if (!isBox) {
      // إذا لم تكن الوحدة صندوق، اعرض الكمية مباشرة
      return `${formatArabicNumber(qty)} ${product?.unit || 'قطعة'}`;
    }

    // الكمية في الفاتورة = عدد الصناديق
    return `${formatArabicNumber(qty)} صندوق`;
  };

  // دالة لعرض إجمالي الوحدات بالمتر (كما في الفاتورة)
  const formatTotalUnits = (qty: number, product: any) => {
    const isBox = product?.unit === 'صندوق';
    const unitsPerBox = product?.unitsPerBox || 0;

    if (isBox && unitsPerBox > 0) {
      // حساب الأمتار المربعة: عدد الصناديق × الوحدات في الصندوق
      const totalUnits = qty * unitsPerBox;
      return `${formatArabicNumber(totalUnits)} م²`;
    }

    // إذا لم تكن صندوق، اعرض الكمية بوحدتها
    return `${formatArabicNumber(qty)} ${product?.unit || 'قطعة'}`;
  };

  // دالة لطباعة الجدول
  const handlePrintTable = () => {
    const isDispatch = activeTab === 'dispatch';
    const data = isDispatch ? ordersData?.data?.dispatchOrders : returnsData?.data?.returnOrders;

    if (!data || data.length === 0) {
      showError('لا توجد بيانات للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = isDispatch ? 'تقرير أوامر الصرف' : 'تقرير استلام المردودات';

    // إعداد محتوى الطباعة
    const tableRows = data.map((item: any) => {
      const orderId = formatArabicNumber(item.id);
      const invoiceNum = isDispatch
        ? (item.sale?.invoiceNumber || `#${item.saleId}`)
        : (item.saleReturn?.returnNumber || '-');
      const customer = isDispatch
        ? (item.sale?.customer?.name || 'غير محدد')
        : (item.saleReturn?.customer?.name || 'غير محدد');
      const company = isDispatch
        ? (item.sale?.company?.name || '-')
        : (item.company?.name || '-');
      const statusText = getStatusText(item.status);
      const createDate = new Date(item.createdAt).toLocaleDateString('ar-LY');
      const deliveryDate = item.completedAt ? new Date(item.completedAt).toLocaleDateString('ar-LY') : '-';

      return `
        <tr>
          <td>${orderId}</td>
          <td>${invoiceNum}</td>
          <td>${customer}</td>
          <td>${company}</td>
          <td>${statusText}</td>
          <td>${createDate}</td>
          <td>${deliveryDate}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; margin-bottom: 20px; }
            .meta { margin-bottom: 20px; color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; font-size: 14px; }
            th { background-color: #f5f5f5; color: #333; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              table { width: 100%; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-LY')}</p>
            ${statusFilter ? `<p>تصفية الحالة: ${getStatusText(statusFilter)}</p>` : ''}
            ${startDate ? `<p>من تاريخ: ${startDate}</p>` : ''}
            ${endDate ? `<p>إلى تاريخ: ${endDate}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الآمر</th>
                <th>رقم الفاتورة/المردود</th>
                <th>العميل</th>
                <th>الشركة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>تاريخ التسليم/الاستلام</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 w-full mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">لوحة عمليات المخزن</h1>
              <p className="text-text-secondary">إدارة أوامر الصرف والاستلام من المخزن</p>
            </div>
          </div>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="relative p-3 bg-white dark:bg-surface-primary rounded-xl shadow-sm border border-gray-200 dark:border-border-primary hover:shadow-md hover:border-orange-300 dark:hover:border-orange-500 transition-all duration-200"
              aria-label="الإشعارات"
            >
              <Bell className="w-6 h-6 text-orange-600" />
              {stockNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                  {stockNotificationsCount > 99 ? '99+' : stockNotificationsCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {showNotificationPanel && (
              <div className="absolute left-0 top-14 w-96 bg-white dark:bg-surface-primary rounded-2xl shadow-xl border border-gray-200 dark:border-border-primary z-50 overflow-hidden">
                {/* Panel Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      <h3 className="text-lg font-bold">إشعارات المخزن</h3>
                    </div>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNotificationTab('unread')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${notificationTab === 'unread'
                        ? 'bg-white text-orange-600 font-bold'
                        : 'bg-white/20 hover:bg-white/30'
                        }`}
                    >
                      غير مقروءة ({stockNotificationsCount})
                    </button>
                    <button
                      onClick={() => setNotificationTab('all')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${notificationTab === 'all'
                        ? 'bg-white text-orange-600 font-bold'
                        : 'bg-white/20 hover:bg-white/30'
                        }`}
                    >
                      الكل
                    </button>
                  </div>
                </div>

                {/* Mark All As Read */}
                {stockNotificationsCount > 0 && (
                  <div className="p-2 border-b border-gray-100 dark:border-border-primary bg-gray-50 dark:bg-surface-secondary">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="w-full px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7m-7 0l4 4L22 7" /></svg>

                      تمييز الكل كمقروء
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-6 text-center text-gray-500 dark:text-text-tertiary">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="mt-3">جاري التحميل...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-text-tertiary">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-text-tertiary" />
                      <p className="font-medium">لا توجد إشعارات</p>
                      <p className="text-sm text-gray-400 dark:text-text-muted mt-1">ستظهر هنا إشعارات المخزن الجديدة</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-border-primary">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors cursor-pointer ${!notification.isRead ? 'bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-500 dark:border-orange-400' : ''
                            }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl ${!notification.isRead ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-surface-secondary'
                              }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-medium truncate ${!notification.isRead ? 'text-gray-900 dark:text-text-primary' : 'text-gray-700 dark:text-text-secondary'
                                  }`}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full flex-shrink-0"></div>
                                )}
                              </div>

                              {notification.message && (
                                <p className="text-sm text-gray-600 dark:text-text-secondary mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}

                              <span className="text-xs text-gray-400 dark:text-text-tertiary">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="p-1.5 text-gray-400 dark:text-text-tertiary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                  title="تمييز كمقروء"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>

                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="p-1.5 text-gray-400 dark:text-text-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
                <div className="p-3 border-t border-gray-200 dark:border-border-primary bg-gray-50 dark:bg-surface-secondary text-center">
                  <a
                    href="/notifications"
                    className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                  >
                    عرض جميع الإشعارات
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary mb-6">
        <button
          className={`px-6 py-3 font-semibold transition-all duration-200 ${activeTab === 'dispatch'
            ? 'border-b-2 border-orange-600 text-orange-600'
            : 'text-text-secondary hover:text-text-primary'
            }`}
          onClick={() => {
            setActiveTab('dispatch');
            setCurrentPage(1);
          }}
        >
          أوامر الصرف
        </button>
        <button
          className={`px-6 py-3 font-semibold transition-all duration-200 ${activeTab === 'returns'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-text-secondary hover:text-text-primary'
            }`}
          onClick={() => {
            setActiveTab('returns');
            setCurrentPage(1);
          }}
        >
          استلام المردودات
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي {activeTab === 'dispatch' ? 'الأوامر' : 'المردودات'}</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatArabicNumber(
                  activeTab === 'dispatch'
                    ? (ordersData?.data?.pagination?.total || 0)
                    : (returnsData?.data?.pagination?.total || 0)
                )}
              </p>
            </div>
            <svg className={`w-8 h-8 ${activeTab === 'dispatch' ? 'text-orange-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200 relative">
          {/* Pulse animation for pending items */}
          {((activeTab === 'dispatch' ? (ordersData?.data?.dispatchOrders?.filter((o) => o.status === 'PENDING').length || 0) : (returnsData?.data?.returnOrders?.filter((o) => o.status === 'PENDING').length || 0)) > 0) && (
            <div className="absolute top-2 left-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">معلقة</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatArabicNumber(
                  activeTab === 'dispatch'
                    ? (ordersData?.data?.dispatchOrders?.filter((o) => o.status === 'PENDING').length || 0)
                    : (returnsData?.data?.returnOrders?.filter((o) => o.status === 'PENDING').length || 0)
                )}
              </p>
            </div>
            <div className="relative">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">{activeTab === 'dispatch' ? 'تم التسليم' : 'تم الاستلام'}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatArabicNumber(
                  activeTab === 'dispatch'
                    ? (ordersData?.data?.dispatchOrders?.filter((o) => o.status === 'COMPLETED').length || 0)
                    : (returnsData?.data?.returnOrders?.filter((o) => o.status === 'COMPLETED').length || 0)
                )}
              </p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            فلاتر البحث
          </h3>
          <button
            onClick={handlePrintTable}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all duration-200 shadow-sm"
          >
            <Printer className="w-5 h-5" />
            طباعة التقرير
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search by Invoice Number */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              البحث برقم الفاتورة
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 dark:text-text-tertiary w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="رقم الفاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            />
          </div>

          {/* Search by Customer Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              البحث باسم العميل
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 dark:text-text-tertiary w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <input
              type="text"
              placeholder="اسم العميل..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            />
          </div>

          {/* Search by Phone */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              البحث برقم الهاتف
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 dark:text-text-tertiary w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <input
              type="text"
              placeholder="رقم الهاتف..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              الحالة
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">معلقة</option>
              <option value="COMPLETED">تم التسليم</option>
              <option value="CANCELLED">ملغية</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || customerName || customerPhone || statusFilter || startDate || endDate) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCustomerName('');
                setCustomerPhone('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary bg-gray-100 dark:bg-surface-secondary hover:bg-gray-200 dark:hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              مسح الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-surface-secondary">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  رقم الأمر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  تاريخ التسليم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-border-primary">
              {(activeTab === 'dispatch' ? isLoadingOrders : isLoadingReturns) ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-text-tertiary">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : activeTab === 'dispatch' ? (
                !ordersData?.data?.dispatchOrders || ordersData?.data?.dispatchOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-text-tertiary">
                      <p className="font-medium">لا توجد أوامر صرف</p>
                    </td>
                  </tr>
                ) : (
                  ordersData?.data?.dispatchOrders?.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-surface-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-text-primary">
                        #{formatArabicNumber(order.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.sale?.invoiceNumber || `#${order.saleId}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.sale?.customer?.name || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        <div className="flex flex-col">
                          <span className="font-medium text-orange-600">{order.sale?.company?.name}</span>
                          <span className="text-xs text-gray-500 dark:text-text-tertiary">{order.sale?.company?.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {new Date(order.createdAt).toLocaleDateString('ar-LY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.completedAt ? new Date(order.completedAt).toLocaleDateString('ar-LY') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          title="عرض التفاصيل"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                !returnsData?.data?.returnOrders || returnsData?.data?.returnOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-text-tertiary">
                      <p className="font-medium">لا توجد طلبات استرجاع</p>
                    </td>
                  </tr>
                ) : (
                  returnsData?.data?.returnOrders?.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-surface-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-text-primary">
                        #{formatArabicNumber(order.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.saleReturn?.returnNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.saleReturn?.customer?.name || 'غير محدد'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600">{order.company?.name}</span>
                          <span className="text-xs text-gray-500 dark:text-text-tertiary">{order.company?.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {new Date(order.createdAt).toLocaleDateString('ar-LY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                        {order.completedAt ? new Date(order.completedAt).toLocaleDateString('ar-LY') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedReturnOrder(order);
                            setShowReturnDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="عرض التفاصيل"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {((activeTab === 'dispatch' ? ordersData : returnsData)?.data?.pagination?.pages || 0) > 1 && (
          <div className="bg-slate-50/50 dark:bg-slate-900/20 px-6 py-4 flex items-center justify-between border-t border-slate-100 dark:border-border-primary">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, (activeTab === 'dispatch' ? ordersData : returnsData)?.data?.pagination?.pages || 0))}
                disabled={currentPage === ((activeTab === 'dispatch' ? ordersData : returnsData)?.data?.pagination?.pages || 0)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-text-tertiary">
                  عرض صفحة <span className="font-bold text-slate-900 dark:text-text-primary">{formatArabicNumber(currentPage)}</span> من <span className="font-bold text-slate-900 dark:text-text-primary">{formatArabicNumber((activeTab === 'dispatch' ? ordersData : returnsData)?.data?.pagination?.pages || 0)}</span>
                </p>
              </div>
              <nav className="relative z-0 inline-flex rounded-xl shadow-sm space-x-1 rtl:space-x-reverse" aria-label="Pagination">
                {Array.from({ length: (activeTab === 'dispatch' ? ordersData : returnsData)?.data?.pagination?.pages || 0 }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-black rounded-xl transition-all ${currentPage === i + 1
                      ? 'z-10 bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-none'
                      : 'bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover'
                      }`}
                  >
                    {formatArabicNumber(i + 1)}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-slate-200 dark:border-border-primary w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-surface-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary">تفاصيل أمر الصرف #{formatArabicNumber(selectedOrder.id)}</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                  setNotes('');
                }}
                className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Info */}
            <div className="mb-6 bg-gray-50 dark:bg-surface-secondary p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">رقم الفاتورة</p>
                  <p className="font-semibold dark:text-text-primary">{selectedOrder.sale?.invoiceNumber || `#${selectedOrder.saleId}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">العميل</p>
                  <p className="font-semibold dark:text-text-primary">{selectedOrder.sale?.customer?.name || 'غير محدد'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">الشركة</p>
                  <p className="font-semibold dark:text-text-primary">{selectedOrder.sale?.company?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">الحالة</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="mb-6">
              <h4 className="font-semibold text-lg mb-4 text-gray-800 dark:text-text-primary">الأصناف المطلوبة:</h4>
              <div className="border border-slate-200 dark:border-border-primary rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-50 dark:from-orange-900/20 to-orange-100 dark:to-orange-900/30">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-text-secondary uppercase tracking-wider">الصنف</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-text-secondary uppercase tracking-wider">الكود</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-text-secondary uppercase tracking-wider">الشركة المصدرة</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-text-secondary uppercase tracking-wider">الكمية بالصناديق</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-text-secondary uppercase tracking-wider">إجمالي الوحدات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-primary bg-white dark:bg-surface-primary">
                    {selectedOrder.sale?.lines?.map((line, idx) => (
                      <tr key={line.id} className={`hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-surface-primary' : 'bg-gray-50 dark:bg-surface-secondary'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-text-primary">{line.product?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-text-secondary font-mono">{line.product?.sku}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${line.isFromParentCompany
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                            }`}>
                            {line.isFromParentCompany ? 'التقازي' : selectedOrder.sale?.company?.name || 'الإمارات'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-bold text-orange-600 text-base">
                            {formatQuantityDisplay(line.qty, line.product)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-semibold text-blue-600">
                            {formatTotalUnits(line.qty, line.product)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.status !== 'COMPLETED' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
                  placeholder="أضف ملاحظات حول عملية الصرف..."
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                  setNotes('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors"
              >
                إغلاق
              </button>

              {/* إظهار أزرار الإجراءات في حالة معلق */}
              {selectedOrder.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    تم التسليم
                  </button>
                  {enableCancelDispatch && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      إلغاء الأمر
                    </button>
                  )}
                </>
              )}

              {/* السماح بتغيير الحالة من ملغي إلى تم التسليم */}
              {selectedOrder.status === 'CANCELLED' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  تغيير إلى تم التسليم
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Return Order Details Modal */}
      {showReturnDetailsModal && selectedReturnOrder && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-slate-200 dark:border-border-primary w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-surface-primary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold dark:text-text-primary">تفاصيل استلام المردودات</h3>
              <button
                onClick={() => {
                  setShowReturnDetailsModal(false);
                  setSelectedReturnOrder(null);
                  setNotes('');
                }}
                className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-primary"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg text-right">
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">رقم المردود</p>
                <p className="font-bold dark:text-text-primary">{selectedReturnOrder.saleReturn?.returnNumber || `#${selectedReturnOrder.saleReturnId}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">العميل</p>
                <p className="font-bold dark:text-text-primary">{selectedReturnOrder.saleReturn?.customer?.name || 'غير محدد'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">الفاتورة الأصلية</p>
                <p className="font-bold dark:text-text-primary">{selectedReturnOrder.saleReturn?.sale?.invoiceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">الشركة</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">{selectedReturnOrder.company?.name}</p>
              </div>
            </div>

            <h4 className="font-bold mb-3 text-right dark:text-text-primary">الأصناف المردودة:</h4>
            <div className="border border-slate-200 dark:border-border-primary rounded-lg overflow-hidden mb-6">
              <table className="w-full text-right">
                <thead className="bg-blue-50 dark:bg-blue-900/20">
                  <tr>
                    <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الصنف</th>
                    <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الكود</th>
                    <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الكمية</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface-primary">
                  {selectedReturnOrder.saleReturn?.lines?.map((line) => (
                    <tr key={line.id} className="border-b border-slate-200 dark:border-border-primary">
                      <td className="px-4 py-2 dark:text-text-primary">{line.product?.name}</td>
                      <td className="px-4 py-2 font-mono dark:text-text-secondary">{line.product?.sku}</td>
                      <td className="px-4 py-2 font-bold text-blue-600 dark:text-blue-400">
                        {formatArabicNumber(Number(line.qty))} {line.product?.unit || 'صندوق'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2 text-right">ملاحظات المخزن</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-right transition-all"
                placeholder="أضف ملاحظات عند الاستلام..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReturnDetailsModal(false);
                  setSelectedReturnOrder(null);
                  setNotes('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors"
              >
                إغلاق
              </button>
              {selectedReturnOrder.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleUpdateReturnStatus(selectedReturnOrder.id, 'COMPLETED')}
                    disabled={isUpdatingReturn}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    تأكيد الاستلام
                  </button>
                  <button
                    onClick={() => handleUpdateReturnStatus(selectedReturnOrder.id, 'CANCELLED')}
                    disabled={isUpdatingReturn}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    رفض الاستلام
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
