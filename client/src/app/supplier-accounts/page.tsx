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

  const totalCreditors = suppliers.filter((s) => s.currentBalance > 0).length;
  const totalDebtors = suppliers.filter((s) => s.currentBalance < 0).length;
  const totalCredit = suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
  const totalDebt = suppliers.reduce((sum, s) => sum + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : 0), 0);
  const netBalance = totalCredit - totalDebt;

  const statsNumberFormatter = new Intl.NumberFormat('en-US');
  const statsCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatStatsNumber = (value: number) => statsNumberFormatter.format(value);
  const formatStatsCurrency = (value: number) => `${statsCurrencyFormatter.format(value)} د.ل`;

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
          balance: account.currentBalance,
        }]
    ).map((entry) => `
        <tr>
          <td>${entry.transactionDate ? formatEnglishDate(entry.transactionDate) : ''}</td>
          <td>${entry.description || `${entry.referenceType} #${entry.referenceId}`}</td>
          <td>${entry.transactionType === 'DEBIT' ? 'مدين' : 'دائن'}</td>
          <td>${getOperationDescription(entry.transactionType)}</td>
          <td>${formatCurrency(entry.amount)}</td>
          <td>${formatCurrency(Math.abs(entry.balance))}</td>
        </tr>
      `).join('');

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;

    const supplierInfo = `
      <div class="supplier-info">
        <p>الاسم: <strong>${account.supplier.name}</strong></p>
        <p>الهاتف: <strong>${account.supplier.phone || '-'}</strong></p>
        <p>الرصيد: <strong>${formatCurrency(Math.abs(account.currentBalance))}</strong></p>
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
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 14px; }
            th { background: #f3f4f6; }
            .supplier-info { margin-top: 16px; display: flex; gap: 24px; }
            .supplier-info p { margin: 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>كشف حساب المورد</h2>
          ${supplierInfo}
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>النوع</th>
                <th>الدفعة (المبلغ)</th>
                <th>العملية</th>
                <th>الرصيد</th>
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
          <p className="text-gray-600">
            {viewMode === 'summary' && 'متابعة حسابات الموردين والمستحقات بشكل شامل'}
            {viewMode === 'account' && 'عرض تفصيلي لجميع المعاملات والحركات المالية مع المورد'}
            {viewMode === 'purchases' && 'مراجعة فواتير المشتريات غير المسددة بالكامل'}
          </p>
        </div>

        {viewMode === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">إجمالي الموردين</p>
                  <p className="text-2xl font-bold text-blue-600">{formatStatsNumber(suppliers.length)}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">مستحقات علينا</p>
                  <p className="text-2xl font-bold text-red-600">{formatStatsNumber(totalCreditors)}</p>
                  <p className="text-xs text-red-600 font-semibold">{formatStatsCurrency(totalCredit)}</p>
                </div>
                <div className="bg-red-100 p-2 rounded-full">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">مدينين لنا</p>
                  <p className="text-2xl font-bold text-green-600">{formatStatsNumber(totalDebtors)}</p>
                  <p className="text-xs text-green-600 font-semibold">{formatStatsCurrency(totalDebt)}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-full">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">صافي الرصيد</p>
                  <p className={`text-2xl font-bold ${netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {formatStatsCurrency(netBalance)}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold">
                    {netBalance > 0 ? 'صافي مستحق عليك' : netBalance < 0 ? 'صافي مدين لك' : 'متوازن'}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${
                  netBalance > 0 ? 'bg-red-100' : netBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <DollarSign className={`w-5 h-5 ${netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : 'text-gray-600'}`} />
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المورد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا توجد نتائج</td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
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
                            <div className={`text-sm font-semibold ${getBalanceColor(supplier.currentBalance)}`}>
                              {formatCurrency(Math.abs(supplier.currentBalance))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              supplier.currentBalance > 0 ? 'bg-red-100 text-red-800' : supplier.currentBalance < 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getBalanceText(supplier.currentBalance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleShowAccount(supplier.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-2"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">إجمالي المدفوع له</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(account.totalCredit)}</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <TrendingDown className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">الرصيد</p>
                        <p className={`text-2l font-bold ${getBalanceColor(account.currentBalance)}`}>
                          {formatCurrency(Math.abs(account.currentBalance))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{getBalanceText(account.currentBalance)}</p>
                      </div>
                      <div className={`p-3 rounded-full ${
                        account.currentBalance > 0 ? 'bg-red-100' : account.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <DollarSign className={`w-6 h-6 ${getBalanceColor(account.currentBalance)}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">كشف الحساب التفصيلي</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البيان</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدفعة (المبلغ)</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرصيد</th>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatEnglishDate(entry.transactionDate)}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{entry.description || `${entry.referenceType} #${entry.referenceId}`}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  entry.transactionType === 'DEBIT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {entry.transactionType === 'DEBIT' ? 'مدين' : 'دائن'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-semibold ${
                                  entry.transactionType === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {formatCurrency(entry.amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {getOperationDescription(entry.transactionType)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-semibold ${
                                  entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {formatCurrency(Math.abs(entry.balance))}
                                </span>
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
