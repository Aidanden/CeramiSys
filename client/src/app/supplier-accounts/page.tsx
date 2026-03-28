"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useGetAllSuppliersAccountSummaryQuery,
  useGetSupplierAccountQuery,
  useGetSupplierOpenPurchasesQuery,
  useLazyGetSupplierPaymentReceiptQuery,
  useDeleteOpeningBalanceMutation
} from "@/state/supplierAccountApi";
import {
  User,
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Phone,
  Home,
  Plus,
  Trash2
} from "lucide-react";
import {
  formatLibyanCurrencyEnglish,
  formatEnglishDate
} from "@/utils/formatLibyanNumbers";
import OpeningBalanceModal from "@/components/shared/OpeningBalanceModal";
import SettleOpeningBalanceModal from "@/components/shared/SettleOpeningBalanceModal";
import { printSupplierSettleReceipt } from "@/utils/printUtils";
// Combined with import at line 18

type ViewMode = 'summary' | 'account' | 'purchases';

const SupplierAccountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const accountPrintRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // الرصيد الافتتاحي
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [targetSupplier, setTargetSupplier] = useState<{ id: number; name: string } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { data: summaryData, isLoading, error, refetch: refetchSummary } = useGetAllSuppliersAccountSummaryQuery();
  const { data: accountData, isLoading: isLoadingAccount, refetch: refetchAccount } = useGetSupplierAccountQuery(selectedSupplierId ?? 0, {
    skip: !selectedSupplierId || viewMode !== 'account'
  });
  const { data: purchasesData, isLoading: isLoadingPurchases, refetch: refetchPurchases } = useGetSupplierOpenPurchasesQuery(selectedSupplierId ?? 0, {
    skip: !selectedSupplierId || viewMode !== 'purchases'
  });

  // تحديث البيانات عند التركيز على الصفحة
  useEffect(() => {
    const handleFocus = () => {
      refetchSummary();
      if (selectedSupplierId && viewMode === 'account') {
        refetchAccount();
      }
      if (selectedSupplierId && viewMode === 'purchases') {
        refetchPurchases();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedSupplierId, viewMode, refetchSummary, refetchAccount, refetchPurchases]);

  const suppliers = summaryData?.data || [];
  const account = accountData?.data;
  const openPurchases = purchasesData?.data || [];

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // حساب الإحصائيات للموردين الذين لديهم أرصدة (في أي عملة)
  const totalCreditors = suppliers.filter((s) => s.currentBalance > 0).length;
  const totalDebtors = suppliers.filter((s) => s.currentBalance < 0).length;

  const statsNumberFormatter = new Intl.NumberFormat('en-US');
  const formatStatsNumber = (value: number) => statsNumberFormatter.format(value);
  const formatCurrency = formatLibyanCurrencyEnglish;
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600 dark:text-red-400';
    if (balance < 0) return 'text-green-600 dark:text-green-400';
    return 'text-slate-600 dark:text-text-secondary';
  };
  const getBalanceText = (balance: number) => {
    if (balance > 0) return 'مستحق عليك';
    if (balance < 0) return 'مدين لك';
    return 'متوازن';
  };
  const getOperationDescription = (type: 'DEBIT' | 'CREDIT') =>
    type === 'CREDIT' ? 'مبلغ يجب دفعه للمورد (دين)' : 'دفعة تم تسديدها للمورد';

  const handleShowAccount = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setViewMode('account');
  };

  const handleShowPurchases = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setViewMode('purchases');
  };

  const handleBackToSummary = () => {
    setSelectedSupplierId(null);
    setViewMode('summary');
  };

  const handleOpenOpeningBalanceModal = (id: number, name: string) => {
    setTargetSupplier({ id, name });
    setShowOpeningBalanceModal(true);
  };

  const handleSettleOpeningBalance = (entry: any) => {
    setSelectedEntry(entry);
    setShowSettleModal(true);
  };

  const [triggerGetSupplierPaymentReceipt] = useLazyGetSupplierPaymentReceiptQuery();
  const [deleteOpeningBalance] = useDeleteOpeningBalanceMutation();

  const handlePrintSupplierPayment = async (receiptId: number) => {
    try {
      const result = await triggerGetSupplierPaymentReceipt(receiptId).unwrap();
      printSupplierSettleReceipt(result, selectedSupplier?.name || '');
    } catch (err) {
      console.error('Error fetching receipt data:', err);
      alert('حدث خطأ أثناء محاولة جلب بيانات الإيصال');
    }
  };

  const handleDeleteOpeningBalance = async (entryId: number) => {
    if (!selectedSupplierId) return;

    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من حذف هذا الرصيد المرحل؟\n\nلن تتمكن من التراجع عن هذا الإجراء.'
    );

    if (!confirmed) return;

    try {
      await deleteOpeningBalance({ 
        id: entryId, 
        supplierId: selectedSupplierId 
      }).unwrap();
      
      alert('✅ تم حذف الرصيد المرحل بنجاح');
      refetchAccount();
      refetchSummary();
    } catch (err: any) {
      console.error('Error deleting opening balance:', err);
      alert(`❌ ${err?.data?.message || 'حدث خطأ أثناء حذف الرصيد المرحل'}`);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handlePrintAccount = () => {
    if (!account) return;

    const rowsHtml = (account.entries.length
      ? account.entries
      : [{
        id: 0,
        transactionDate: '',
        description: 'لا توجد معاملات',
        referenceType: '',
        referenceId: 0,
        transactionType: 'DEBIT' as 'DEBIT' | 'CREDIT',
        amount: 0,
        currency: 'LYD',
      }]
    ).map((entry) => `
        <tr>
          <td>${entry.transactionDate ? formatEnglishDate(entry.transactionDate) : ''}</td>
          <td>${entry.description || `${entry.referenceType} #${entry.referenceId}`}</td>
          <td>${entry.transactionType === 'DEBIT' ? 'دفعة' : 'دين'}</td>
          <td><strong>${Number(entry.amount).toFixed(2)} ${entry.currency || 'LYD'}</strong></td>
          <td>${getOperationDescription(entry.transactionType)}</td>
        </tr>
      `).join('');

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;

    // إنشاء جدول الأرصدة حسب العملة
    const balancesByCurrency = account.totalsByCurrency
      ? Object.entries(account.totalsByCurrency)
        .filter(([_, totals]) => Math.abs(totals.balance) > 0.01 || totals.credit > 0 || totals.debit > 0)
        .map(([currency, totals]) => `
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 4px; background: #f9fafb;">
              <h4 style="margin: 0 0 8px 0; color: #1f2937;">حساب ${currency}</h4>
              <p style="margin: 4px 0;"><strong>الرصيد:</strong> ${Math.abs(Number(totals.balance)).toFixed(2)} ${currency} 
                <span style="color: ${totals.balance > 0 ? '#dc2626' : totals.balance < 0 ? '#16a34a' : '#6b7280'};">
                  (${totals.balance > 0 ? 'مستحق عليك' : totals.balance < 0 ? 'مدين لك' : 'متوازن'})
                </span>
              </p>
              <p style="margin: 4px 0;"><strong>الديون:</strong> ${Number(totals.credit).toFixed(2)} ${currency}</p>
              <p style="margin: 4px 0;"><strong>المدفوع:</strong> ${Number(totals.debit).toFixed(2)} ${currency}</p>
            </div>
          `).join('')
      : '<p>لا توجد حركات مالية</p>';

    const supplierInfo = `
      <div class="supplier-info">
        <p>الاسم: <strong>${account.supplier.name}</strong></p>
        <p>الهاتف: <strong>${account.supplier.phone || '-'}</strong></p>
        <p>تاريخ التسجيل: <strong>${formatEnglishDate(account.supplier.createdAt)}</strong></p>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>كشف حساب المورد - ${account.supplier.name}</title>
          <style>
            body { font-family: 'Cairo', 'Tahoma', sans-serif; margin: 24px; }
            h2 { text-align: center; margin-bottom: 8px; }
            h3 { margin-top: 24px; margin-bottom: 12px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 14px; }
            th { background: #f3f4f6; font-weight: 600; }
            .supplier-info { margin-top: 16px; margin-bottom: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
            .supplier-info p { margin: 0; font-size: 14px; }
            .balances-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
            .note { background: #eff6ff; border-right: 4px solid #3b82f6; padding: 12px; margin-bottom: 16px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h2>كشف حساب المورد</h2>
          ${supplierInfo}
          <div class="note">
            ⚠️ <strong>ملاحظة:</strong> يتم عرض كل حركة بعملتها الأصلية دون أي تحويل. كل مورد له حسابات منفصلة لكل عملة.
          </div>
          <h3>💱 الأرصدة حسب العملة</h3>
          <div class="balances-grid">
            ${balancesByCurrency}
          </div>
          <h3>📋 كشف الحساب التفصيلي</h3>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>النوع</th>
                <th>المبلغ والعملة</th>
                <th>العملية</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-500 dark:text-red-400">حدث خطأ في تحميل البيانات</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-secondary p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-text-primary mb-2">
            {viewMode === 'summary' && 'إدارة حسابات الموردين'}
            {viewMode === 'account' && `كشف حساب: ${selectedSupplier?.name || ''}`}
            {viewMode === 'purchases' && `المشتريات المفتوحة: ${selectedSupplier?.name || ''}`}
          </h1>
          <p className="text-slate-600 dark:text-text-secondary mb-3">
            {viewMode === 'summary' && 'متابعة حسابات الموردين والمستحقات بشكل شامل'}
            {viewMode === 'account' && 'عرض تفصيلي لجميع المعاملات والحركات المالية مع المورد'}
            {viewMode === 'purchases' && 'مراجعة فواتير المشتريات غير المسددة بالكامل'}
          </p>
          {viewMode === 'summary' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500 dark:border-blue-400 p-4 rounded-xl">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400">💱 نظام الحسابات متعدد العملات</h3>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                    كل مورد له حسابات منفصلة لكل عملة (LYD, USD, EUR). يتم تسجيل كل فاتورة بعملتها الأصلية دون أي تحويل. سعر الصرف يُستخدم فقط عند السداد الفعلي.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-text-secondary mb-2">إجمالي الموردين</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatStatsNumber(suppliers.length)}</p>
                  <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">مورد نشط</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-text-secondary mb-2">موردين لديهم ديون</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatStatsNumber(totalCreditors)}</p>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">مستحقات علينا</p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-text-secondary mb-2">موردين مدينين</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatStatsNumber(totalDebtors)}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">لهم ديون لنا</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode !== 'summary' && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={handleBackToSummary}
              className="px-4 py-2 bg-gray-200 dark:bg-surface-secondary text-gray-700 dark:text-text-primary rounded-md hover:bg-gray-300 dark:hover:bg-surface-hover transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>العودة للقائمة</span>
            </button>
            {viewMode === 'account' && account && (
              <button
                onClick={handlePrintAccount}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                طباعة كشف الحساب
              </button>
            )}
          </div>
        )}

        {viewMode === 'summary' && (
          <>
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow mb-6 p-4 border border-slate-200 dark:border-border-primary">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-text-tertiary w-5 h-5" />
                <input
                  type="text"
                  placeholder="بحث عن مورد (الاسم أو الهاتف)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-surface-primary rounded-xl shadow overflow-hidden border border-slate-200 dark:border-border-primary">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-surface-secondary border-b border-slate-200 dark:border-border-primary">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">#</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">المورد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">رقم الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-border-primary">
                    {paginatedSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-text-tertiary">لا توجد نتائج</td>
                      </tr>
                    ) : (
                      paginatedSuppliers.map((supplier, index) => (
                        <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-text-tertiary">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${supplier.currentBalance > 0 ? 'bg-red-100 dark:bg-red-900/30' : supplier.currentBalance < 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-surface-hover'
                                }`}>
                                <User className={`w-5 h-5 ${supplier.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : supplier.currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-text-secondary'
                                  }`} />
                              </div>
                              <div className="mr-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-text-primary">{supplier.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">{supplier.phone || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.currentBalance > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : supplier.currentBalance < 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-slate-100 dark:bg-surface-hover text-gray-800 dark:text-text-primary'
                              }`}>
                              {getBalanceText(supplier.currentBalance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleShowAccount(supplier.id)}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-2 shadow-sm"
                            >
                              <FileText className="w-4 h-4 ml-1" />
                              كشف الحساب
                            </button>
                            <button
                              onClick={() => handleOpenOpeningBalanceModal(supplier.id, supplier.name)}
                              className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors ml-2 shadow-sm"
                            >
                              <Plus className="w-4 h-4 ml-1" />
                              إضافة رصيد مرحل
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-surface-primary px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-border-primary sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-gray-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-slate-50 dark:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-text-secondary">
                        عرض{' '}
                        <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                        {' '}إلى{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredSuppliers.length)}
                        </span>
                        {' '}من{' '}
                        <span className="font-medium">{filteredSuppliers.length}</span>
                        {' '}نتيجة
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-medium text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">السابق</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {(() => {
                          const pages: (number | string)[] = [];

                          if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            if (currentPage <= 4) {
                              for (let i = 1; i <= 5; i++) pages.push(i);
                              pages.push('...');
                              pages.push(totalPages);
                            } else if (currentPage >= totalPages - 3) {
                              pages.push(1);
                              pages.push('...');
                              for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              pages.push('...');
                              for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                              pages.push('...');
                              pages.push(totalPages);
                            }
                          }

                          return pages.map((page, idx) => (
                            page === '...' ? (
                              <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-medium text-gray-700 dark:text-text-primary">
                                ...
                              </span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page as number)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                                  ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                  : 'bg-white dark:bg-surface-secondary border-slate-300 dark:border-border-primary text-slate-500 dark:text-text-tertiary hover:bg-gray-50 dark:hover:bg-surface-hover'
                                  }`}
                              >
                                {page}
                              </button>
                            )
                          ));
                        })()}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-border-primary bg-white dark:bg-surface-secondary text-sm font-medium text-slate-500 dark:text-text-tertiary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">التالي</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'account' && (
          <div className="space-y-6">
            {isLoadingAccount ? (
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-8 text-center text-slate-600 dark:text-text-secondary border border-slate-200 dark:border-border-primary">جاري تحميل كشف الحساب...</div>
            ) : !account ? (
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-8 text-center text-slate-500 dark:text-text-tertiary border border-slate-200 dark:border-border-primary">لا تتوفر بيانات لهذا المورد.</div>
            ) : (
              <>
                <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-text-primary mb-4">معلومات المورد</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-text-secondary">الاسم</p>
                        <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{account.supplier.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-text-secondary">رقم الهاتف</p>
                        <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{account.supplier.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-text-secondary">تاريخ التسجيل</p>
                        <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{formatEnglishDate(account.supplier.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  {account.supplier.address && (
                    <div className="mt-4 flex items-start">
                      <Home className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-600 dark:text-text-secondary">العنوان</p>
                        <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{account.supplier.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* الأرصدة حسب العملة */}
                <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-xl shadow p-6 mb-6 border border-slate-200 dark:border-border-primary">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-text-primary mb-6 flex items-center">
                    <span className="text-3xl mr-3">💱</span>
                    أرصدة الحسابات حسب العملة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {account.totalsByCurrency && Object.entries(account.totalsByCurrency)
                      .filter(([_, totals]) => Math.abs(totals.balance) > 0.01 || totals.credit > 0 || totals.debit > 0)
                      .map(([currency, totals]) => {
                        const getCurrencyColor = (curr: string) => {
                          if (curr === 'LYD') return 'border-green-500 dark:border-green-400 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-green-100 dark:to-green-900/30';
                          if (curr === 'USD') return 'border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-blue-100 dark:to-blue-900/30';
                          if (curr === 'EUR') return 'border-purple-500 dark:border-purple-400 bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-purple-100 dark:to-purple-900/30';
                          return 'border-gray-500 dark:border-gray-400 bg-gradient-to-br from-gray-50 dark:from-gray-800/20 to-gray-100 dark:to-gray-800/30';
                        };

                        return (
                          <div key={currency} className={`rounded-xl p-5 shadow-md border-l-4 ${getCurrencyColor(currency)}`}>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-bold text-gray-700 dark:text-text-primary">حساب {currency}</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${currency === 'LYD' ? 'bg-green-200 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                currency === 'USD' ? 'bg-blue-200 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                  'bg-purple-200 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                                }`}>
                                {currency}
                              </span>
                            </div>

                            {/* الرصيد */}
                            <div className="mb-4 pb-3 border-b-2 border-slate-200 dark:border-border-primary">
                              <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">الرصيد الحالي</p>
                              <p className={`text-3xl font-extrabold ${totals.balance > 0 ? 'text-red-700 dark:text-red-400' : totals.balance < 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-text-primary'}`}>
                                {Math.abs(Number(totals.balance)).toFixed(2)} {currency}
                              </p>
                              <p className={`text-xs font-semibold mt-1 ${totals.balance > 0 ? 'text-red-600 dark:text-red-400' : totals.balance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-text-secondary'}`}>
                                {totals.balance > 0 ? '🔴 مستحق عليك' : totals.balance < 0 ? '🟢 مدين لك' : '⚪ متوازن'}
                              </p>
                            </div>

                            {/* الديون والمدفوعات */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white dark:bg-surface-secondary bg-opacity-60 rounded-md p-2">
                                <p className="text-[10px] text-slate-600 dark:text-text-secondary mb-0.5">إجمالي الديون</p>
                                <p className="text-base font-bold text-red-700 dark:text-red-400">{Number(totals.credit).toFixed(2)}</p>
                              </div>
                              <div className="bg-white dark:bg-surface-secondary bg-opacity-60 rounded-md p-2">
                                <p className="text-[10px] text-slate-600 dark:text-text-secondary mb-0.5">إجمالي المدفوع</p>
                                <p className="text-base font-bold text-green-700 dark:text-green-400">{Number(totals.debit).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {(!account.totalsByCurrency || Object.keys(account.totalsByCurrency).length === 0) && (
                    <div className="text-center text-slate-500 dark:text-text-tertiary py-8">
                      لا توجد حركات مالية لهذا المورد
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-surface-primary rounded-xl shadow overflow-hidden border border-slate-200 dark:border-border-primary">
                  <div className="p-6 border-b border-slate-200 dark:border-border-primary">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-text-primary flex items-center">
                      <FileText className="w-5 h-5 ml-2" />
                      كشف الحساب التفصيلي
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-text-tertiary mt-1">
                      ⚠️ يتم عرض كل حركة بعملتها الأصلية دون أي تحويل
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-surface-secondary">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">التاريخ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">البيان</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">النوع</th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">المبلغ والعملة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">العملية</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-border-primary">
                        {account.entries.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-text-tertiary">لا توجد معاملات</td>
                          </tr>
                        ) : (
                          account.entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-surface-hover">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-text-primary">
                                {formatEnglishDate(entry.transactionDate)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-text-primary">
                                {entry.description || `${entry.referenceType} #${entry.referenceId}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.transactionType === 'DEBIT' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                  }`}>
                                  {entry.transactionType === 'DEBIT' ? 'دفعة' : 'دين'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`text-base font-bold ${entry.transactionType === 'DEBIT' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                    }`}>
                                    {Number(entry.amount).toFixed(2)}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${entry.currency === 'LYD' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                      entry.currency === 'USD' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                                    }`}>
                                    {entry.currency || 'LYD'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-text-secondary">
                                {getOperationDescription(entry.transactionType)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {entry.referenceType === 'OPENING_BALANCE' && entry.transactionType === 'CREDIT' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSettleOpeningBalance(entry)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold shadow-sm active:scale-95"
                                      title="تسوية هذا الدين"
                                    >
                                      <TrendingDown className="w-3.5 h-3.5" />
                                      تسوية (دفع)
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOpeningBalance(entry.referenceId)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-xs font-bold shadow-sm active:scale-95"
                                      title="حذف هذا الرصيد المرحل"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      حذف
                                    </button>
                                  </div>
                                )}
                                {entry.referenceType === 'OPENING_BALANCE' && entry.transactionType === 'DEBIT' && (
                                  <button
                                    onClick={() => handleDeleteOpeningBalance(entry.referenceId)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-xs font-bold shadow-sm active:scale-95"
                                    title="حذف هذا الرصيد المرحل"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    حذف
                                  </button>
                                )}
                                {entry.referenceType === 'PAYMENT' && (
                                  <button
                                    onClick={() => handlePrintSupplierPayment(entry.referenceId)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-surface-secondary text-slate-800 dark:text-text-primary rounded-lg hover:bg-slate-300 transition-all text-xs font-bold shadow-sm active:scale-95"
                                    title="إعادة طباعة الإيصال"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    طباعة
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {viewMode === 'purchases' && (
          <div className="space-y-4">
            {isLoadingPurchases ? (
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-8 text-center text-slate-600 dark:text-text-secondary border border-slate-200 dark:border-border-primary">جاري تحميل المشتريات...</div>
            ) : openPurchases.length === 0 ? (
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-8 text-center text-slate-500 dark:text-text-tertiary border border-slate-200 dark:border-border-primary">لا توجد مشتريات مفتوحة لهذا المورد</div>
            ) : (
              <>
                {openPurchases.map((purchase) => (
                  <div key={purchase.id} className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 hover:shadow-lg transition-shadow border border-slate-200 dark:border-border-primary">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-text-secondary">رقم الفاتورة:</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-text-primary mr-2">{purchase.invoiceNumber || `#${purchase.id}`}</span>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">غير مسددة</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">الشركة</p>
                        <p className="text-sm font-semibold text-gray-900">{purchase.company.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">التاريخ</p>
                        <p className="text-sm font-semibold text-gray-900">{formatEnglishDate(purchase.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">إجمالي الفاتورة</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(purchase.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">المبلغ المدفوع</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(purchase.paidAmount)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">المبلغ المتبقي</p>
                        <p className="text-sm font-semibold text-red-600">{formatCurrency(purchase.remainingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">الحالة</p>
                        <p className="text-sm font-semibold text-gray-900">{purchase.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      {/* مودال الرصيد الافتتاحي */}
      {targetSupplier && (
        <OpeningBalanceModal
          isOpen={showOpeningBalanceModal}
          onClose={() => {
            setShowOpeningBalanceModal(false);
            setTargetSupplier(null);
          }}
          supplierId={targetSupplier.id}
          name={targetSupplier.name}
          type="supplier"
        />
      )}

      {/* مودال تسوية الرصيد المرحل */}
      {selectedEntry && selectedSupplier && (
        <SettleOpeningBalanceModal
          isOpen={showSettleModal}
          onClose={() => {
            setShowSettleModal(false);
            setSelectedEntry(null);
          }}
          entityId={selectedSupplier.id}
          entityName={selectedSupplier.name}
          type="supplier"
          initialAmount={Number(selectedEntry.amount)}
          initialCurrency={selectedEntry.currency || 'LYD'}
          initialDescription={`تسوية رصيد مرحل`}
        />
      )}
    </div>
  );
};

export default SupplierAccountsPage;
