"use client";

import React, { useState, useRef } from "react";
import {
  useGetAllCustomersAccountSummaryQuery,
  useGetCustomerAccountQuery,
  useGetCustomerOpenInvoicesQuery
} from "@/state/customerAccountApi";
import { useDeleteCustomerMutation } from "@/state/salesApi";
import { User, Search, TrendingUp, TrendingDown, FileText, X, DollarSign, Calendar, Phone, Eye, Filter, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
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

  const { success, error: showError } = useToast();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

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

  const handleDeleteCustomer = async (id: number, name: string) => {
    if (confirm(`هل أنت متأكد من حذف العميل "${name}" نهائياً من النظام؟\n\nلا يمكن التراجع عن هذه العملية.`)) {
      try {
        await deleteCustomer(id).unwrap();
        success('تم حذف العميل بنجاح');
      } catch (err: any) {
        showError(err?.data?.message || 'حدث خطأ أثناء حذف العميل. تأكد من عدم وجود أي فواتير أو حركات مالية مسجلة باسمه.');
      }
    }
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
            <label>المتبقي عليه (الديون)</label>
            <div class="value">${Math.max(0, account.currentBalance).toFixed(2)} د.ل</div>
          </div>
          <div class="summary-card credit">
            <label>إجمالي المدفوعات</label>
            <div class="value">${account.totalPayments.toFixed(2)} د.ل</div>
          </div>
          <div class="summary-card balance">
            <label>صافي الرصيد</label>
            <div class="value" style="color: ${account.currentBalance > 0 ? '#dc2626' : account.currentBalance < 0 ? '#16a34a' : '#374151'}">
              ${account.currentBalance.toFixed(2)} د.ل
              <small style="font-size: 11px; font-weight: normal; display: block;">
                ${account.currentBalance > 0 ? '(مدين) - مطلوب منه' : account.currentBalance < 0 ? '(دائن) - له رصيد' : '(متوازن)'}
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

    const totalRemaining = openInvoices.reduce((sum, inv) => sum + Number(inv.remainingAmount || 0), 0);

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
                  <td>${invoice.company?.name || 'غير محدد'}</td>
                  <td>${formatEnglishDate(invoice.createdAt)}</td>
                  <td>${Number(invoice.total || 0).toFixed(2)} د.ل</td>
                  <td class="paid">${Number(invoice.paidAmount || 0).toFixed(2)} د.ل</td>
                  <td class="remaining">${Number(invoice.remainingAmount || 0).toFixed(2)} د.ل</td>
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
    <div className="min-h-screen bg-slate-50 dark:bg-surface-secondary p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-text-primary mb-2">
            {viewMode === 'summary' && 'إدارة حسابات العملاء'}
            {viewMode === 'account' && `كشف حساب: ${selectedCustomer?.name}`}
            {viewMode === 'invoices' && `الفواتير المفتوحة: ${selectedCustomer?.name}`}
          </h1>
          <p className="text-slate-600 dark:text-text-secondary">
            {viewMode === 'summary' && 'متابعة شاملة لحسابات العملاء والديون المستحقة'}
            {viewMode === 'account' && 'عرض تفصيلي لجميع المعاملات والحركات المالية'}
            {viewMode === 'invoices' && 'الفواتير غير المسددة بالكامل'}
          </p>
        </div>

        {/* إحصائيات - تظهر في جميع الأوضاع */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-4 border border-slate-200 dark:border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">إجمالي العملاء</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatStatsNumber(customers.length)}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-4 border border-slate-200 dark:border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">إجمالي المتبقي لنا (الديون)</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatStatsNumber(totalDebtors)}</p>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{formatStatsCurrency(totalDebt)}</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-4 border border-slate-200 dark:border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">إجمالي له (أرصدة العملاء)</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatStatsNumber(totalCreditors)}</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold">{formatStatsCurrency(totalCredit)}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-4 border border-slate-200 dark:border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">صافي ديون السوق</p>
                <p className={`text-2xl font-bold ${netBalance > 0 ? 'text-red-600 dark:text-red-400' : netBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-text-primary'}`}>
                  {formatStatsCurrency(netBalance)}
                </p>
                <p className="text-xs text-slate-500 dark:text-text-tertiary font-semibold">
                  {netBalance > 0 ? 'صافي مطلوب منا تحصيله' : netBalance < 0 ? 'صافي ذمم دائنة' : 'متوازن'}
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-surface-hover p-2 rounded-full">
                <DollarSign className="w-5 h-5 text-slate-600 dark:text-text-secondary" />
              </div>
            </div>
          </div>
        </div>

        {/* زر العودة - يظهر عند عرض تفاصيل عميل */}
        {viewMode !== 'summary' && (
          <button
            onClick={handleBackToSummary}
            className="mb-4 px-4 py-2 bg-gray-200 dark:bg-surface-secondary text-gray-700 dark:text-text-primary rounded-md hover:bg-gray-300 dark:hover:bg-surface-hover transition-colors"
          >
            ← العودة للقائمة
          </button>
        )}

        {/* عرض القائمة الرئيسية */}
        {viewMode === 'summary' && (
          <>
            {/* شريط البحث */}
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow mb-6 p-4 border border-slate-200 dark:border-border-primary">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-text-tertiary w-5 h-5" />
                <input
                  type="text"
                  placeholder="بحث عن عميل (الاسم أو الهاتف)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                />
              </div>
            </div>

            {/* جدول العملاء */}
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow overflow-hidden border border-slate-200 dark:border-border-primary">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-slate-50 dark:bg-surface-secondary border-b border-slate-200 dark:border-border-primary">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase w-12">
                        #
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase min-w-[200px]">
                        العميل
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase w-32">
                        إجمالي العليه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase w-36">
                        إجمالي المدفوعات
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase text-blue-600 dark:text-blue-400 w-32">
                        إجمالي المردودات
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase font-bold text-red-600 dark:text-red-400 w-32">
                        المتبقي عليه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase w-32">
                        صافي الرصيد
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase w-32">
                        الحالة
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase min-w-[200px]">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-border-primary">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-500 dark:text-text-tertiary">
                          لا توجد نتائج
                        </td>
                      </tr>
                    ) : (
                      paginatedCustomers.map((customer, index) => (
                        <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-text-tertiary">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${customer.currentBalance > 0 ? 'bg-red-100 dark:bg-red-900/30' :
                                customer.currentBalance < 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-surface-hover'
                                }`}>
                                <User className={`w-4 h-4 ${customer.currentBalance > 0 ? 'text-red-600 dark:text-red-400' :
                                  customer.currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-text-secondary'
                                  }`} />
                              </div>
                              <div className="mr-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-text-primary break-words">{customer.name}</div>
                                {customer.phone && <div className="text-xs text-slate-500 dark:text-text-tertiary">{customer.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-red-600 font-medium">
                              {customer.totalDebit.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-blue-600 font-medium">
                              {customer.totalPayments.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-blue-600">
                            <div className="text-sm font-medium">
                              {customer.totalReturns.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-bold ${customer.remainingDebt > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400 dark:text-text-tertiary'}`}>
                              {customer.remainingDebt.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-bold ${customer.currentBalance > 0 ? 'text-red-600 dark:text-red-400' :
                              customer.currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-text-primary'
                              }`}>
                              {customer.currentBalance.toFixed(2)} د.ل
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {customer.currentBalance > 0 ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                عليه ديون
                              </span>
                            ) : customer.currentBalance < 0 ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                له رصيد (دائن)
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 dark:bg-surface-hover text-gray-800 dark:text-text-primary">
                                متوازن
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2 space-x-reverse">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleShowAccount(customer.id)}
                                className="inline-flex items-center justify-center w-40 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <FileText className="w-4 h-4 ml-1" />
                                كشف الحساب
                              </button>
                              {customer.currentBalance > 0 && (
                                <button
                                  onClick={() => handleShowInvoices(customer.id)}
                                  className="inline-flex items-center justify-center w-40 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                                >
                                  <FileText className="w-4 h-4 ml-1" />
                                  الفواتير المفتوحة
                                </button>
                              )}
                              {customer.totalDebit === 0 && customer.totalCredit === 0 && (
                                <button
                                  onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                  disabled={isDeleting}
                                  className="inline-flex items-center justify-center w-10 px-3 py-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                                  title="حذف العميل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-border-primary text-sm font-medium rounded-md text-gray-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
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

        {/* عرض كشف الحساب التفصيلي */}
        {viewMode === 'account' && account && (
          <div className="space-y-6">
            {/* شريط الفلاتر والطباعة */}
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow-lg p-4 border border-slate-200 dark:border-border-primary">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* فلاتر التاريخ */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-surface-secondary px-3 py-2 rounded-xl">
                    <Filter className="w-4 h-4 text-slate-500 dark:text-text-tertiary" />
                    <span className="text-sm text-slate-600 dark:text-text-secondary font-medium">فلترة:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-text-secondary">من:</label>
                    <input
                      type="date"
                      value={accountStartDate}
                      onChange={(e) => setAccountStartDate(e.target.value)}
                      className="border border-slate-200 dark:border-border-primary rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-text-secondary">إلى:</label>
                    <input
                      type="date"
                      value={accountEndDate}
                      onChange={(e) => setAccountEndDate(e.target.value)}
                      className="border border-slate-200 dark:border-border-primary rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                    />
                  </div>
                  {(accountStartDate || accountEndDate) && (
                    <button
                      onClick={clearAccountFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 dark:text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-text-primary mb-4">معلومات العميل</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">الاسم</p>
                    <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{account.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">رقم الهاتف</p>
                    <p className="text-base font-semibold text-gray-800 dark:text-text-primary">{account.customer.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-text-tertiary ml-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary">تاريخ التسجيل</p>
                    <p className="text-base font-semibold text-gray-800 dark:text-text-primary">
                      {formatEnglishDate(account.customer.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملخص الحساب */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary mb-1">المتبقي عليه</p>
                    <p className={`text-2xl font-bold ${account.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-text-tertiary'}`}>
                      {Math.max(0, account.currentBalance).toFixed(2)} د.ل
                    </p>
                    <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">الديون المستحقة</p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary mb-1">إجمالي المدفوعات</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{account.totalPayments.toFixed(2)} د.ل</p>
                    <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">المبالغ المسددة</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary mb-1">إجمالي له</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{account.totalOtherCredits.toFixed(2)} د.ل</p>
                    <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">مردودات وتصحيحات</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 border border-slate-200 dark:border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-text-secondary mb-1">صافي الرصيد</p>
                    <p className={`text-2xl font-bold ${account.currentBalance > 0 ? 'text-red-600 dark:text-red-400' :
                      account.currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-text-secondary'
                      }`}>
                      {account.currentBalance.toFixed(2)} د.ل
                    </p>
                    <p className="text-xs text-slate-500 dark:text-text-tertiary mt-1">
                      {account.currentBalance > 0 ? '(مدين) - مطلوب منه' :
                        account.currentBalance < 0 ? '(دائن) - له رصيد' : 'متوازن'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${account.currentBalance > 0 ? 'bg-red-100 dark:bg-red-900/30' :
                    account.currentBalance < 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-surface-hover'
                    }`}>
                    <FileText className={`w-6 h-6 ${account.currentBalance > 0 ? 'text-red-600 dark:text-red-400' :
                      account.currentBalance < 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-text-secondary'
                      }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* جدول المعاملات */}
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow overflow-hidden border border-slate-200 dark:border-border-primary">
              <div className="p-6 border-b border-slate-200 dark:border-border-primary">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-text-primary">كشف الحساب التفصيلي</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-surface-secondary">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">التاريخ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">البيان</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">النوع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">المبلغ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary uppercase">الرصيد</th>
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
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-text-primary">{entry.description}</td>
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
                              entry.balance < 0 ? 'text-green-600' : 'text-slate-600 dark:text-text-secondary'
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
            <div className="bg-white dark:bg-surface-primary rounded-xl shadow-lg p-4 border border-slate-200 dark:border-border-primary">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* فلاتر التاريخ */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-xl">
                    <Filter className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span className="text-sm text-orange-700 dark:text-orange-400 font-medium">فلترة:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-text-secondary">من:</label>
                    <input
                      type="date"
                      value={invoicesStartDate}
                      onChange={(e) => setInvoicesStartDate(e.target.value)}
                      className="border border-slate-200 dark:border-border-primary rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 dark:text-text-secondary">إلى:</label>
                    <input
                      type="date"
                      value={invoicesEndDate}
                      onChange={(e) => setInvoicesEndDate(e.target.value)}
                      className="border border-slate-200 dark:border-border-primary rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 transition-all"
                    />
                  </div>
                  {(invoicesStartDate || invoicesEndDate) && (
                    <button
                      onClick={clearInvoicesFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 dark:text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
                <div className="text-slate-600 dark:text-text-secondary">جاري تحميل الفواتير...</div>
              </div>
            ) : openInvoices.length === 0 ? (
              <div className="bg-white dark:bg-surface-primary rounded-xl shadow p-8 text-center border border-slate-200 dark:border-border-primary">
                <FileText className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-3" />
                <p className="text-slate-600 dark:text-text-secondary">لا توجد فواتير مفتوحة لهذا العميل</p>
              </div>
            ) : (
              <>
                {openInvoices.map((invoice) => (
                  <div key={invoice.id} className="bg-white dark:bg-surface-primary rounded-xl shadow p-6 hover:shadow-lg transition-shadow border border-slate-200 dark:border-border-primary">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-text-secondary">رقم الفاتورة:</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-text-primary mr-2">
                          {invoice.invoiceNumber || `#${invoice.id}`}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                        غير مسددة
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">الشركة</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{invoice.company?.name || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">التاريخ</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">
                          {formatEnglishDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">إجمالي الفاتورة</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{Number(invoice.total || 0).toFixed(2)} د.ل</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary">المدفوع</p>
                        <p className="text-sm font-semibold text-green-600">{Number(invoice.paidAmount || 0).toFixed(2)} د.ل</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-border-primary">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-text-secondary mb-1">المبلغ المتبقي</p>
                        <p className="text-xl font-bold text-red-600">{Number(invoice.remainingAmount || 0).toFixed(2)} د.ل</p>
                      </div>
                      <button
                        onClick={() => window.location.href = `/accountant`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        قبض مبلغ
                      </button>
                    </div>

                    {invoice.payments && invoice.payments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-border-primary">
                        <p className="text-xs text-slate-600 dark:text-text-secondary mb-2 font-semibold">الدفعات السابقة:</p>
                        <div className="space-y-1">
                          {invoice.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-surface-secondary p-2 rounded">
                              <span className="text-slate-600 dark:text-text-secondary">
                                {formatEnglishDate(payment.paymentDate)}
                                {payment.receiptNumber && ` - ${payment.receiptNumber}`}
                              </span>
                              <span className="font-semibold text-green-600">{Number(payment.amount || 0).toFixed(2)} د.ل</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* ملخص الفواتير المفتوحة */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-400 mb-1">إجمالي الديون المستحقة على هذا العميل</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-400">
                        {openInvoices.reduce((sum, inv) => sum + Number(inv.remainingAmount || 0), 0).toFixed(2)} د.ل
                      </p>
                    </div>
                    <div className="bg-blue-200 dark:bg-blue-900/30 p-3 rounded-full">
                      <DollarSign className="w-8 h-8 text-blue-800 dark:text-blue-400" />
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
