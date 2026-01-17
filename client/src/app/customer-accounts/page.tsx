"use client";

import React, { useState, useRef } from "react";
import {
  useGetAllCustomersAccountSummaryQuery,
  useGetCustomerAccountQuery,
  useGetCustomerOpenInvoicesQuery
} from "@/state/customerAccountApi";
import { User, Search, TrendingUp, TrendingDown, FileText, X, DollarSign, Calendar, Phone, Eye, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { formatLibyanCurrency, formatArabicNumber, formatArabicDate, formatEnglishDate } from "@/utils/formatLibyanNumbers";
import { useAppSelector } from "@/app/redux";

type ViewMode = 'summary' | 'account' | 'invoices';

const CustomerAccountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // فلاتر كشف الحساب
  const [accountStartDate, setAccountStartDate] = useState("");
  const [accountEndDate, setAccountEndDate] = useState("");

  // فلاتر الفواتير المفتوحة
  const [invoicesStartDate, setInvoicesStartDate] = useState("");
  const [invoicesEndDate, setInvoicesEndDate] = useState("");

  // Reference للطباعة
  const printRef = useRef<HTMLDivElement>(null);

  // Current user for print header
  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: summaryData, isLoading, error } = useGetAllCustomersAccountSummaryQuery();
  const { data: accountData, isLoading: isLoadingAccount } = useGetCustomerAccountQuery(
    {
      customerId: selectedCustomerId!,
      startDate: accountStartDate || undefined,
      endDate: accountEndDate || undefined
    },
    { skip: !selectedCustomerId || viewMode !== 'account' }
  );
  const { data: invoicesData, isLoading: isLoadingInvoices } = useGetCustomerOpenInvoicesQuery(
    {
      customerId: selectedCustomerId!,
      startDate: invoicesStartDate || undefined,
      endDate: invoicesEndDate || undefined
    },
    { skip: !selectedCustomerId || viewMode !== 'invoices' }
  );

  const customers = summaryData?.data || [];
  const account = accountData?.data;
  const openInvoices = invoicesData?.data || [];

  // DEBUG: Log account data when it changes
  React.useEffect(() => {
    if (account) {
      console.log("Customer Account Data Received:", account);
      console.log("Total Other Credits:", account.totalOtherCredits);
      console.log("Total Returns:", (account as any).totalReturns); // Check if totalReturns is present
    }
  }, [account]);

  // تصفية العملاء بناءً على البحث
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // إحصائيات
  const totalDebtors = customers.filter(c => c.currentBalance > 0).length;
  const totalCreditors = customers.filter(c => c.currentBalance < 0).length;
  const totalDebt = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0), 0);

  const formatCurrency = formatLibyanCurrency;
  const formatNumber = formatArabicNumber;

  // منسقات خاصة بكروت الإحصائيات لعرض الأرقام بالإنجليزية
  const statsNumberFormatter = new Intl.NumberFormat('en-US');
  const statsCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatStatsNumber = (value: number) => statsNumberFormatter.format(value);
  const formatStatsCurrency = (value: number) => `${statsCurrencyFormatter.format(value)} د.ل`;
  const netBalance = totalDebt - totalCredit;

  const handleShowAccount = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setViewMode('account');
    // Reset filters
    setAccountStartDate("");
    setAccountEndDate("");
  };

  const handleShowInvoices = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setViewMode('invoices');
    // Reset filters
    setInvoicesStartDate("");
    setInvoicesEndDate("");
  };

  const handleBackToSummary = () => {
    setSelectedCustomerId(null);
    setViewMode('summary');
    // Reset all filters
    setAccountStartDate("");
    setAccountEndDate("");
    setInvoicesStartDate("");
    setInvoicesEndDate("");
  };

  // مسح فلاتر كشف الحساب
  const clearAccountFilters = () => {
    setAccountStartDate("");
    setAccountEndDate("");
  };

  // مسح فلاتر الفواتير
  const clearInvoicesFilters = () => {
    setInvoicesStartDate("");
    setInvoicesEndDate("");
  };

  // طباعة كشف الحساب
  const handlePrintAccount = () => {
    if (!account || !selectedCustomer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filterInfo = (accountStartDate || accountEndDate)
      ? `<p style="text-align: center; color: #666; margin-bottom: 20px;">
          الفترة: ${accountStartDate ? formatEnglishDate(accountStartDate) : 'البداية'} - ${accountEndDate ? formatEnglishDate(accountEndDate) : 'النهاية'}
        </p>`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${selectedCustomer.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px; 
            background: white;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #1e40af; 
            font-size: 24px; 
            margin-bottom: 10px;
          }
          .header h2 { 
            color: #374151; 
            font-size: 18px;
          }
          .customer-info {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
          }
          .customer-info div { flex: 1; min-width: 200px; }
          .customer-info label { 
            font-size: 12px; 
            color: #6b7280;
            display: block;
            margin-bottom: 4px;
          }
          .customer-info span { 
            font-weight: 600; 
            font-size: 14px;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            flex: 1;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-card.debit { background: #fee2e2; border: 1px solid #fecaca; }
          .summary-card.credit { background: #dcfce7; border: 1px solid #bbf7d0; }
          .summary-card.balance { background: #f3f4f6; border: 1px solid #e5e7eb; }
          .summary-card label { 
            font-size: 12px; 
            color: #6b7280;
            display: block;
            margin-bottom: 4px;
          }
          .summary-card .value { 
            font-size: 20px; 
            font-weight: 700;
          }
          .summary-card.debit .value { color: #dc2626; }
          .summary-card.credit .value { color: #16a34a; }
          .summary-card.balance .value { color: #374151; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 13px;
          }
          th { 
            background: #1e40af; 
            color: white; 
            padding: 12px 8px; 
            text-align: right;
            font-weight: 600;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #f3f4f6; }
          .debit { color: #dc2626; font-weight: 600; }
          .credit { color: #16a34a; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }
          .badge-debit { background: #fee2e2; color: #dc2626; }
          .badge-credit { background: #dcfce7; color: #16a34a; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>كشف حساب عميل</h1>
          <h2>${selectedCustomer.name}</h2>
        </div>
        ${filterInfo}
        <div class="customer-info">
          <div>
            <label>اسم العميل</label>
            <span>${account.customer.name}</span>
          </div>
          <div>
            <label>رقم الهاتف</label>
            <span>${account.customer.phone || '-'}</span>
          </div>
          <div>
            <label>تاريخ التسجيل</label>
            <span>${formatEnglishDate(account.customer.createdAt)}</span>
          </div>
          <div>
            <label>تاريخ الطباعة</label>
            <span>${formatEnglishDate(new Date().toISOString())}</span>
          </div>
        </div>
        
        <div class="summary">
          <div class="summary-card debit">
            <label>إجمالي عليه (مدين)</label>
            <div class="value">${account.totalDebit.toFixed(2)} د.ل</div>
          </div>
          <div class="summary-card credit">
            <label>إجمالي له (مدفوع)</label>
            <div class="value">${account.totalCredit.toFixed(2)} د.ل</div>
          </div>
          <div class="summary-card balance">
            <label>الرصيد الحالي</label>
            <div class="value" style="color: ${account.currentBalance > 0 ? '#dc2626' : account.currentBalance < 0 ? '#16a34a' : '#374151'}">
              ${account.currentBalance.toFixed(2)} د.ل
              <small style="font-size: 11px; font-weight: normal; display: block;">
                ${account.currentBalance > 0 ? '(عليه)' : account.currentBalance < 0 ? '(له)' : '(متوازن)'}
              </small>
            </div>
          </div>
        </div>
        
        ${account.entries.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${account.entries.map((entry, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${formatEnglishDate(entry.transactionDate)}</td>
                  <td>${entry.description || '-'}</td>
                  <td>
                    <span class="badge ${entry.transactionType === 'DEBIT' ? 'badge-debit' : 'badge-credit'}">
                      ${entry.transactionType === 'DEBIT' ? 'عليه' : 'له'}
                    </span>
                  </td>
                  <td class="${entry.transactionType === 'DEBIT' ? 'debit' : 'credit'}">
                    ${entry.transactionType === 'DEBIT' ? '+' : '-'} ${entry.amount.toFixed(2)} د.ل
                  </td>
                  <td class="${entry.balance > 0 ? 'debit' : entry.balance < 0 ? 'credit' : ''}">
                    ${entry.balance.toFixed(2)} د.ل
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="no-data">لا توجد معاملات</div>'}
        
        <div class="footer">
          <p>تمت الطباعة بواسطة: ${currentUser?.fullName || currentUser?.username || 'النظام'}</p>
          <p>التاريخ: ${new Date().toLocaleString('ar-LY')}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // طباعة الفواتير المفتوحة
  const handlePrintInvoices = () => {
    if (!openInvoices || !selectedCustomer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filterInfo = (invoicesStartDate || invoicesEndDate)
      ? `<p style="text-align: center; color: #666; margin-bottom: 20px;">
          الفترة: ${invoicesStartDate ? formatEnglishDate(invoicesStartDate) : 'البداية'} - ${invoicesEndDate ? formatEnglishDate(invoicesEndDate) : 'النهاية'}
        </p>`
      : '';

    const totalRemaining = openInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>الفواتير المفتوحة - ${selectedCustomer.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px; 
            background: white;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #ea580c;
            padding-bottom: 20px;
          }
          .header h1 { 
            color: #c2410c; 
            font-size: 24px; 
            margin-bottom: 10px;
          }
          .header h2 { 
            color: #374151; 
            font-size: 18px;
          }
          .summary-total {
            background: #fff7ed;
            border: 2px solid #fed7aa;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 25px;
          }
          .summary-total label {
            font-size: 14px;
            color: #9a3412;
            display: block;
            margin-bottom: 8px;
          }
          .summary-total .value {
            font-size: 28px;
            font-weight: 700;
            color: #c2410c;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 13px;
          }
          th { 
            background: #c2410c; 
            color: white; 
            padding: 12px 8px; 
            text-align: right;
            font-weight: 600;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) { background: #fff7ed; }
          .remaining { color: #dc2626; font-weight: 600; }
          .paid { color: #16a34a; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>الفواتير المفتوحة</h1>
          <h2>${selectedCustomer.name}</h2>
        </div>
        ${filterInfo}
        
        <div class="summary-total">
          <label>إجمالي المبالغ المستحقة</label>
          <div class="value">${totalRemaining.toFixed(2)} د.ل</div>
        </div>
        
        ${openInvoices.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الفاتورة</th>
                <th>الشركة</th>
                <th>التاريخ</th>
                <th>إجمالي الفاتورة</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${openInvoices.map((invoice, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${invoice.invoiceNumber || '#' + invoice.id}</td>
                  <td>${invoice.company.name}</td>
                  <td>${formatEnglishDate(invoice.createdAt)}</td>
                  <td>${invoice.total.toFixed(2)} د.ل</td>
                  <td class="paid">${invoice.paidAmount.toFixed(2)} د.ل</td>
                  <td class="remaining">${invoice.remainingAmount.toFixed(2)} د.ل</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="no-data">لا توجد فواتير مفتوحة</div>'}
        
        <div class="footer">
          <p>تمت الطباعة بواسطة: ${currentUser?.fullName || currentUser?.username || 'النظام'}</p>
          <p>التاريخ: ${new Date().toLocaleString('ar-LY')}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">حدث خطأ في تحميل البيانات</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {viewMode === 'summary' && 'إدارة حسابات العملاء'}
            {viewMode === 'account' && `كشف حساب: ${selectedCustomer?.name}`}
            {viewMode === 'invoices' && `الفواتير المفتوحة: ${selectedCustomer?.name}`}
          </h1>
          <p className="text-gray-600">
            {viewMode === 'summary' && 'متابعة شاملة لحسابات العملاء والديون المستحقة'}
            {viewMode === 'account' && 'عرض تفصيلي لجميع المعاملات والحركات المالية'}
            {viewMode === 'invoices' && 'الفواتير غير المسددة بالكامل'}
          </p>
        </div>

        {/* إحصائيات - تظهر في جميع الأوضاع */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">إجمالي العملاء</p>
                <p className="text-2xl font-bold text-blue-600">{formatStatsNumber(customers.length)}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">عملاء مدينون (عليهم)</p>
                <p className="text-2xl font-bold text-red-600">{formatStatsNumber(totalDebtors)}</p>
                <p className="text-xs text-red-600 font-semibold">{formatStatsCurrency(totalDebt)}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">عملاء دائنون (لهم)</p>
                <p className="text-2xl font-bold text-green-600">{formatStatsNumber(totalCreditors)}</p>
                <p className="text-xs text-green-600 font-semibold">{formatStatsCurrency(totalCredit)}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">صافي الديون</p>
                <p className={`text-2xl font-bold ${netBalance > 0 ? 'text-red-600' : netBalance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                  {formatStatsCurrency(netBalance)}
                </p>
                <p className="text-xs text-gray-500 font-semibold">
                  {netBalance > 0 ? 'صافي عليه (مدين)' : netBalance < 0 ? 'صافي له (دائن)' : 'متوازن'}
                </p>
              </div>
              <div className="bg-gray-100 p-2 rounded-full">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* زر العودة - يظهر عند عرض تفاصيل عميل */}
        {viewMode !== 'summary' && (
          <button
            onClick={handleBackToSummary}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            ← العودة للقائمة
          </button>
        )}

        {/* عرض القائمة الرئيسية */}
        {viewMode === 'summary' && (
          <>
            {/* شريط البحث */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="بحث عن عميل (الاسم أو الهاتف)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* جدول العملاء */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        العميل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        رقم الهاتف
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الرصيد الحالي
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          لا توجد نتائج
                        </td>
                      </tr>
                    ) : (
                      paginatedCustomers.map((customer, index) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${customer.currentBalance > 0 ? 'bg-red-100' :
                                customer.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                <User className={`w-5 h-5 ${customer.currentBalance > 0 ? 'text-red-600' :
                                  customer.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                                  }`} />
                              </div>
                              <div className="mr-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {customer.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{customer.phone || "-"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-semibold ${customer.currentBalance > 0 ? 'text-red-600' :
                              customer.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                              {customer.currentBalance.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {customer.currentBalance > 0 ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                عليه (مدين)
                              </span>
                            ) : customer.currentBalance < 0 ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                له (دائن)
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                متوازن
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                            <button
                              onClick={() => handleShowAccount(customer.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ml-2"
                            >
                              <FileText className="w-4 h-4 ml-1" />
                              كشف الحساب
                            </button>
                            {customer.currentBalance > 0 && (
                              <button
                                onClick={() => handleShowInvoices(customer.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                              >
                                <FileText className="w-4 h-4 ml-1" />
                                الفواتير المفتوحة
                              </button>
                            )}
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
                          {Math.min(currentPage * itemsPerPage, filteredCustomers.length)}
                        </span>
                        {' '}من{' '}
                        <span className="font-medium">{filteredCustomers.length}</span>
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
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
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

        {/* عرض كشف الحساب التفصيلي */}
        {viewMode === 'account' && account && (
          <div className="space-y-6">
            {/* شريط الفلاتر والطباعة */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* فلاتر التاريخ */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">فلترة:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">من:</label>
                    <input
                      type="date"
                      value={accountStartDate}
                      onChange={(e) => setAccountStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">إلى:</label>
                    <input
                      type="date"
                      value={accountEndDate}
                      onChange={(e) => setAccountEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {(accountStartDate || accountEndDate) && (
                    <button
                      onClick={clearAccountFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      مسح
                    </button>
                  )}
                </div>

                {/* أزرار الطباعة */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintAccount}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    طباعة التقرير
                  </button>
                </div>
              </div>
            </div>

            {/* معلومات العميل */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">معلومات العميل</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 ml-2" />
                  <div>
                    <p className="text-sm text-gray-600">الاسم</p>
                    <p className="text-base font-semibold text-gray-800">{account.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-gray-500 ml-2" />
                  <div>
                    <p className="text-sm text-gray-600">رقم الهاتف</p>
                    <p className="text-base font-semibold text-gray-800">{account.customer.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 ml-2" />
                  <div>
                    <p className="text-sm text-gray-600">تاريخ التسجيل</p>
                    <p className="text-base font-semibold text-gray-800">
                      {formatEnglishDate(account.customer.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملخص الحساب */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي عليه</p>
                    <p className="text-2xl font-bold text-red-600">{account.totalDebit.toFixed(2)} د.ل</p>
                    <p className="text-xs text-gray-500 mt-1">ديون العميل</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">المدفوع</p>
                    <p className="text-2xl font-bold text-blue-600">{account.totalPayments.toFixed(2)} د.ل</p>
                    <p className="text-xs text-gray-500 mt-1">الدفعات المستلمة</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي له</p>
                    <p className="text-2xl font-bold text-green-600">{account.totalOtherCredits.toFixed(2)} د.ل</p>
                    <p className="text-xs text-gray-500 mt-1">مردودات وأرصدة</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الرصيد الحالي</p>
                    <p className={`text-2xl font-bold ${account.currentBalance > 0 ? 'text-red-600' :
                      account.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                      {account.currentBalance.toFixed(2)} د.ل
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {account.currentBalance > 0 ? 'عليه (مدين)' :
                        account.currentBalance < 0 ? 'له (دائن)' : 'متوازن'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${account.currentBalance > 0 ? 'bg-red-100' :
                    account.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    <FileText className={`w-6 h-6 ${account.currentBalance > 0 ? 'text-red-600' :
                      account.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* جدول المعاملات */}
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatEnglishDate(entry.transactionDate)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {entry.transactionType === 'DEBIT' ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                عليه
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                له
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${entry.transactionType === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                              }`}>
                              {entry.transactionType === 'DEBIT' ? '+' : '-'} {entry.amount.toFixed(2)} د.ل
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${entry.balance > 0 ? 'text-red-600' :
                              entry.balance < 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                              {entry.balance.toFixed(2)} د.ل
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* عرض الفواتير المفتوحة */}
        {viewMode === 'invoices' && (
          <div className="space-y-4">
            {/* شريط الفلاتر والطباعة */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* فلاتر التاريخ */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
                    <Filter className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-orange-700 font-medium">فلترة:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">من:</label>
                    <input
                      type="date"
                      value={invoicesStartDate}
                      onChange={(e) => setInvoicesStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">إلى:</label>
                    <input
                      type="date"
                      value={invoicesEndDate}
                      onChange={(e) => setInvoicesEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  {(invoicesStartDate || invoicesEndDate) && (
                    <button
                      onClick={clearInvoicesFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      مسح
                    </button>
                  )}
                </div>

                {/* أزرار الطباعة */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintInvoices}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    طباعة التقرير
                  </button>
                </div>
              </div>
            </div>

            {isLoadingInvoices ? (
              <div className="text-center py-8">
                <div className="text-gray-600">جاري تحميل الفواتير...</div>
              </div>
            ) : openInvoices.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">لا توجد فواتير مفتوحة لهذا العميل</p>
              </div>
            ) : (
              <>
                {openInvoices.map((invoice) => (
                  <div key={invoice.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">رقم الفاتورة:</span>
                        <span className="text-lg font-bold text-gray-900 mr-2">
                          {invoice.invoiceNumber || `#${invoice.id}`}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                        غير مسددة
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600">الشركة</p>
                        <p className="text-sm font-semibold text-gray-900">{invoice.company.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">التاريخ</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatEnglishDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">إجمالي الفاتورة</p>
                        <p className="text-sm font-semibold text-gray-900">{invoice.total.toFixed(2)} د.ل</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">المدفوع</p>
                        <p className="text-sm font-semibold text-green-600">{invoice.paidAmount.toFixed(2)} د.ل</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">المبلغ المتبقي</p>
                        <p className="text-xl font-bold text-red-600">{invoice.remainingAmount.toFixed(2)} د.ل</p>
                      </div>
                      <button
                        onClick={() => window.location.href = `/accountant`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        قبض مبلغ
                      </button>
                    </div>

                    {invoice.payments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2 font-semibold">الدفعات السابقة:</p>
                        <div className="space-y-1">
                          {invoice.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                              <span className="text-gray-600">
                                {formatEnglishDate(payment.paymentDate)}
                                {payment.receiptNumber && ` - ${payment.receiptNumber}`}
                              </span>
                              <span className="font-semibold text-green-600">{payment.amount.toFixed(2)} د.ل</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* ملخص الفواتير المفتوحة */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 mb-1">إجمالي الديون المستحقة على هذا العميل</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {openInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0).toFixed(2)} د.ل
                      </p>
                    </div>
                    <div className="bg-blue-200 p-3 rounded-full">
                      <DollarSign className="w-8 h-8 text-blue-800" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerAccountsPage;
