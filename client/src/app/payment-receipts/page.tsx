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
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-transparent">
      {/* Header */}
      <div className="mb-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-text-primary tracking-tight">إيصالات الدفع</h1>
            <p className="text-slate-600 dark:text-text-secondary mt-1 text-lg">إدارة ومتابعة إيصالات الدفع للموردين والمردودات</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-border-primary shadow-sm text-sm font-bold text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover hover:border-slate-300 dark:hover:border-border-primary transition-all duration-200 group"
            >
              <svg className="w-5 h-5 ml-2 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة إيصالات
            </button>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-200 dark:border-border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center border border-yellow-100 dark:border-yellow-900/30">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">إيصالات معلقة</p>
                <p className="text-2xl font-black text-slate-900 dark:text-text-primary mt-1">{formatEnglishNumber(stats.totalPending)}</p>
                <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mt-1">{formatLibyanCurrencyArabic(stats.pendingAmount)}</p>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-200 dark:border-border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center border border-green-100 dark:border-green-900/30">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">إيصالات مسددة</p>
                <p className="text-2xl font-black text-slate-900 dark:text-text-primary mt-1">{formatEnglishNumber(stats.totalPaid)}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1">{formatLibyanCurrencyArabic(stats.paidAmount)}</p>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-200 dark:border-border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-900/30">
                  <span className="text-2xl">❌</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider">إيصالات ملغية</p>
                <p className="text-2xl font-black text-slate-900 dark:text-text-primary mt-1">{stats.totalCancelled}</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">ملغي نهائياً</p>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-200 dark:border-border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">إجمالي المبالغ</p>
                <p className="text-2xl font-black text-slate-900 dark:text-text-primary mt-1">{formatLibyanCurrencyArabic(stats.totalAmount)}</p>
                <p className="text-sm font-bold text-slate-400 dark:text-text-tertiary mt-1">جميع الحالات</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border-2 border-slate-100 dark:border-border-primary p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">البحث السريع</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث في الموردين أو الوصف..."
                className="w-full px-4 py-2.5 pl-10 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4-4m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold cursor-pointer"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PENDING">⏳ معلقة</option>
              <option value="PAID">✅ مسددة</option>
              <option value="CANCELLED">❌ ملغية</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">النوع</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold cursor-pointer"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="MAIN_PURCHASE">📄 فاتورة رئيسية</option>
              <option value="EXPENSE">💰 مصروف</option>
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
              className="w-full px-4 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-blue-700 shadow-md transition-all active:scale-95"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow-md border border-slate-200 dark:border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-slate-100 dark:divide-border-primary">
            <thead className="bg-slate-50/50 dark:bg-surface-secondary">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider min-w-[200px]">
                  صاحب العملية
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  النوع
                </th>
                {activeTab === 'purchases' && (
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-40">
                    فاتورة المشتريات
                  </th>
                )}
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  المبلغ
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32 border-r border-slate-100 dark:border-border-primary">
                  المدفوع
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  المتبقي
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider w-32">
                  التاريخ
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-text-tertiary uppercase tracking-wider min-w-[150px]">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-primary divide-y divide-slate-100 dark:divide-border-primary">
              {receiptsData?.receipts?.map((receipt) => (
                <tr key={receipt.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all duration-150">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-text-primary text-base">
                        {receipt.type === 'RETURN' && receipt.notes ? receipt.notes : receipt.supplier?.name || 'بدون مورد'}
                      </span>
                      {receipt.supplier?.phone && receipt.type !== 'RETURN' && (
                        <span className="text-xs text-slate-500 dark:text-text-tertiary mt-0.5 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {receipt.supplier?.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg border shadow-sm ${receipt.type === 'MAIN_PURCHASE'
                      ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/30'
                      : 'bg-orange-100/50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800/30'
                      }`}>
                      {getTypeText(receipt.type)}
                    </span>
                  </td>
                  {activeTab === 'purchases' && (
                    <td className="px-6 py-4 text-right">
                      {receipt.purchase ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                            {receipt.purchase.invoiceNumber || `#${receipt.purchase.id}`}
                          </span>
                          {receipt.categoryName && (
                            <span className="text-xs text-slate-500 dark:text-text-tertiary mt-0.5 font-medium">{receipt.categoryName}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-text-tertiary text-xs font-medium">غير مرتبط</span>
                      )}
                    </td>
                  )}
                  {/* المبلغ */}
                  <td className="px-6 py-4 text-sm font-bold">
                    <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border font-black ${receipt.currency === 'LYD'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30'
                      : receipt.currency === 'USD'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/30'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800/30'
                      }`}>
                      {receipt.amount.toFixed(2)} {receipt.currency}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600 dark:text-emerald-400 border-r border-slate-50 dark:border-border-primary/50">
                    {(receipt.paidAmount ?? 0).toFixed(2)} {receipt.currency}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-rose-600 dark:text-rose-400">
                    {(receipt.remainingAmount ?? 0).toFixed(2)} {receipt.currency}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg shadow-sm border ${getStatusColor(receipt.status)}`}>
                      {getStatusText(receipt.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-text-secondary font-medium">
                    {formatEnglishDate(receipt.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Installments Button - only for PENDING */}
                      {receipt.status === 'PENDING' && (
                        <button
                          onClick={() => handleOpenInstallmentsModal(receipt)}
                          disabled={isAddingInstallment}
                          className="flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30 transition-all group/btn"
                          title="دفعات جزئية"
                        >
                          <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-2 rounded-xl border border-blue-100 dark:border-blue-800/30 transition-all group/btn"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-slate-50/50 dark:bg-surface-secondary px-6 py-4 flex items-center justify-between border-t-2 border-slate-100 dark:border-border-primary">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border-2 border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= receiptsData.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border-2 border-slate-200 dark:border-border-primary text-sm font-bold rounded-xl text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-text-tertiary font-bold">
                  عرض{' '}
                  <span className="text-slate-900 dark:text-text-primary">
                    {(currentPage - 1) * 10 + 1}
                  </span>{' '}
                  إلى{' '}
                  <span className="text-slate-900 dark:text-text-primary">
                    {Math.min(currentPage * 10, receiptsData.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="text-slate-900 dark:text-text-primary">{receiptsData.pagination.total}</span>{' '}
                  إيصال
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px gap-1" aria-label="Pagination">
                  {Array.from({ length: receiptsData.pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-black rounded-xl transition-all ${currentPage === i + 1
                        ? 'z-10 bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover'
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-100 dark:border-border-primary flex flex-col scale-in-center">
            <div className="p-6 border-b-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-text-primary px-3 tracking-tight">تفاصيل إيصال الدفع</h2>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-surface-primary text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-200 dark:border-border-primary transition-all shadow-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-widest">صاحب العملية</label>
                  <p className="text-lg font-black text-slate-900 dark:text-text-primary">
                    {selectedReceipt.type === 'RETURN' && selectedReceipt.notes ? selectedReceipt.notes : selectedReceipt.supplier?.name || 'بدون مورد'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-widest">نوع الإيصال</label>
                  <div>
                    <span className={`inline-flex px-3 py-1 text-xs font-black rounded-lg border ${selectedReceipt.type === 'MAIN_PURCHASE' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                      {getTypeText(selectedReceipt.type)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-surface-secondary p-4 rounded-2xl border-2 border-slate-100 dark:border-border-primary">
                  <label className="text-xs font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-widest">المبلغ الإجمالي</label>
                  <p className="text-2xl font-black text-slate-900 dark:text-text-primary mt-1">
                    {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800/30">
                  <label className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">إجمالي المدفوع</label>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {(selectedReceipt.paidAmount ?? 0).toFixed(2)} {selectedReceipt.currency}
                  </p>
                </div>

                <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border-2 border-rose-100 dark:border-rose-800/30 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest">المبلغ المتبقي</label>
                      <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        {(selectedReceipt.remainingAmount ?? 0).toFixed(2)} {selectedReceipt.currency}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border-2 font-black ${getStatusColor(selectedReceipt.status)}`}>
                      {getStatusText(selectedReceipt.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-widest">تاريخ الإصدار</label>
                  <p className="font-bold text-slate-700 dark:text-text-secondary">{new Date(selectedReceipt.createdAt).toLocaleString('en-GB')}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-widest">آخر تحديث</label>
                  <p className="font-bold text-slate-700 dark:text-text-secondary">{selectedReceipt.paidAt ? new Date(selectedReceipt.paidAt).toLocaleString('en-GB') : 'لم يتم الدفع بعد'}</p>
                </div>
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
                <div className="mt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-text-primary uppercase tracking-widest">سجل الدفعات</h4>
                  </div>
                  <div className="border-2 border-slate-100 dark:border-border-primary rounded-2xl overflow-hidden bg-white dark:bg-surface-primary shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="divide-y-2 divide-slate-50 dark:divide-border-primary">
                      {installmentsData?.installments && installmentsData.installments.length > 0 ? (
                        installmentsData.installments.map((installment) => (
                          <div key={installment.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-blue-900/5 transition-colors group">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-base font-black text-slate-900 dark:text-text-primary">
                                    {installment.amount.toFixed(2)} {selectedReceipt.currency}
                                  </p>
                                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded uppercase tracking-tighter">دفعة جزئية</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <p className="text-xs font-bold text-slate-400 dark:text-text-tertiary flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatEnglishDate(installment.paidAt)}
                                  </p>
                                  {installment.paymentMethod && (
                                    <p className="text-xs font-bold text-slate-400 dark:text-text-tertiary flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                      </svg>
                                      {installment.paymentMethod}
                                    </p>
                                  )}
                                </div>
                                {installment.notes && (
                                  <p className="text-xs font-medium text-slate-500 dark:text-text-tertiary bg-slate-50 dark:bg-surface-secondary px-2 py-1 rounded inline-block">
                                    {installment.notes}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => printReceipt(selectedReceipt, installment, false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-800/30 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                title="طباعة الإيصال"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : selectedReceipt.status === 'PAID' ? (
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-black text-slate-900 dark:text-text-primary">
                                  {formatLibyanCurrencyArabic(selectedReceipt.amount)}
                                </p>
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded uppercase tracking-tighter">دفعة كاملة</span>
                              </div>
                              <p className="text-xs font-bold text-slate-400 dark:text-text-tertiary flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {selectedReceipt.paidAt ? new Date(selectedReceipt.paidAt).toLocaleString('en-GB') : 'غير محدد'}
                              </p>
                            </div>
                            <button
                              onClick={() => printReceipt(selectedReceipt, null, false)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
                              title="طباعة الإيصال"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 dark:text-text-tertiary">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-bold">لا يوجد سجل دفعات لهذا الإيصال</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-8 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-slate-900 dark:hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
              >
                فهمت، إغلاق القائمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-100 dark:border-border-primary flex flex-col scale-in-center">
            <div className="p-6 border-b-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-text-primary px-3 tracking-tight">طباعة إيصالات الدفع</h2>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-surface-primary text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-200 dark:border-border-primary transition-all shadow-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border-2 border-blue-100 dark:border-blue-800/30">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-relaxed">
                  👋 أهلاً بك! اختر الإيصال الذي تريد طباعته من القائمة أدناه. يمكنك طباعة النسخة الكاملة للفاتورة أو الدفعات المفصلة بالضغط على زر الطباعة المخصص لكل عنصر.
                </p>
              </div>

              {/* Installments List for Printing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {receiptsData?.receipts?.filter((receipt: any) => receipt.status === 'PAID' || (receipt.paidAmount && receipt.paidAmount > 0)).map((receipt: any) => (
                  <div key={receipt.id} className="group relative bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الإيصال: #{receipt.id}</p>
                        <h3 className="text-lg font-black text-slate-900 dark:text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {receipt.supplier?.name || 'بدون مورد'}
                        </h3>
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-bold text-slate-500 dark:text-text-tertiary">
                            الإجمالي: <span className="text-slate-900 dark:text-text-primary px-1">{formatLibyanCurrencyArabic(receipt.amount)}</span>
                          </p>
                          <p className="text-xs font-bold text-emerald-600">
                            المدفوع: <span className="px-1">{formatLibyanCurrencyArabic(receipt.paidAmount ?? 0)}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-slate-50 dark:border-border-primary">
                      {receipt.status === 'PAID' ? (
                        <button
                          onClick={() => printReceipt(receipt, null, false)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          طباعة الإيصال الكامل
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 p-2 bg-slate-50 dark:bg-surface-secondary text-slate-400 dark:text-text-tertiary text-[10px] font-black rounded-lg border border-dashed border-slate-200 dark:border-border-primary">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          الإيصال قيد التحصيل جزئياً (اطبع من التفاصيل)
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(!receiptsData?.receipts || receiptsData.receipts.filter((receipt: any) => receipt.status === 'PAID' || (receipt.paidAmount && receipt.paidAmount > 0)).length === 0) && (
                  <div className="col-span-full py-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-border-primary">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-xl font-black text-slate-400 dark:text-text-tertiary">لا توجد إيصالات مدفوعة جاهزة للطباعة حالياً</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary text-right">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-8 py-2.5 bg-slate-200 dark:bg-surface-secondary text-slate-700 dark:text-text-primary rounded-xl font-bold shadow-sm hover:bg-slate-300 dark:hover:bg-surface-hover transition-all active:scale-95 border-2 border-transparent hover:border-slate-400 dark:hover:border-border-primary"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Installments Modal */}
      {showInstallmentsModal && selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-100 dark:border-border-primary flex flex-col scale-in-center">
            <div className="p-6 border-b-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-text-primary px-3 tracking-tight">إدارة دفعات الإيصال</h2>
                </div>
                <button
                  onClick={() => setShowInstallmentsModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-surface-primary text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-200 dark:border-border-primary transition-all shadow-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              {/* Receipt Summary */}
              <div className="bg-slate-50 dark:bg-surface-secondary p-6 rounded-2xl border-2 border-slate-100 dark:border-border-primary mb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ الإجمالي</label>
                    <p className="text-lg font-black text-slate-900 dark:text-text-primary">
                      {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ المدفوع</label>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {(installmentsData?.installments?.reduce((sum, inst) => sum + inst.amount, 0) || 0).toFixed(2)} {selectedReceipt.currency}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ المتبقي</label>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {(selectedReceipt.amount - (installmentsData?.installments?.reduce((sum, inst) => sum + inst.amount, 0) || 0)).toFixed(2)} {selectedReceipt.currency}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className={`inline-flex px-3 py-1 text-[10px] font-black rounded-lg border shadow-sm self-start ${getStatusColor(selectedReceipt.status)}`}>
                      {getStatusText(selectedReceipt.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add New Installment Section */}
              <div className="relative overflow-hidden bg-white dark:bg-surface-primary border-2 border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 mb-8 shadow-sm">
                <div className="relative z-10">
                  <h3 className="text-lg font-black text-slate-900 dark:text-text-primary mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    إضافة دفعة جديدة
                  </h3>

                  {selectedReceipt.currency && selectedReceipt.currency !== 'LYD' && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-6 flex items-center gap-4">
                      <div className="text-2xl">💱</div>
                      <div>
                        <p className="text-xs font-bold text-blue-900 dark:text-blue-300">العملة الأصلية: {selectedReceipt.currency}</p>
                        <p className="text-sm font-black text-blue-700 dark:text-blue-400">الإجمالي: {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">المبلغ ({selectedReceipt.currency})</label>
                      <input
                        type="number"
                        step="0.001"
                        value={installmentAmount}
                        onChange={(e) => setInstallmentAmount(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold"
                        placeholder="0.000"
                      />
                    </div>

                    {selectedReceipt.currency && selectedReceipt.currency !== 'LYD' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">سعر الصرف الحالي</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={installmentExchangeRate}
                          onChange={(e) => setInstallmentExchangeRate(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold"
                          placeholder="مثال: 4.85"
                        />
                        {installmentAmount && installmentExchangeRate && (
                          <p className="text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-tighter">
                            💸 سيُخصم: {(parseFloat(installmentAmount) * parseFloat(installmentExchangeRate)).toFixed(2)} LYD
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">طريقة الدفع</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          setSelectedTreasuryId(undefined);
                        }}
                        className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold cursor-pointer"
                      >
                        <option value="">اختر الطريقة...</option>
                        <option value="نقد">💵 نقد كاش</option>
                        <option value="شيك">🏦 شيك مصدق</option>
                        <option value="تحويل بنكي">📱 تحويل بنكي</option>
                        <option value="بطاقة ائتمان">💳 بطاقة مصرفية</option>
                      </select>
                    </div>

                    {(paymentMethod === 'نقد') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">الخزينة النقدية</label>
                        <select
                          value={selectedTreasuryId || ''}
                          onChange={(e) => setSelectedTreasuryId(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold cursor-pointer"
                        >
                          <option value="">اختر الخزينة...</option>
                          {cashTreasuries.map((treasury) => (
                            <option key={treasury.id} value={treasury.id}>
                              {treasury.name} ({formatLibyanCurrencyArabic(treasury.balance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(paymentMethod === 'تحويل بنكي' || paymentMethod === 'بطاقة ائتمان' || paymentMethod === 'شيك') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">الحساب المصرفي</label>
                        <select
                          value={selectedTreasuryId || ''}
                          onChange={(e) => setSelectedTreasuryId(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold cursor-pointer"
                        >
                          <option value="">اختر الحساب...</option>
                          {bankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} - {account.bankName} ({formatLibyanCurrencyArabic(account.balance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">الرقم المرجعي</label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold"
                        placeholder="رقم العملية"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">ملاحظات إضافية</label>
                      <input
                        type="text"
                        value={installmentNotes}
                        onChange={(e) => setInstallmentNotes(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold"
                        placeholder="اكتب أي تفاصيل هنا..."
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleAddInstallment}
                        disabled={isAddingInstallment || !installmentAmount || parseFloat(installmentAmount) <= 0}
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-black text-sm shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isAddingInstallment ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            تأكيد إضافة الدفعة
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Installments List */}
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center text-xs font-black">
                    {installmentsData?.installments?.length || 0}
                  </span>
                  سجل الدفعات السابقة
                </h3>

                {installmentsData?.installments && installmentsData.installments.length > 0 ? (
                  <div className="border-2 border-slate-100 dark:border-border-primary rounded-3xl overflow-hidden bg-white dark:bg-surface-primary shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y-2 divide-slate-100 dark:divide-border-primary">
                        <thead className="bg-slate-50/50 dark:bg-surface-secondary">
                          <tr>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المبلغ والعملة</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">طريقة الدفع</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">التاريخ</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-border-primary">
                          {installmentsData.installments.map((installment) => (
                            <tr key={installment.id} className="hover:bg-slate-50/50 dark:hover:bg-blue-900/5 transition-all group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-900 dark:text-text-primary">
                                    {installment.amount.toFixed(2)} {selectedReceipt.currency}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    {installment.referenceNumber || 'لا يوجد رقم مرجعي'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-surface-secondary text-slate-600 dark:text-text-secondary text-[10px] font-black rounded-lg">
                                  {installment.paymentMethod || 'غير محدد'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-slate-500 dark:text-text-tertiary">
                                  {formatEnglishDate(installment.paidAt)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => printReceipt(selectedReceipt, installment, false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="طباعة الدفعة"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center bg-slate-50 dark:bg-surface-secondary rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-primary">
                    <div className="w-16 h-16 bg-white dark:bg-surface-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 dark:text-text-tertiary font-black">لا توجد دفعات مسجلة لهذا الإيصال حتى الآن</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end p-6 border-t-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary">
              <button
                onClick={() => setShowInstallmentsModal(false)}
                className="px-8 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-slate-900 dark:hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
              >
                إنهاء العمل وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal - Exchange Rate */}
      {showPaymentModal && selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-100 dark:border-border-primary scale-in-center">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-text-primary mb-2">تسديد إيصال دفع</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-text-tertiary mb-6">
                تأكيد عملية التسديد الكاملة للمورد: <span className="text-slate-900 dark:text-text-primary px-1">{selectedReceipt.supplier?.name || 'بدون مورد'}</span>
              </p>

              <div className="bg-slate-50 dark:bg-surface-secondary p-5 rounded-2xl border-2 border-slate-100 dark:border-border-primary mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ المستحق</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {selectedReceipt.amount.toFixed(2)} {selectedReceipt.currency}
                </p>
              </div>

              {selectedReceipt.currency !== 'LYD' ? (
                <div className="mb-8 text-right">
                  <label className="block text-xs font-black text-slate-500 dark:text-text-tertiary mb-2 uppercase tracking-wider">سعر الصرف لعملة {selectedReceipt.currency}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newExchangeRate}
                    onChange={(e) => setNewExchangeRate(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-100 dark:border-border-primary rounded-2xl bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary text-xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-center"
                    placeholder="0.0000"
                  />
                  {newExchangeRate && (
                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">الإجمالي بالدينار:</span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {(selectedReceipt.amount * parseFloat(newExchangeRate)).toFixed(2)} LYD
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">سيتم خصم المبلغ مباشرة من الخزينة الرئيسية بالدينار الليبي</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedReceipt(null);
                    setNewExchangeRate('');
                  }}
                  className="px-6 py-4 bg-slate-100 dark:bg-surface-secondary text-slate-600 dark:text-text-tertiary font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-surface-hover transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmPayment}
                  className="px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
                >
                  تأكيد التسديد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
