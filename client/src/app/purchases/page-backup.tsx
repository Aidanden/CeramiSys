"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/app/redux';
import { 
  useGetPurchasesQuery, 
  useCreatePurchaseMutation, 
  useUpdatePurchaseMutation, 
  useDeletePurchaseMutation,
  useGetPurchaseStatsQuery,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  Purchase
} from '@/state/purchaseApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import CreatePurchaseModal from '@/components/purchases/CreatePurchaseModal';
import CreateSupplierModal from '@/components/purchases/CreateSupplierModal';
import PurchaseDetailsModal from '@/components/purchases/PurchaseDetailsModal';
import AddPaymentModal from '@/components/purchases/AddPaymentModal';

const PurchasesPageBackup = () => {
  const router = useRouter();
  const toast = useToast();
  
  // Local state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [purchaseType, setPurchaseType] = useState<'all' | 'CASH' | 'CREDIT'>('all');
  const [isFullyPaid, setIsFullyPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // RTK Query hooks
  const { data: companiesData, isLoading: isLoadingCompanies, error: companiesError } = useGetCompaniesQuery({
    limit: 100,
  });

  const { data: purchasesData, isLoading: isLoadingPurchases, error: purchasesError } = useGetPurchasesQuery({
    page: currentPage,
    limit: 10,
    companyId: selectedCompanyId || undefined,
    supplierId: selectedSupplierId || undefined,
    purchaseType: purchaseType === 'all' ? undefined : purchaseType,
    isFullyPaid: isFullyPaid === 'all' ? undefined : isFullyPaid === 'paid',
    search: searchTerm || undefined,
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetPurchaseStatsQuery({
    companyId: selectedCompanyId || undefined,
  });

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({
    limit: 100,
  });

  const [createPurchase, { isLoading: isCreating }] = useCreatePurchaseMutation();
  const [updatePurchase, { isLoading: isUpdating }] = useUpdatePurchaseMutation();
  const [deletePurchase, { isLoading: isDeleting }] = useDeletePurchaseMutation();
  const [createSupplier, { isLoading: isCreatingSupplier }] = useCreateSupplierMutation();

  // Handle create purchase success
  const handleCreatePurchaseSuccess = () => {
    setShowCreateModal(false);
  };

  // Handle delete purchase
  const handleDeletePurchase = async (purchaseId: number) => {
    const confirmed = await toast.confirm(
      'تأكيد حذف فاتورة المشتريات',
      'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إرجاع الأصناف إلى المخزن.'
    );
    
    if (!confirmed) return;
    
    try {
      await deletePurchase(purchaseId).unwrap();
      toast.success('تم بنجاح!', 'تم حذف فاتورة المشتريات بنجاح');
    } catch (error: any) {
      console.error('خطأ في حذف فاتورة المشتريات:', error);
      
      if (error?.status === 401) {
        toast.error('جلسة منتهية', 'جلسة المستخدم منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
      } else if (error?.data?.message) {
        toast.error('لا يمكن الحذف', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في حذف فاتورة المشتريات. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  // Handle create supplier success
  const handleCreateSupplierSuccess = () => {
    setShowCreateSupplierModal(false);
  };

  const stats = statsData || {};

  // Debug information
  console.log('🔍 Purchases Debug:', {
    selectedCompanyId,
    companiesData,
    isLoadingCompanies,
    companiesError,
    hasCompanies: companiesData?.data?.companies?.length,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المشتريات</h1>
              <p className="text-gray-600">إدارة فواتير المشتريات والموردين</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedCompanyId}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة مشتريات جديدة
          </button>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
        <label className="block text-sm font-bold text-blue-900 mb-2">
          🏢 اختر الشركة للعمل عليها *
        </label>
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => {
            const newCompanyId = e.target.value ? Number(e.target.value) : null;
            setSelectedCompanyId(newCompanyId);
          }}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium"
        >
          <option value="">-- اختر الشركة أولاً --</option>
          {isLoadingCompanies ? (
            <option disabled>جاري تحميل الشركات...</option>
          ) : companiesError ? (
            <option disabled>خطأ في تحميل الشركات</option>
          ) : !companiesData?.data?.companies?.length ? (
            <option disabled>لا توجد شركات متاحة</option>
          ) : (
            companiesData.data.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))
          )}
        </select>
        
        {/* Status Messages */}
        {isLoadingCompanies && (
          <p className="text-sm text-blue-600 mt-2 font-medium">
            🔄 جاري تحميل الشركات...
          </p>
        )}
        
        {companiesError && (
          <p className="text-sm text-red-600 mt-2 font-medium">
            ❌ خطأ في تحميل الشركات: {companiesError?.message || 'خطأ غير معروف'}
          </p>
        )}
        
        {!isLoadingCompanies && !companiesError && !companiesData?.data?.companies?.length && (
          <div className="mt-2">
            <p className="text-sm text-orange-600 font-medium mb-2">
              ⚠️ لا توجد شركات متاحة. يرجى إضافة شركة أولاً.
            </p>
            <button
              onClick={() => router.push('/companies')}
              className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              إضافة شركة جديدة
            </button>
          </div>
        )}
        
        {!selectedCompanyId && companiesData?.data?.companies?.length > 0 && (
          <p className="text-sm text-blue-700 mt-2 font-medium">
            ⚠️ يجب اختيار الشركة أولاً لتتمكن من إدارة المشتريات
          </p>
        )}
      </div>

      {/* Content - Only show when company is selected */}
      {selectedCompanyId ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">إجمالي المشتريات</p>
                  <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(stats.totalPurchases || 0)}</p>
                </div>
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">إجمالي القيمة</p>
                  <p className="text-2xl font-bold text-green-600">{formatArabicCurrency(stats.totalAmount || 0)}</p>
                </div>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">المبلغ المدفوع</p>
                  <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(stats.totalPaid || 0)}</p>
                </div>
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">المبلغ المتبقي</p>
                  <p className="text-2xl font-bold text-orange-600">{formatArabicCurrency(stats.totalRemaining || 0)}</p>
                </div>
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="البحث في المشتريات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Supplier Filter */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <select
                  value={selectedSupplierId || ''}
                  onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">جميع الموردين</option>
                  {suppliersData?.data?.suppliers?.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Type Filter */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <select
                  value={purchaseType}
                  onChange={(e) => setPurchaseType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="CASH">نقدي</option>
                  <option value="CREDIT">آجل</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <select
                  value={isFullyPaid}
                  onChange={(e) => setIsFullyPaid(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="paid">مدفوع بالكامل</option>
                  <option value="unpaid">غير مدفوع</option>
                </select>
              </div>

              {/* Add Supplier */}
              <button 
                onClick={() => setShowCreateSupplierModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                مورد جديد
              </button>

              {/* Export */}
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                تصدير
              </button>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم الفاتورة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المورد
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المجموع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المدفوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المتبقي
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      نوع الشراء
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      حالة السداد
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
                  {isLoadingPurchases ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        جاري التحميل...
                      </td>
                    </tr>
                  ) : purchasesError ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                        خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.
                      </td>
                    </tr>
                  ) : !purchasesData?.purchases || purchasesData.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        لا توجد فواتير مشتريات
                      </td>
                    </tr>
                  ) : (
                    purchasesData.purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {purchase.invoiceNumber || `#${purchase.id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.supplier?.name || 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-green-600">
                            {formatArabicCurrency(purchase.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-blue-600">
                            {formatArabicCurrency(purchase.paidAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-red-600">
                            {formatArabicCurrency(purchase.remainingAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            purchase.purchaseType === 'CASH' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {purchase.purchaseType === 'CASH' ? 'نقدي' : 'آجل'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            purchase.isFullyPaid 
                              ? 'bg-green-100 text-green-800' 
                              : purchase.paidAmount > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {purchase.isFullyPaid ? 'مدفوع' : purchase.paidAmount > 0 ? 'مدفوع جزئياً' : 'غير مدفوع'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(purchase.createdAt).toLocaleDateString('ar-LY')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {!purchase.isFullyPaid && (
                              <button
                                onClick={() => {
                                  setSelectedPurchase(purchase);
                                  setShowPaymentModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 p-1 rounded"
                                title="إضافة دفعة"
                              >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedPurchase(purchase);
                                setShowDetailsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="عرض التفاصيل"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePurchase(purchase.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="حذف"
                              disabled={isDeleting}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            {purchasesData?.pagination && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= (purchasesData?.pagination?.pages || 1)}
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
                        {Math.min(currentPage * 10, purchasesData?.pagination?.total || 0)}
                      </span>{' '}
                      من{' '}
                      <span className="font-medium">{purchasesData?.pagination?.total || 0}</span>{' '}
                      نتيجة
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      {Array.from({ length: purchasesData?.pagination?.pages || 1 }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 p-8 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">اختر الشركة للبدء</h3>
            <p className="text-gray-500">يرجى اختيار الشركة من القائمة أعلاه لعرض وإدارة المشتريات</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreatePurchaseSuccess}
        selectedCompanyId={selectedCompanyId}
      />

      <CreateSupplierModal
        isOpen={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        onSuccess={handleCreateSupplierSuccess}
      />

      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        purchase={selectedPurchase}
      />

      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        purchase={selectedPurchase}
        onSuccess={() => setShowPaymentModal(false)}
        selectedCompanyId={selectedCompanyId}
      />
    </div>
  );
};

export default PurchasesPageBackup;

