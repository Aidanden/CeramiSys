'use client';

import React, { useState } from 'react';
import {
  useGetPaymentReceiptsQuery,
  usePayReceiptMutation,
  useGetPaymentReceiptsStatsQuery,
  useAddInstallmentMutation,
  useGetInstallmentsByReceiptIdQuery,
  PaymentReceipt,
  PaymentInstallment,
} from '@/state/api/paymentReceiptsApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { printReceipt } from '@/utils/printUtils';
import { formatLibyanCurrencyEnglish, formatEnglishNumber, formatEnglishDate, formatLibyanCurrencyArabic } from '@/utils/formatLibyanNumbers';

export default function PaymentReceiptsPage() {
  const { success, error: showError, confirm } = useToast();

  // States
  const [activeTab, setActiveTab] = useState<'all' | 'purchases' | 'returns'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN_PURCHASE' | 'EXPENSE'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentNotes, setInstallmentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<number | undefined>(undefined);
  const [newExchangeRate, setNewExchangeRate] = useState('');
  const [installmentExchangeRate, setInstallmentExchangeRate] = useState('');

  // API calls - تحديد الفلاتر حسب التبويب النشط
  const getQueryParams = () => {
    const baseParams = {
      page: currentPage,
      limit: 10,
      search: searchTerm,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      companyId: companyFilter || undefined,
    };

    if (activeTab === 'purchases') {
      // تبويب المشتريات - فقط الفواتير الرئيسية والمصروفات المرتبطة بمشتريات
      return {
        ...baseParams,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        purchaseId: 'exists' as const, // فلتر للإيصالات المرتبطة بمشتريات
      };
    } else if (activeTab === 'returns') {
      // تبويب المردودات - فقط إيصالات المردودات
      return {
        ...baseParams,
        type: 'RETURN' as const, // نوع جديد للمردودات
      };
    } else {
      // تبويب الكل - جميع الإيصالات
      return {
        ...baseParams,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      };
    }
  };

  const { data: receiptsData, isLoading: receiptsLoading, refetch } = useGetPaymentReceiptsQuery(getQueryParams());

  const { data: stats } = useGetPaymentReceiptsStatsQuery();
  const [payReceipt, { isLoading: isPaying }] = usePayReceiptMutation();
  const [addInstallment, { isLoading: isAddingInstallment }] = useAddInstallmentMutation();

  // جلب الخزائن والحسابات المصرفية
  const { data: treasuries = [] } = useGetTreasuriesQuery({ isActive: true });

  // جلب الشركات
  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });

  // فلترة الخزائن حسب النوع
  const cashTreasuries = treasuries.filter(t => t.type === 'COMPANY' || t.type === 'GENERAL');
  const bankAccounts = treasuries.filter(t => t.type === 'BANK');

  // جلب الدفعات الجزئية للإيصال المختار
  const { data: installmentsData, refetch: refetchInstallments } = useGetInstallmentsByReceiptIdQuery(
    selectedReceipt?.id || 0,
    { skip: !selectedReceipt?.id || (!showInstallmentsModal && !showDetailsModal) }
  );

  // Handle tab change
  const handleTabChange = (tab: 'all' | 'purchases' | 'returns') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCompanyFilter('');
  };

  // Handlers
  const handleOpenInstallmentsModal = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
    setShowInstallmentsModal(true);
    setInstallmentAmount('');
    setInstallmentNotes('');
    setPaymentMethod('');
    setReferenceNumber('');
    setSelectedTreasuryId(undefined);
    setInstallmentExchangeRate('');
  };

  const handleAddInstallment = async () => {
    if (!selectedReceipt || !installmentAmount || parseFloat(installmentAmount) <= 0) {
      showError('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    // التحقق من سعر الصرف للعملات الأجنبية
    if (selectedReceipt.currency && selectedReceipt.currency !== 'LYD') {
      if (!installmentExchangeRate || parseFloat(installmentExchangeRate) <= 0) {
        showError('خطأ', 'يرجى إدخال سعر صرف صحيح للعملة الأجنبية');
        return;
      }
    }

    // التحقق من اختيار الخزينة
    if (!selectedTreasuryId) {
      showError('خطأ', 'يرجى اختيار الخزينة أو الحساب المصرفي');
      return;
    }

    // التحقق من اختيار الحساب المصرفي عند الدفع بالبطاقة أو التحويل
    const isBankPayment = paymentMethod === 'تحويل بنكي' || paymentMethod === 'بطاقة ائتمان';
    const selectedTreasury = treasuries.find(t => t.id === selectedTreasuryId);

    if (isBankPayment && selectedTreasury?.type !== 'BANK') {
      showError('خطأ', 'يجب اختيار حساب مصرفي عند الدفع بالبطاقة أو التحويل');
      return;
    }

    try {
      await addInstallment({
        paymentReceiptId: selectedReceipt.id,
        amount: parseFloat(installmentAmount), // المبلغ بالعملة الأصلية
        notes: installmentNotes || undefined,
        paymentMethod: paymentMethod || undefined,
        referenceNumber: referenceNumber || undefined,
        treasuryId: selectedTreasuryId,
        exchangeRate: selectedReceipt.currency !== 'LYD' ? parseFloat(installmentExchangeRate) : undefined,
      }).unwrap();

      success('تم بنجاح', 'تم إضافة الدفعة بنجاح');
      setInstallmentAmount('');
      setInstallmentNotes('');
      setPaymentMethod('');
      setReferenceNumber('');
      setSelectedTreasuryId(undefined);
      setInstallmentExchangeRate('');
      refetch();
      refetchInstallments();
    } catch (err: any) {
      showError('خطأ', err.message || 'حدث خطأ أثناء إضافة الدفعة');
    }
  };

  const handlePayReceipt = async (receipt: PaymentReceipt) => {
    // إذا كان الإيصال بعملة أجنبية، إظهار modal لإدخال سعر الصرف
    if (receipt.currency && receipt.currency !== 'LYD') {
      setSelectedReceipt(receipt);
      setNewExchangeRate('');
      setShowPaymentModal(true);
    } else {
      // إذا كان بالدينار، الدفع مباشرة
      const confirmed = await confirm(
        'تأكيد التسديد',
        `هل أنت متأكد من تسديد إيصال الدفع للمورد "${receipt.supplier?.name || 'بدون مورد'}" بمبلغ ${receipt.amount.toFixed(2)} ${receipt.currency}؟`
      );

      if (confirmed) {
        try {
          const result = await payReceipt({ id: receipt.id }).unwrap();
          success('تم التسديد', 'تم تسديد إيصال الدفع بنجاح');
          refetch();

          // طباعة الإيصال تلقائياً بعد التسديد
          setTimeout(() => {
            printReceipt(receipt, null, true);
          }, 1000);
        } catch (err: any) {
          showError('خطأ', err.message || 'حدث خطأ أثناء التسديد');
        }
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedReceipt) return;

    try {
      const exchangeRate = newExchangeRate ? parseFloat(newExchangeRate) : undefined;
      const result = await payReceipt({
        id: selectedReceipt.id,
        exchangeRate
      }).unwrap();

      success('تم التسديد', 'تم تسديد إيصال الدفع بنجاح');
      setShowPaymentModal(false);
      setSelectedReceipt(null);
      setNewExchangeRate('');
      refetch();

      // طباعة الإيصال تلقائياً بعد التسديد
      setTimeout(() => {
        printReceipt(selectedReceipt, null, true);
      }, 1000);
    } catch (err: any) {
      showError('خطأ', err.message || 'حدث خطأ أثناء التسديد');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'PAID':
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
        return 'معلق';
      case 'PAID':
        return 'مسدد';
      case 'CANCELLED':
        return 'ملغي';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'MAIN_PURCHASE':
        return 'فاتورة رئيسية';
      case 'EXPENSE':
        return 'مصروف';
      case 'RETURN':
        return 'مردودات';
      default:
        return type;
    }
  };

  if (receiptsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-text-primary">إيصالات الدفع</h1>
            <p className="text-gray-600 dark:text-text-secondary mt-1">إدارة ومتابعة إيصالات الدفع للموردين والمردودات</p>
          </div>
          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-border-primary rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-gray-50 dark:hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة إيصالات
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-border-primary">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'all'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-tertiary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-border-primary'
                }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>جميع الإيصالات</span>
                {receiptsData?.pagination?.total && activeTab === 'all' && (
                  <span className="bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-tertiary py-1 px-2 rounded-full text-xs">
                    {receiptsData.pagination.total}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabChange('purchases')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchases'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-tertiary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-border-primary'
                }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>إيصالات المشتريات</span>
                {receiptsData?.pagination?.total && activeTab === 'purchases' && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-1 px-2 rounded-full text-xs">
                    {receiptsData.pagination.total}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabChange('returns')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns'
                ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-tertiary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-border-primary'
                }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>إيصالات المردودات</span>
                {receiptsData?.pagination?.total && activeTab === 'returns' && (
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-1 px-2 rounded-full text-xs">
                    {receiptsData.pagination.total}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">معلقة</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{formatEnglishNumber(stats.totalPending)}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">{formatLibyanCurrencyArabic(stats.pendingAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-400">مسددة</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">{formatEnglishNumber(stats.totalPaid)}</p>
                <p className="text-xs text-green-700 dark:text-green-400">{formatLibyanCurrencyArabic(stats.paidAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-sm">❌</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">ملغية</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.totalCancelled}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">الإجمالي</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{formatLibyanCurrencyArabic(stats.totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-md border border-slate-200 dark:border-border-primary p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">البحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث في الموردين أو الوصف..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PENDING">معلقة</option>
              <option value="PAID">مسددة</option>
              <option value="CANCELLED">ملغية</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">النوع</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="MAIN_PURCHASE">فاتورة رئيسية</option>
              <option value="EXPENSE">مصروف</option>
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الشركة</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
            >
              <option value="">جميع الشركات</option>
              {companiesData?.data?.companies?.map((company: any) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setCompanyFilter('');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-md border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-border-primary">
            <thead className="bg-gray-50 dark:bg-surface-secondary">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider min-w-[200px]">
                  صاحب العملية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  النوع
                </th>
                {activeTab === 'purchases' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-40">
                    فاتورة المشتريات
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  المبلغ المدفوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  المبلغ المتبقي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-tertiary uppercase tracking-wider min-w-[150px]">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-border-primary">
              {receiptsData?.receipts?.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-surface-hover">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-text-primary break-words">
                        {receipt.type === 'RETURN' && receipt.notes ? receipt.notes : receipt.supplier?.name || 'بدون مورد'}
                      </span>
                      {receipt.supplier?.phone && receipt.type !== 'RETURN' && (
                        <span className="text-sm text-gray-500 dark:text-text-tertiary">{receipt.supplier?.phone}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${receipt.type === 'MAIN_PURCHASE'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                      }`}>
                      {getTypeText(receipt.type)}
                    </span>
                  </td>
                  {activeTab === 'purchases' && (
                    <td className="px-6 py-4">
                      {receipt.purchase ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {receipt.purchase.invoiceNumber || `#${receipt.purchase.id}`}
                          </span>
                          {receipt.categoryName && (
                            <span className="text-xs text-gray-500 dark:text-text-tertiary">{receipt.categoryName}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-text-tertiary text-sm">غير مرتبط</span>
                      )}
                    </td>
                  )}
                  {/* المبلغ */}
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${receipt.currency === 'LYD'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                      : receipt.currency === 'USD'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                      }`}>
                      {receipt.amount.toFixed(2)} {receipt.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
                    {(receipt.paidAmount ?? 0).toFixed(2)} {receipt.currency}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600 dark:text-red-400">
                    {(receipt.remainingAmount ?? 0).toFixed(2)} {receipt.currency}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(receipt.status)}`}>
                      {getStatusText(receipt.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-text-primary">
                    {formatEnglishDate(receipt.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Installments Button - only for PENDING */}
                      {receipt.status === 'PENDING' && (
                        <button
                          onClick={() => handleOpenInstallmentsModal(receipt)}
                          disabled={isAddingInstallment}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded"
                          title="دفعات جزئية"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                      )}

                      {/* View Details */}
                      <button
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded"
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {receiptsData?.pagination && (
          <div className="bg-white dark:bg-surface-primary px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-border-primary sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-border-primary text-sm font-medium rounded-md text-gray-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-gray-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= receiptsData.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-border-primary text-sm font-medium rounded-md text-gray-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-gray-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-text-secondary">
                  عرض{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * 10 + 1}
                  </span>{' '}
                  إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, receiptsData.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{receiptsData.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: receiptsData.pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
                        ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-surface-secondary border-gray-300 dark:border-border-primary text-gray-500 dark:text-text-tertiary hover:bg-gray-50 dark:hover:bg-surface-hover'
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

      {/* Details Modal */}
      {showDetailsModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black dark:bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-border-primary">
            <div className="p-6 border-b border-gray-200 dark:border-border-primary">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary">تفاصيل إيصال الدفع</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-primary transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">صاحب العملية</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-text-primary">
                    {selectedReceipt.type === 'RETURN' && selectedReceipt.notes ? selectedReceipt.notes : selectedReceipt.supplier?.name || 'بدون مورد'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">النوع</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-text-primary">{getTypeText(selectedReceipt.type)}</p>
                </div>

                {/* معلومات المبلغ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">المبلغ</label>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-text-primary">
                    {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">المبلغ المدفوع</label>
                  <p className="mt-1 text-base font-semibold text-green-600 dark:text-green-400">
                    {(selectedReceipt.paidAmount ?? 0).toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">المبلغ المتبقي</label>
                  <p className="mt-1 text-base font-semibold text-red-600 dark:text-red-400">
                    {(selectedReceipt.remainingAmount ?? 0).toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">الحالة</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReceipt.status)}`}>
                    {getStatusText(selectedReceipt.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">تاريخ الإنشاء</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-text-primary">{new Date(selectedReceipt.createdAt).toLocaleString('en-GB')}</p>
                </div>
                {selectedReceipt.paidAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">تاريخ التسديد</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-text-primary">{new Date(selectedReceipt.paidAt).toLocaleString('en-GB')}</p>
                  </div>
                )}
              </div>

              {selectedReceipt.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">الوصف</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceipt.description}</p>
                </div>
              )}

              {selectedReceipt.categoryName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">فئة المصروف</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceipt.categoryName}</p>
                </div>
              )}

              {selectedReceipt.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceipt.notes}</p>
                </div>
              )}

              {/* Payment History - Installments */}
              {(selectedReceipt.status === 'PAID' || (selectedReceipt.paidAmount ?? 0) > 0) && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">تاريخ الدفعات</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900">الدفعات المنجزة</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {installmentsData?.installments && installmentsData.installments.length > 0 ? (
                        installmentsData.installments.map((installment) => (
                          <div key={installment.id} className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  دفعة جزئية - {installment.amount.toFixed(2)} {selectedReceipt.currency}
                                </p>
                                <p className="text-xs text-gray-500">
                                  تاريخ الدفع: {formatEnglishDate(installment.paidAt)}
                                </p>
                                {installment.paymentMethod && (
                                  <p className="text-xs text-gray-500">
                                    طريقة الدفع: {installment.paymentMethod}
                                  </p>
                                )}
                                {installment.referenceNumber && (
                                  <p className="text-xs text-gray-500">
                                    الرقم المرجعي: {installment.referenceNumber}
                                  </p>
                                )}
                                {installment.notes && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    ملاحظات: {installment.notes}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => printReceipt(selectedReceipt, installment, false)}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                طباعة
                              </button>
                            </div>
                          </div>
                        ))
                      ) : selectedReceipt.status === 'PAID' ? (
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                دفعة كاملة - {formatLibyanCurrencyArabic(selectedReceipt.amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                تاريخ التسديد: {selectedReceipt.paidAt ? new Date(selectedReceipt.paidAt).toLocaleString('en-GB') : 'غير محدد'}
                              </p>
                            </div>
                            <button
                              onClick={() => printReceipt(selectedReceipt, null, false)}
                              className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              طباعة
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                          <p>لا توجد دفعات منجزة لهذا الإيصال</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">طباعة إيصالات الدفع</h2>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600">
                  اختر الدفعة التي تريد طباعتها من القائمة أدناه. كل دفعة تحتوي على زر طباعة منفصل.
                </p>
              </div>

              {/* Installments List for Printing */}
              <div className="space-y-4">
                {receiptsData?.receipts?.filter(receipt => receipt.status === 'PAID' || (receipt.paidAmount && receipt.paidAmount > 0)).map((receipt) => (
                  <div key={receipt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          إيصال #{receipt.id} - {receipt.supplier?.name || 'بدون مورد'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          المبلغ الإجمالي: {formatLibyanCurrencyArabic(receipt.amount)} |
                          المبلغ المدفوع: {formatLibyanCurrencyArabic(receipt.paidAmount ?? 0)}
                        </p>
                      </div>
                      {receipt.status === 'PAID' && (
                        <button
                          onClick={() => printReceipt(receipt, null, false)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          طباعة إيصال كامل
                        </button>
                      )}
                    </div>

                    {/* Individual Installments */}
                    {(receipt.paidAmount && receipt.paidAmount > 0) && (
                      <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-700 mb-3">الدفعات الجزئية:</h4>
                        <div className="space-y-2">
                          {/* Show installments for this receipt */}
                          {(() => {
                            // This is a simplified approach - in a real app, you'd fetch installments for each receipt
                            // For now, we'll show a placeholder that the installments would be fetched
                            return (
                              <div className="text-sm text-gray-500 italic">
                                لطباعة دفعات جزئية محددة، يرجى فتح تفاصيل الإيصال والنقر على زر "دفعات جزئية"
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {(!receiptsData?.receipts || receiptsData.receipts.filter(receipt => receipt.status === 'PAID' || (receipt.paidAmount && receipt.paidAmount > 0)).length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>لا توجد إيصالات مدفوعة للطباعة</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Installments Modal */}
      {showInstallmentsModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                دفعات إيصال الدفع - {selectedReceipt.supplier?.name || 'بدون مورد'}
              </h2>
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Receipt Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">المبلغ الإجمالي</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">المبلغ المدفوع</label>
                  <p className="text-lg font-semibold text-green-600">
                    {(installmentsData?.installments?.reduce((sum, inst) => sum + inst.amount, 0) || 0).toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">المبلغ المتبقي</label>
                  <p className="text-lg font-semibold text-red-600">
                    {(selectedReceipt.amount - (installmentsData?.installments?.reduce((sum, inst) => sum + inst.amount, 0) || 0)).toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">الحالة</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReceipt.status)}`}>
                    {getStatusText(selectedReceipt.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Add New Installment */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">إضافة دفعة جديدة</h3>

              {/* معلومات العملة */}
              {selectedReceipt.currency && selectedReceipt.currency !== 'LYD' && (
                <div className="bg-white p-3 rounded-lg mb-4 border border-blue-200">
                  <p className="text-sm text-gray-700 mb-1">
                    💱 <span className="font-semibold">العملة الأصلية:</span> {selectedReceipt.currency}
                  </p>
                  <p className="text-sm text-gray-700">
                    💰 <span className="font-semibold">المبلغ الإجمالي:</span> {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    * أدخل المبلغ بالعملة الأصلية ({selectedReceipt.currency}) وسعر الصرف الحالي
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ ({selectedReceipt.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.000"
                  />
                </div>

                {/* حقل سعر الصرف - يظهر فقط للعملات الأجنبية */}
                {selectedReceipt.currency && selectedReceipt.currency !== 'LYD' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سعر الصرف *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={installmentExchangeRate}
                      onChange={(e) => setInstallmentExchangeRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="أدخل سعر الصرف الحالي"
                    />
                    {installmentAmount && installmentExchangeRate && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        💸 سيُخصم من الخزينة: {(parseFloat(installmentAmount) * parseFloat(installmentExchangeRate)).toFixed(2)} LYD
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setSelectedTreasuryId(undefined); // إعادة تعيين الخزينة عند تغيير طريقة الدفع
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر طريقة الدفع</option>
                    <option value="نقد">نقد</option>
                    <option value="شيك">شيك</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="بطاقة ائتمان">بطاقة ائتمان</option>
                  </select>
                </div>

                {/* حقل اختيار الخزينة - يظهر عند الدفع نقداً فقط */}
                {(paymentMethod === 'نقد') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                    <select
                      value={selectedTreasuryId || ''}
                      onChange={(e) => setSelectedTreasuryId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الخزينة</option>
                      {cashTreasuries.map((treasury) => (
                        <option key={treasury.id} value={treasury.id}>
                          {treasury.name} ({formatLibyanCurrencyArabic(treasury.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* حقل اختيار الحساب المصرفي - يظهر عند الدفع بالبطاقة أو التحويل أو الشيك */}
                {(paymentMethod === 'تحويل بنكي' || paymentMethod === 'بطاقة ائتمان' || paymentMethod === 'شيك') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحساب المصرفي *</label>
                    <select
                      value={selectedTreasuryId || ''}
                      onChange={(e) => setSelectedTreasuryId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الحساب المصرفي</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {account.bankName} ({formatLibyanCurrencyArabic(account.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم المرجعي</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="رقم الشيك أو التحويل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <input
                    type="text"
                    value={installmentNotes}
                    onChange={(e) => setInstallmentNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ملاحظات إضافية"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAddInstallment}
                  disabled={isAddingInstallment || !installmentAmount || parseFloat(installmentAmount) <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingInstallment ? 'جاري الإضافة...' : 'إضافة دفعة'}
                </button>
              </div>
            </div>

            {/* Installments List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">الدفعات السابقة</h3>
              {installmentsData?.installments && installmentsData.installments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الدفع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الرقم المرجعي</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الدفع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ملاحظات</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طباعة</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {installmentsData.installments.map((installment) => (
                        <tr key={installment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={`font-semibold ${selectedReceipt.currency === 'LYD' ? 'text-green-600' :
                              selectedReceipt.currency === 'USD' ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                              {installment.amount.toFixed(2)} {selectedReceipt.currency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {installment.paymentMethod || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {installment.referenceNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatEnglishDate(installment.paidAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {installment.notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => printReceipt(selectedReceipt, installment, false)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="طباعة هذه الدفعة"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">لا توجد دفعات سابقة</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal - Exchange Rate */}
      {showPaymentModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 تسديد إيصال دفع</h2>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">المورد:</span> {selectedReceipt.supplier?.name || 'بدون مورد'}
                </p>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <p className="text-base font-bold text-blue-900 mb-1">
                    💵 المبلغ المطلوب: {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                  </p>
                  {selectedReceipt.currency !== 'LYD' && (
                    <p className="text-xs text-gray-600 mt-1">
                      * سيتم التسديد بـ {selectedReceipt.currency} والخصم من الخزينة بالدينار الليبي
                    </p>
                  )}
                </div>
              </div>

              {selectedReceipt.currency !== 'LYD' ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 سعر الصرف *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newExchangeRate}
                    onChange={(e) => setNewExchangeRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل سعر الصرف الحالي"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    أدخل سعر الصرف الحالي لحساب المبلغ بالدينار
                  </p>
                  {newExchangeRate && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-900">
                        💸 المبلغ الذي سيُخصم من الخزينة:
                      </p>
                      <p className="text-lg font-bold text-green-700 mt-1">
                        {(selectedReceipt.amount * parseFloat(newExchangeRate)).toFixed(2)} LYD
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    💸 <span className="font-semibold">المبلغ الذي سيُخصم من الخزينة:</span>
                  </p>
                  <p className="text-lg font-bold text-green-700 mt-1">
                    {selectedReceipt.amount.toFixed(2)} LYD
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  تأكيد التسديد
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedReceipt(null);
                    setNewExchangeRate('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
