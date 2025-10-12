"use client";

import React, { useState } from 'react';
import {
  useGetSaleReturnsQuery,
  useGetSaleReturnStatsQuery,
  useUpdateReturnStatusMutation,
  useDeleteSaleReturnMutation,
  useCreateSaleReturnMutation,
  useLazyValidateSaleForReturnQuery,
  ReturnStatus,
  CreateSaleReturnRequest,
} from '@/state/saleReturnsApi';
import { useGetSalesQuery } from '@/state/salesApi';
import { useAppSelector, useAppDispatch } from '@/app/redux';
import { 
  setCurrentPage, 
  setStatusFilter, 
  setShowCreateModal, 
  setSelectedReturnId 
} from '@/state/saleReturnsSlice';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Plus,
  X,
  Search,
  Trash2
} from "lucide-react";

const SaleReturnsPage = () => {
  const { success, error } = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const currentPage = useAppSelector((state) => state.saleReturns.currentPage);
  const statusFilter = useAppSelector((state) => state.saleReturns.statusFilter);
  const showCreateModal = useAppSelector((state) => state.saleReturns.showCreateModal);
  
  // Local states
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [returnForm, setReturnForm] = useState<CreateSaleReturnRequest>({
    saleId: 0,
    companyId: 0,
    customerId: undefined,
    reason: '',
    notes: '',
    refundMethod: 'CASH',
    lines: []
  });
  
  // API calls
  const { data: returnsData, isLoading, refetch } = useGetSaleReturnsQuery({
    companyId: user?.isSystemUser ? undefined : user?.companyId,
    status: statusFilter || undefined,
    page: currentPage,
    limit: 10
  });

  const { data: statsData } = useGetSaleReturnStatsQuery({
    companyId: user?.isSystemUser ? undefined : user?.companyId
  });

  const { data: salesData } = useGetSalesQuery({
    page: 1,
    limit: 100,
    search: saleSearchTerm
  });

  const [updateStatus, { isLoading: isUpdating }] = useUpdateReturnStatusMutation();
  const [deleteReturn, { isLoading: isDeleting }] = useDeleteSaleReturnMutation();
  const [createReturn, { isLoading: isCreating }] = useCreateSaleReturnMutation();
  const [validateSale] = useLazyValidateSaleForReturnQuery();

  // Handle status update
  const handleStatusUpdate = async (returnId: number, newStatus: ReturnStatus) => {
    try {
      await updateStatus({ returnId, status: newStatus }).unwrap();
      success('تم التحديث', 'تم تحديث حالة المرتجع بنجاح');
      refetch();
    } catch (err: any) {
      error('خطأ', err?.data?.message || 'حدث خطأ أثناء تحديث الحالة');
    }
  };

  // Handle delete
  const handleDelete = async (returnId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المرتجع؟')) return;
    
    try {
      await deleteReturn(returnId).unwrap();
      success('تم الحذف', 'تم حذف المرتجع بنجاح');
      refetch();
    } catch (err: any) {
      error('خطأ', err?.data?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  // Handle select sale
  const handleSelectSale = async (saleId: number) => {
    setSelectedSaleId(saleId);
    const sale = salesData?.data?.sales?.find((s: any) => s.id === saleId);
    
    if (sale) {
      // Initialize form with sale data
      setReturnForm({
        saleId: sale.id,
        companyId: sale.companyId,
        customerId: sale.customerId,
        reason: '',
        notes: '',
        refundMethod: 'CASH',
        lines: sale.lines.map((line: any) => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice
        }))
      });
    }
  };

  // Handle create return
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!returnForm.saleId) {
      error('خطأ', 'يجب اختيار فاتورة أولاً');
      return;
    }

    if (returnForm.lines.length === 0) {
      error('خطأ', 'يجب إضافة بند واحد على الأقل');
      return;
    }

    try {
      await createReturn(returnForm).unwrap();
      success('تم بنجاح', 'تم إنشاء المرتجع بنجاح');
      dispatch(setShowCreateModal(false));
      setReturnForm({
        saleId: 0,
        companyId: 0,
        customerId: undefined,
        reason: '',
        notes: '',
        refundMethod: 'CASH',
        lines: []
      });
      setSelectedSaleId(null);
      setSaleSearchTerm('');
      refetch();
    } catch (err: any) {
      error('خطأ', err?.data?.message || 'حدث خطأ أثناء إنشاء المرتجع');
    }
  };

  // Update line quantity
  const updateLineQty = (index: number, qty: number) => {
    const newLines = [...returnForm.lines];
    newLines[index] = {
      ...newLines[index],
      qty: qty
    };
    setReturnForm({ ...returnForm, lines: newLines });
  };

  // Remove line
  const removeLine = (index: number) => {
    const newLines = returnForm.lines.filter((_, i) => i !== index);
    setReturnForm({ ...returnForm, lines: newLines });
  };

  // Calculate total
  const calculateTotal = () => {
    return returnForm.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
  };

  // Status badge
  const getStatusBadge = (status: ReturnStatus) => {
    const badges = {
      PENDING: { text: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800', emoji: '⏳' },
      APPROVED: { text: 'معتمد', color: 'bg-blue-100 text-blue-800', emoji: '✅' },
      PROCESSED: { text: 'تمت المعالجة', color: 'bg-green-100 text-green-800', emoji: '✅' },
      REJECTED: { text: 'مرفوض', color: 'bg-red-100 text-red-800', emoji: '❌' },
    };
    
    const badge = badges[status];
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <span>{badge.emoji}</span>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">المرتجعات</h1>
        <p className="text-gray-600 mt-2">إدارة مرتجعات المبيعات</p>
      </div>

      {/* Stats Cards */}
      {statsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المرتجعات</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatArabicNumber(statsData.data.totalReturns)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">قيد الانتظار</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatArabicNumber(statsData.data.pendingReturns)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">معتمد</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatArabicNumber(statsData.data.approvedReturns)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">تمت المعالجة</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatArabicNumber(statsData.data.processedReturns)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-r-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المبلغ</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatArabicCurrency(statsData.data.totalAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => dispatch(setStatusFilter(e.target.value as any))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="APPROVED">معتمد</option>
              <option value="PROCESSED">تمت المعالجة</option>
              <option value="REJECTED">مرفوض</option>
            </select>
          </div>

          <button
            onClick={() => dispatch(setShowCreateModal(true))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            إنشاء مرتجع جديد
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم المرتجع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الفاتورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المجموع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : returnsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    لا توجد مرتجعات
                  </td>
                </tr>
              ) : (
                returnsData?.data?.map((returnItem: any) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{formatArabicNumber(returnItem.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{returnItem.sale.invoiceNumber || formatArabicNumber(returnItem.saleId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.customer?.name || returnItem.sale.customer?.name || 'عميل نقدي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatArabicCurrency(returnItem.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(returnItem.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(returnItem.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {returnItem.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(returnItem.id, 'APPROVED')}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="اعتماد"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(returnItem.id, 'REJECTED')}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="رفض"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(returnItem.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="حذف"
                              disabled={isDeleting}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedReturn(returnItem)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="عرض التفاصيل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {returnsData?.pagination && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => dispatch(setCurrentPage(Math.max(currentPage - 1, 1)))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                disabled={currentPage >= returnsData.pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض{' '}
                  <span className="font-medium">
                    {((currentPage - 1) * 10) + 1}
                  </span>{' '}
                  إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, returnsData.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{returnsData.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: returnsData.pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => dispatch(setCurrentPage(page))}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {formatArabicNumber(page)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateReturn}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">إنشاء مرتجع جديد</h2>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setShowCreateModal(false));
                    setReturnForm({
                      saleId: 0,
                      companyId: 0,
                      customerId: undefined,
                      reason: '',
                      notes: '',
                      refundMethod: 'CASH',
                      lines: []
                    });
                    setSelectedSaleId(null);
                    setSaleSearchTerm('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Step 1: Select Sale */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">الخطوة 1: اختر الفاتورة</h3>
                  
                  {/* Search Sales */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      بحث عن فاتورة (رقم الفاتورة أو اسم العميل)
                    </label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={saleSearchTerm}
                        onChange={(e) => setSaleSearchTerm(e.target.value)}
                        placeholder="ابحث عن فاتورة..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Sales List */}
                  {salesData?.data?.sales && salesData.data.sales.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {salesData.data.sales.map((sale: any) => (
                        <div
                          key={sale.id}
                          onClick={() => handleSelectSale(sale.id)}
                          className={`p-3 cursor-pointer hover:bg-blue-100 border-b last:border-b-0 ${
                            selectedSaleId === sale.id ? 'bg-blue-100 border-r-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                فاتورة #{sale.invoiceNumber || formatArabicNumber(sale.id)}
                              </p>
                              <p className="text-sm text-gray-600">
                                العميل: {sale.customer?.name || 'عميل نقدي'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-gray-900">
                                {formatArabicCurrency(sale.total)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                sale.saleType === 'CASH' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {sale.saleType === 'CASH' ? 'نقدي' : 'آجل'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Return Details */}
                {selectedSaleId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">الخطوة 2: تفاصيل المرتجع</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          سبب المرتجع
                        </label>
                        <input
                          type="text"
                          value={returnForm.reason}
                          onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                          placeholder="مثال: منتج تالف، خطأ في الطلب..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          طريقة الاسترجاع
                        </label>
                        <select
                          value={returnForm.refundMethod}
                          onChange={(e) => setReturnForm({ ...returnForm, refundMethod: e.target.value as any })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="CASH">نقدي</option>
                          <option value="BANK">تحويل بنكي</option>
                          <option value="CARD">بطاقة</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات إضافية
                      </label>
                      <textarea
                        value={returnForm.notes}
                        onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                        placeholder="أي ملاحظات إضافية..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Return Items */}
                {selectedSaleId && returnForm.lines.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">الخطوة 3: البنود المرتجعة</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصنف</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {returnForm.lines.map((line, index) => {
                            const sale = salesData?.data?.sales?.find((s: any) => s.id === selectedSaleId);
                            const saleLine = sale?.lines?.find((l: any) => l.productId === line.productId);
                            const product = saleLine?.product;
                            
                            return (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {product?.name || `منتج #${line.productId}`}
                                  <br />
                                  <span className="text-xs text-gray-500">{product?.sku}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={saleLine?.qty || 999}
                                    value={line.qty}
                                    onChange={(e) => updateLineQty(index, parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                  />
                                  <span className="text-xs text-gray-500 mr-2">
                                    من {formatArabicNumber(saleLine?.qty || 0)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {formatArabicCurrency(line.unitPrice)}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                  {formatArabicCurrency(line.qty * line.unitPrice)}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => removeLine(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                              الإجمالي:
                            </td>
                            <td colSpan={2} className="px-4 py-3 text-right font-bold text-lg text-purple-900">
                              {formatArabicCurrency(calculateTotal())}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setShowCreateModal(false));
                    setReturnForm({
                      saleId: 0,
                      companyId: 0,
                      customerId: undefined,
                      reason: '',
                      notes: '',
                      refundMethod: 'CASH',
                      lines: []
                    });
                    setSelectedSaleId(null);
                    setSaleSearchTerm('');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !selectedSaleId || returnForm.lines.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      إنشاء المرتجع
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal - سيتم إضافته لاحقاً */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">تفاصيل المرتجع #{formatArabicNumber(selectedReturn.id)}</h2>
              <button
                onClick={() => setSelectedReturn(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">رقم الفاتورة الأصلية</p>
                  <p className="font-semibold">#{selectedReturn.sale.invoiceNumber || formatArabicNumber(selectedReturn.saleId)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">العميل</p>
                  <p className="font-semibold">{selectedReturn.customer?.name || selectedReturn.sale.customer?.name || 'عميل نقدي'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الإجمالي</p>
                  <p className="font-semibold">{formatArabicCurrency(selectedReturn.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الحالة</p>
                  <div>{getStatusBadge(selectedReturn.status)}</div>
                </div>
              </div>

              {selectedReturn.reason && (
                <div>
                  <p className="text-sm text-gray-600">سبب المرتجع</p>
                  <p className="font-semibold">{selectedReturn.reason}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">البنود المرتجعة</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">السعر</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReturn.lines.map((line: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{line.product?.name}</td>
                        <td className="px-4 py-2 text-sm">{formatArabicNumber(line.qty)}</td>
                        <td className="px-4 py-2 text-sm">{formatArabicCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm font-semibold">{formatArabicCurrency(line.subTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleReturnsPage;
