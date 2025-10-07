"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useGetPurchasesQuery, 
  useCreatePurchaseMutation, 
  useDeletePurchaseMutation,
  useGetSuppliersQuery,
  Purchase,
  Supplier,
  CreatePurchaseRequest
} from '@/state/purchaseApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import UnifiedSupplierModal from '@/components/shared/UnifiedSupplierModal';

const PurchasesPage = () => {
  const { success, error, warning, info, confirm } = useToast();
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [showCreatePurchaseModal, setShowCreatePurchaseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPurchaseDetailsModal, setShowPurchaseDetailsModal] = useState(false);
  
  // Purchase form states
  const [purchaseForm, setPurchaseForm] = useState<CreatePurchaseRequest>({
    supplierId: undefined,
    purchaseType: 'CASH',
    paymentMethod: 'CASH',
    lines: []
  });

  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // API calls
  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useGetPurchasesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });

  const { data: suppliersData, isLoading: suppliersLoading, error: suppliersError } = useGetSuppliersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ 
    limit: 1000
  });
  
  const [createPurchase, { isLoading: isCreating }] = useCreatePurchaseMutation();
  const [deletePurchase, { isLoading: isDeleting }] = useDeletePurchaseMutation();

  // Filter products by selected company
  const filteredProducts = productsData?.data?.products?.filter(product => 
    product.createdByCompanyId === selectedCompanyId
  ) || [];

  if (purchasesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-blue-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المشتريات</h1>
              <p className="text-gray-600">إدارة فواتير المشتريات والموردين</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatePurchaseModal(true)}
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
            setPurchaseForm({
              supplierId: undefined,
              purchaseType: 'CASH',
              paymentMethod: 'CASH',
              lines: []
            });
          }}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium"
        >
          <option value="">-- اختر الشركة أولاً --</option>
          {companiesLoading ? (
            <option disabled>جاري تحميل الشركات...</option>
          ) : (
            companiesData?.data?.companies?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))
          )}
        </select>
        {!selectedCompanyId && (
          <p className="text-sm text-blue-700 mt-2 font-medium">
            ⚠️ يجب اختيار الشركة أولاً لتتمكن من إنشاء فاتورة جديدة
          </p>
        )}
        {selectedCompanyId && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-700 font-medium">
              ✅ تم اختيار الشركة - يمكنك الآن إنشاء فاتورة جديدة
            </p>
            <p className="text-xs text-blue-600">
              💡 ملاحظة: سيتم عرض الأصناف الخاصة بهذه الشركة فقط، ولا يمكن إضافة أصناف من شركات أخرى
            </p>
          </div>
        )}
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

          {/* Add Supplier */}
          <button 
            onClick={() => setShowSupplierModal(true)}
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
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع الشراء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  طريق الدفع
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
              {purchasesData?.data?.purchases?.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {purchase.invoiceNumber || `#${purchase.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-600">{purchase.company?.name}</span>
                      <span className="text-xs text-gray-500">{purchase.company?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {purchase.supplier?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold text-green-600">
                      {formatArabicCurrency(purchase.total)}
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
                    {purchase.paymentMethod ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.paymentMethod === 'CASH' 
                          ? 'bg-blue-100 text-blue-800' 
                          : purchase.paymentMethod === 'BANK'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {purchase.paymentMethod === 'CASH' ? 'كاش' : 
                         purchase.paymentMethod === 'BANK' ? 'مصرف' : 'بطاقة'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(purchase.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const confirmed = confirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذه الفاتورة؟');
                          if (confirmed) {
                            deletePurchase(purchase.id);
                          }
                        }}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {purchasesData?.data?.pagination && (
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
                disabled={currentPage >= purchasesData.data.pagination.pages}
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
                    {Math.min(currentPage * 10, purchasesData.data.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{purchasesData.data.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: purchasesData.data.pagination.pages }, (_, i) => (
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

      {/* Create Purchase Form */}
      {showCreatePurchaseModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">فاتورة مشتريات جديدة</h2>
                <button
                  onClick={() => setShowCreatePurchaseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      الشركة المختارة: {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      💡 سيتم الشراء لمخزون هذه الشركة فقط
                    </p>
                  </div>
                </div>

                {/* تنبيه إذا لم تكن هناك أصناف */}
                {selectedCompanyId && filteredProducts.length === 0 && (
                  <div className="mb-4 bg-red-50 p-4 rounded-lg border-2 border-red-300">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="text-sm text-red-800 font-bold mb-1">
                          لا توجد أصناف متاحة لهذه الشركة!
                        </p>
                        <p className="text-xs text-red-700">
                          لا يمكن إنشاء فاتورة بدون أصناف. يرجى إضافة أصناف أولاً من صفحة "الأصناف والمخزن" للشركة المختارة.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {productsLoading && (
                  <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      ⏳ جاري تحميل الأصناف...
                    </p>
                  </div>
                )}
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  
                  if (!selectedCompanyId) {
                    error('خطأ', 'يجب اختيار الشركة أولاً');
                    return;
                  }
                  
                  if (!purchaseForm.supplierId) {
                    error('خطأ', 'يجب اختيار مورد للمتابعة');
                    return;
                  }
                  
                  if (purchaseForm.lines.length === 0) {
                    error('خطأ', 'يجب إضافة بند واحد على الأقل');
                    return;
                  }

                  try {
                    await createPurchase({
                      ...purchaseForm,
                      companyId: selectedCompanyId
                    }).unwrap();
                    
                    success('تم بنجاح!', 'تم إنشاء فاتورة المشتريات بنجاح');
                    
                    // Reset form
                    setPurchaseForm({
                      supplierId: undefined,
                      purchaseType: 'CASH',
                      paymentMethod: 'CASH',
                      lines: []
                    });
                    
                    setShowCreatePurchaseModal(false);
                    refetchPurchases();
                    
                  } catch (error: any) {
                    console.error('خطأ في إنشاء فاتورة المشتريات:', error);
                    error('خطأ', 'حدث خطأ في إنشاء فاتورة المشتريات');
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المورد *
                      </label>
                      <select
                        value={purchaseForm.supplierId || ''}
                        onChange={(e) => setPurchaseForm(prev => ({
                          ...prev,
                          supplierId: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">اختر مورد</option>
                        {suppliersLoading ? (
                          <option disabled>جاري تحميل الموردين...</option>
                        ) : suppliersError ? (
                          <option disabled>خطأ في تحميل الموردين</option>
                        ) : suppliersData?.data?.suppliers?.length === 0 ? (
                          <option disabled>لا توجد موردين</option>
                        ) : (
                          suppliersData?.data?.suppliers?.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        مطلوب - يجب اختيار مورد للمتابعة
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم الفاتورة
                      </label>
                      <input
                        type="text"
                        value="سيتم توليده تلقائياً"
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        سيتم توليد رقم الفاتورة تلقائياً عند الحفظ
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        نوع الشراء *
                      </label>
                      <select
                        value={purchaseForm.purchaseType}
                        onChange={(e) => setPurchaseForm(prev => ({ 
                          ...prev, 
                          purchaseType: e.target.value as any
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="CASH">نقدي</option>
                        <option value="CREDIT">آجل</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        طريق الدفع *
                      </label>
                      <select
                        value={purchaseForm.paymentMethod || 'CASH'}
                        onChange={(e) => setPurchaseForm(prev => ({ 
                          ...prev, 
                          paymentMethod: e.target.value as any
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="CASH">كاش</option>
                        <option value="BANK">مصرف</option>
                        <option value="CARD">بطاقة</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        اختر طريقة الدفع للمشتريات النقدية
                      </p>
                    </div>
                  </div>

                  {/* Purchase Lines */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-base font-bold text-gray-800">
                        📋 بنود الفاتورة *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPurchaseForm(prev => ({
                            ...prev,
                            lines: [...prev.lines, {
                              productId: 0,
                              qty: 1,
                              unitPrice: 0,
                              total: 0
                            }]
                          }))}
                          disabled={!purchaseForm.supplierId || filteredProducts.length === 0}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium ${
                            purchaseForm.supplierId && filteredProducts.length > 0
                              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-lg">➕</span>
                          <span>إضافة بند</span>
                        </button>
                        {!purchaseForm.supplierId ? (
                          <span className="text-xs text-red-600 font-medium">
                            اختر المورد أولاً
                          </span>
                        ) : filteredProducts.length === 0 ? (
                          <span className="text-xs text-red-600 font-medium">
                            لا توجد أصناف متاحة لهذه الشركة
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Product Search Filters */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔍</span>
                          <h4 className="text-sm font-bold text-gray-700">البحث عن المنتجات</h4>
                        </div>
                        {selectedCompanyId && (
                          <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded">
                            أصناف {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name} فقط
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            البحث بالاسم
                          </label>
                          <input
                            type="text"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            placeholder="ابحث بالاسم..."
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            البحث بالكود
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={productCodeSearch}
                              onChange={(e) => {
                                const code = e.target.value;
                                setProductCodeSearch(code);
                                
                                if (code && code.trim() !== '') {
                                  const exactMatch = productsData?.data?.products?.find(
                                    product => product.sku.toLowerCase() === code.toLowerCase() 
                                      && product.createdByCompanyId === selectedCompanyId
                                  );
                                  
                                  if (exactMatch && purchaseForm.supplierId) {
                                    setPurchaseForm(prev => ({
                                      ...prev,
                                      lines: [...prev.lines, {
                                        productId: exactMatch.id,
                                        qty: 1,
                                        unitPrice: Number(exactMatch.price?.purchasePrice || 0),
                                        total: Number(exactMatch.price?.purchasePrice || 0)
                                      }]
                                    }));
                                    setProductCodeSearch('');
                                    success('تم بنجاح', `تم إضافة الصنف: ${exactMatch.name}`);
                                  }
                                }
                              }}
                              placeholder="أدخل كود الصنف للإضافة التلقائية..."
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            {isSearching && (
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase Lines List */}
                    {purchaseForm.lines.length > 0 && (
                      <div className="space-y-3">
                        {purchaseForm.lines.map((line, index) => {
                          const product = productsData?.data?.products?.find(p => p.id === line.productId);
                          const filteredProductsForLine = filteredProducts.filter(p => 
                            p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
                          );

                          return (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-gray-700">البند {index + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => setPurchaseForm(prev => ({
                                    ...prev,
                                    lines: prev.lines.filter((_, i) => i !== index)
                                  }))}
                                  className="text-red-600 hover:text-red-800 p-1 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    الصنف *
                                  </label>
                                  <select
                                    value={line.productId}
                                    onChange={(e) => {
                                      const productId = Number(e.target.value);
                                      const newLine = { ...line, productId };
                                      if (productId && productId !== 0) {
                                        const selectedProduct = productsData?.data?.products?.find(p => p.id === productId);
                                        if (selectedProduct?.price?.purchasePrice) {
                                          newLine.unitPrice = Number(selectedProduct.price.purchasePrice);
                                          newLine.total = newLine.qty * newLine.unitPrice;
                                        }
                                      }
                                      setPurchaseForm(prev => ({
                                        ...prev,
                                        lines: prev.lines.map((l, i) => i === index ? newLine : l)
                                      }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  >
                                    <option value={0}>اختر صنف</option>
                                    {filteredProductsForLine.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    الكمية *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={line.qty}
                                    onChange={(e) => {
                                      const qty = Number(e.target.value);
                                      const newLine = { ...line, qty, total: qty * line.unitPrice };
                                      setPurchaseForm(prev => ({
                                        ...prev,
                                        lines: prev.lines.map((l, i) => i === index ? newLine : l)
                                      }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    سعر الوحدة *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.unitPrice}
                                    onChange={(e) => {
                                      const unitPrice = Number(e.target.value);
                                      const newLine = { ...line, unitPrice, total: line.qty * unitPrice };
                                      setPurchaseForm(prev => ({
                                        ...prev,
                                        lines: prev.lines.map((l, i) => i === index ? newLine : l)
                                      }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    المجموع
                                  </label>
                                  <input
                                    type="text"
                                    value={formatArabicCurrency(line.total)}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm cursor-not-allowed"
                                  />
                                </div>
                              </div>
                              
                              {product && (
                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="text-xs text-blue-800">
                                    <span className="font-medium">معلومات الصنف:</span> {product.name} | 
                                    <span className="font-medium"> الكود:</span> {product.sku} | 
                                    <span className="font-medium"> الوحدة:</span> {product.unit || 'وحدة'}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Total */}
                    {purchaseForm.lines.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-800">إجمالي الفاتورة:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatArabicCurrency(purchaseForm.lines.reduce((sum, line) => sum + line.total, 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowCreatePurchaseModal(false)}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || purchaseForm.lines.length === 0}
                      className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                        isCreating || purchaseForm.lines.length === 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isCreating ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Purchase Details Modal */}
      {showPurchaseDetailsModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">تفاصيل فاتورة المشتريات</h2>
                <button
                  onClick={() => setShowPurchaseDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الفاتورة</label>
                    <p className="text-lg font-semibold">{selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المورد</label>
                    <p className="text-lg font-semibold">{selectedPurchase.supplier?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">نوع الشراء</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedPurchase.purchaseType === 'CASH' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedPurchase.purchaseType === 'CASH' ? 'نقدي' : 'آجل'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">طريق الدفع</label>
                    {selectedPurchase.paymentMethod ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPurchase.paymentMethod === 'CASH' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedPurchase.paymentMethod === 'BANK'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {selectedPurchase.paymentMethod === 'CASH' ? 'كاش' : 
                         selectedPurchase.paymentMethod === 'BANK' ? 'مصرف' : 'بطاقة'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">غير محدد</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المجموع</label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatArabicCurrency(selectedPurchase.total)}
                    </p>
                  </div>
                </div>

                {selectedPurchase.lines && selectedPurchase.lines.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">بنود الفاتورة</h3>
                    <div className="space-y-2">
                      {selectedPurchase.lines.map((line, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{line.product?.name || 'غير محدد'}</div>
                              <div className="text-gray-500 text-xs">{line.product?.sku || ''}</div>
                            </div>
                            <div className="text-left">
                              <div>{line.qty} {line.product?.unit || 'وحدة'}</div>
                              <div className="text-sm text-gray-600">
                                {formatArabicCurrency(line.unitPrice)} × {line.qty} = {formatArabicCurrency(line.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Supplier Modal */}
      <UnifiedSupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={() => {
          // Refresh suppliers list automatically via RTK Query
        }}
        mode="create"
      />
    </div>
  );
};

export default PurchasesPage;
