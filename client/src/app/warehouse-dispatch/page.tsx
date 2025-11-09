'use client';

import React, { useState } from 'react';
import {
  useGetDispatchOrdersQuery,
  useUpdateDispatchOrderStatusMutation,
  DispatchOrder,
} from '@/state/warehouseApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber } from '@/utils/formatArabicNumbers';

export default function WarehouseDispatchPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'CANCELLED' | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const { success, error: showError } = useToast();

  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useGetDispatchOrdersQuery(
    {
      page: currentPage,
      limit: 20,
      status: statusFilter || undefined,
      search: searchTerm || customerName || customerPhone || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateDispatchOrderStatusMutation();

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
      refetch();
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء تحديث حالة أمر الصرف');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'معلق';
      case 'COMPLETED':
        return 'تم التسليم';
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
              <h1 className="text-3xl font-bold text-text-primary">أوامر صرف المخزن</h1>
              <p className="text-text-secondary">إدارة أوامر صرف البضائع من المخزن</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي الأوامر</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatArabicNumber(ordersData?.data?.pagination?.total || 0)}
              </p>
            </div>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">معلقة</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatArabicNumber(
                  ordersData?.data?.dispatchOrders?.filter((o) => o.status === 'PENDING').length || 0
                )}
              </p>
            </div>
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">تم التسليم</p>
              <p className="text-2xl font-bold text-green-600">
                {formatArabicNumber(
                  ordersData?.data?.dispatchOrders?.filter((o) => o.status === 'COMPLETED').length || 0
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
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          فلاتر البحث
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search by Invoice Number */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البحث برقم الفاتورة
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 w-5 h-5"
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
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Search by Customer Name */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البحث باسم العميل
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 w-5 h-5"
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
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Search by Phone */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البحث برقم الهاتف
            </label>
            <svg
              className="absolute right-3 top-9 text-gray-400 w-5 h-5"
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
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحالة
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">معلقة</option>
              <option value="COMPLETED">تم التسليم</option>
              <option value="CANCELLED">ملغية</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الأمر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : !ordersData?.data?.dispatchOrders || ordersData?.data?.dispatchOrders?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="font-medium">لا توجد أوامر صرف</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ordersData?.data?.dispatchOrders?.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{formatArabicNumber(order.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.sale?.invoiceNumber || `#${order.saleId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.sale?.customer?.name || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-orange-600">{order.sale?.company?.name}</span>
                        <span className="text-xs text-gray-500">{order.sale?.company?.code}</span>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('ar-LY')}
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {ordersData?.data?.pagination && ordersData.data.pagination.pages > 1 && (
          <div className="mt-6 flex justify-center p-4">
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>

              <span className="px-3 py-2 text-sm text-gray-700">
                صفحة {formatArabicNumber(currentPage)} من {formatArabicNumber(ordersData.data.pagination.pages)}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, ordersData.data.pagination.pages))}
                disabled={currentPage === ordersData.data.pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">تفاصيل أمر الصرف #{formatArabicNumber(selectedOrder.id)}</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                  setNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Info */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">رقم الفاتورة</p>
                  <p className="font-semibold">{selectedOrder.sale?.invoiceNumber || `#${selectedOrder.saleId}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">العميل</p>
                  <p className="font-semibold">{selectedOrder.sale?.customer?.name || 'غير محدد'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الشركة</p>
                  <p className="font-semibold">{selectedOrder.sale?.company?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الحالة</p>
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
              <h4 className="font-semibold text-lg mb-4 text-gray-800">الأصناف المطلوبة:</h4>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-50 to-orange-100">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">الصنف</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">الكود</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">الشركة المصدرة</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">الكمية بالصناديق</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">إجمالي الوحدات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedOrder.sale?.lines?.map((line, idx) => (
                      <tr key={line.id} className={`hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{line.product?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{line.product?.sku}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            line.isFromParentCompany 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
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
            {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>

              {selectedOrder.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    تم التسليم
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    إلغاء الأمر
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
