"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useGetAllSuppliersAccountSummaryQuery,
  useGetSupplierAccountQuery,
  useGetSupplierOpenPurchasesQuery
} from "@/state/supplierAccountApi";
import {
  User,
  Search,
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Calendar,
  Phone,
  Home
} from "lucide-react";
import {
  formatLibyanCurrencyEnglish,
  formatEnglishDate
} from "@/utils/formatLibyanNumbers";

type ViewMode = 'summary' | 'account' | 'purchases';

const SupplierAccountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const accountPrintRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    if (balance > 0) return 'text-red-600';
    if (balance < 0) return 'text-green-600';
    return 'text-gray-600';
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
          <td><strong>${entry.amount.toFixed(2)} ${entry.currency || 'LYD'}</strong></td>
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
              <p style="margin: 4px 0;"><strong>الرصيد:</strong> ${Math.abs(totals.balance).toFixed(2)} ${currency} 
                <span style="color: ${totals.balance > 0 ? '#dc2626' : totals.balance < 0 ? '#16a34a' : '#6b7280'};">
                  (${totals.balance > 0 ? 'مستحق عليك' : totals.balance < 0 ? 'مدين لك' : 'متوازن'})
                </span>
              </p>
              <p style="margin: 4px 0;"><strong>الديون:</strong> ${totals.credit.toFixed(2)} ${currency}</p>
              <p style="margin: 4px 0;"><strong>المدفوع:</strong> ${totals.debit.toFixed(2)} ${currency}</p>
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
        <div className="text-lg text-red-500">حدث خطأ في تحميل البيانات</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {viewMode === 'summary' && 'إدارة حسابات الموردين'}
            {viewMode === 'account' && `كشف حساب: ${selectedSupplier?.name || ''}`}
            {viewMode === 'purchases' && `المشتريات المفتوحة: ${selectedSupplier?.name || ''}`}
          </h1>
          <p className="text-gray-600 mb-3">
            {viewMode === 'summary' && 'متابعة حسابات الموردين والمستحقات بشكل شامل'}
            {viewMode === 'account' && 'عرض تفصيلي لجميع المعاملات والحركات المالية مع المورد'}
            {viewMode === 'purchases' && 'مراجعة فواتير المشتريات غير المسددة بالكامل'}
          </p>
          {viewMode === 'summary' && (
            <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <h3 className="text-sm font-semibold text-blue-900">💱 نظام الحسابات متعدد العملات</h3>
                  <p className="text-xs text-blue-800 mt-1">
                    كل مورد له حسابات منفصلة لكل عملة (LYD, USD, EUR). يتم تسجيل كل فاتورة بعملتها الأصلية دون أي تحويل. سعر الصرف يُستخدم فقط عند السداد الفعلي.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">إجمالي الموردين</p>
                  <p className="text-3xl font-bold text-blue-600">{formatStatsNumber(suppliers.length)}</p>
                  <p className="text-xs text-gray-500 mt-1">مورد نشط</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">موردين لديهم ديون</p>
                  <p className="text-3xl font-bold text-red-600">{formatStatsNumber(totalCreditors)}</p>
                  <p className="text-xs text-red-500 mt-1">مستحقات علينا</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">موردين مدينين</p>
                  <p className="text-3xl font-bold text-green-600">{formatStatsNumber(totalDebtors)}</p>
                  <p className="text-xs text-green-500 mt-1">لهم ديون لنا</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode !== 'summary' && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={handleBackToSummary}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
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
            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="بحث عن مورد (الاسم أو الهاتف)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا توجد نتائج</td>
                      </tr>
                    ) : (
                      paginatedSuppliers.map((supplier, index) => (
                        <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                                supplier.currentBalance > 0 ? 'bg-red-100' : supplier.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <User className={`w-5 h-5 ${
                                  supplier.currentBalance > 0 ? 'text-red-600' : supplier.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                                }`} />
                              </div>
                              <div className="mr-4">
                                <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.phone || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              supplier.currentBalance > 0 ? 'bg-red-100 text-red-800' : supplier.currentBalance < 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
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
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page as number)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">جاري تحميل كشف الحساب...</div>
            ) : !account ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">لا تتوفر بيانات لهذا المورد.</div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات المورد</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-600">الاسم</p>
                        <p className="text-base font-semibold text-gray-800">{account.supplier.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-600">رقم الهاتف</p>
                        <p className="text-base font-semibold text-gray-800">{account.supplier.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-500 ml-2" />
                      <div>
                        <p className="text-sm text-gray-600">تاريخ التسجيل</p>
                        <p className="text-base font-semibold text-gray-800">{formatEnglishDate(account.supplier.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  {account.supplier.address && (
                    <div className="mt-4 flex items-start">
                      <Home className="w-5 h-5 text-gray-500 ml-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">العنوان</p>
                        <p className="text-base font-semibold text-gray-800">{account.supplier.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* الأرصدة حسب العملة */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="text-3xl mr-3">💱</span>
                    أرصدة الحسابات حسب العملة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {account.totalsByCurrency && Object.entries(account.totalsByCurrency)
                      .filter(([_, totals]) => Math.abs(totals.balance) > 0.01 || totals.credit > 0 || totals.debit > 0)
                      .map(([currency, totals]) => {
                        const getCurrencyColor = (curr: string) => {
                          if (curr === 'LYD') return 'border-green-500 bg-gradient-to-br from-green-50 to-green-100';
                          if (curr === 'USD') return 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100';
                          if (curr === 'EUR') return 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100';
                          return 'border-gray-500 bg-gradient-to-br from-gray-50 to-gray-100';
                        };

                        return (
                          <div key={currency} className={`rounded-lg p-5 shadow-md border-l-4 ${getCurrencyColor(currency)}`}>
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-bold text-gray-700">حساب {currency}</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                currency === 'LYD' ? 'bg-green-200 text-green-800' :
                                currency === 'USD' ? 'bg-blue-200 text-blue-800' :
                                'bg-purple-200 text-purple-800'
                              }`}>
                                {currency}
                              </span>
                            </div>
                            
                            {/* الرصيد */}
                            <div className="mb-4 pb-3 border-b-2 border-gray-200">
                              <p className="text-xs text-gray-600 mb-1">الرصيد الحالي</p>
                              <p className={`text-3xl font-extrabold ${totals.balance > 0 ? 'text-red-700' : totals.balance < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                                {Math.abs(totals.balance).toFixed(2)} {currency}
                              </p>
                              <p className={`text-xs font-semibold mt-1 ${totals.balance > 0 ? 'text-red-600' : totals.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                {totals.balance > 0 ? '🔴 مستحق عليك' : totals.balance < 0 ? '🟢 مدين لك' : '⚪ متوازن'}
                              </p>
                            </div>
                            
                            {/* الديون والمدفوعات */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white bg-opacity-60 rounded-md p-2">
                                <p className="text-[10px] text-gray-600 mb-0.5">إجمالي الديون</p>
                                <p className="text-base font-bold text-red-700">{totals.credit.toFixed(2)}</p>
                              </div>
                              <div className="bg-white bg-opacity-60 rounded-md p-2">
                                <p className="text-[10px] text-gray-600 mb-0.5">إجمالي المدفوع</p>
                                <p className="text-base font-bold text-green-700">{totals.debit.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {(!account.totalsByCurrency || Object.keys(account.totalsByCurrency).length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      لا توجد حركات مالية لهذا المورد
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <FileText className="w-5 h-5 ml-2" />
                      كشف الحساب التفصيلي
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      ⚠️ يتم عرض كل حركة بعملتها الأصلية دون أي تحويل
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البيان</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ والعملة</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {account.entries.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا توجد معاملات</td>
                          </tr>
                        ) : (
                          account.entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatEnglishDate(entry.transactionDate)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {entry.description || `${entry.referenceType} #${entry.referenceId}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  entry.transactionType === 'DEBIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {entry.transactionType === 'DEBIT' ? 'دفعة' : 'دين'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`text-base font-bold ${
                                    entry.transactionType === 'DEBIT' ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {entry.amount.toFixed(2)}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                    entry.currency === 'LYD' ? 'bg-green-100 text-green-800' :
                                    entry.currency === 'USD' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {entry.currency || 'LYD'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {getOperationDescription(entry.transactionType)}
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
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">جاري تحميل المشتريات...</div>
            ) : openPurchases.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">لا توجد مشتريات مفتوحة لهذا المورد</div>
            ) : (
              <>
                {openPurchases.map((purchase) => (
                  <div key={purchase.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">رقم الفاتورة:</span>
                        <span className="text-lg font-bold text-gray-900 mr-2">{purchase.invoiceNumber || `#${purchase.id}`}</span>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">غير مسددة</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600">الشركة</p>
                        <p className="text-sm font-semibold text-gray-900">{purchase.company.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">التاريخ</p>
                        <p className="text-sm font-semibold text-gray-900">{formatEnglishDate(purchase.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">إجمالي الفاتورة</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(purchase.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">المبلغ المدفوع</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(purchase.paidAmount)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">المبلغ المتبقي</p>
                        <p className="text-sm font-semibold text-red-600">{formatCurrency(purchase.remainingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">الحالة</p>
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
    </div>
  );
};

export default SupplierAccountsPage;
