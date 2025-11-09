"use client";

import React, { useState } from "react";
import { 
  useGetAllCustomersAccountSummaryQuery, 
  useGetCustomerAccountQuery,
  useGetCustomerOpenInvoicesQuery 
} from "@/state/customerAccountApi";
import { User, Search, TrendingUp, TrendingDown, FileText, X, DollarSign, Calendar, Phone } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type ViewMode = 'summary' | 'account' | 'invoices';

const CustomerAccountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  
  const { data: summaryData, isLoading, error } = useGetAllCustomersAccountSummaryQuery();
  const { data: accountData, isLoading: isLoadingAccount } = useGetCustomerAccountQuery(
    selectedCustomerId!, 
    { skip: !selectedCustomerId || viewMode !== 'account' }
  );
  const { data: invoicesData, isLoading: isLoadingInvoices } = useGetCustomerOpenInvoicesQuery(
    selectedCustomerId!, 
    { skip: !selectedCustomerId || viewMode !== 'invoices' }
  );

  const customers = summaryData?.data || [];
  const account = accountData?.data;
  const openInvoices = invoicesData?.data || [];

  // تصفية العملاء بناءً على البحث
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // إحصائيات
  const totalDebtors = customers.filter(c => c.currentBalance > 0).length;
  const totalCreditors = customers.filter(c => c.currentBalance < 0).length;
  const totalDebt = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (c.currentBalance < 0 ? Math.abs(c.currentBalance) : 0), 0);

  const handleShowAccount = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setViewMode('account');
  };

  const handleShowInvoices = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setViewMode('invoices');
  };

  const handleBackToSummary = () => {
    setSelectedCustomerId(null);
    setViewMode('summary');
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
                <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
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
                <p className="text-2xl font-bold text-red-600">{totalDebtors}</p>
                <p className="text-xs text-red-600 font-semibold">{totalDebt.toFixed(2)} د.ل</p>
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
                <p className="text-2xl font-bold text-green-600">{totalCreditors}</p>
                <p className="text-xs text-green-600 font-semibold">{totalCredit.toFixed(2)} د.ل</p>
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
                <p className={`text-2xl font-bold ${totalDebt - totalCredit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(totalDebt - totalCredit).toFixed(2)} د.ل
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          لا توجد نتائج
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                                customer.currentBalance > 0 ? 'bg-red-100' :
                                customer.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <User className={`w-5 h-5 ${
                                  customer.currentBalance > 0 ? 'text-red-600' :
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
                            <div className={`text-sm font-semibold ${
                              customer.currentBalance > 0 ? 'text-red-600' :
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
            </div>
          </>
        )}

        {/* عرض كشف الحساب التفصيلي */}
        {viewMode === 'account' && account && (
          <div className="space-y-6">
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
                      {format(new Date(account.customer.createdAt), "dd/MM/yyyy", { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملخص الحساب */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي عليه</p>
                    <p className="text-2xl font-bold text-red-600">{account.totalDebit.toFixed(2)} د.ل</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي له (مدفوع)</p>
                    <p className="text-2xl font-bold text-green-600">{account.totalCredit.toFixed(2)} د.ل</p>
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
                    <p className={`text-2xl font-bold ${
                      account.currentBalance > 0 ? 'text-red-600' :
                      account.currentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {account.currentBalance.toFixed(2)} د.ل
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {account.currentBalance > 0 ? 'عليه (مدين)' :
                       account.currentBalance < 0 ? 'له (دائن)' : 'متوازن'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    account.currentBalance > 0 ? 'bg-red-100' :
                    account.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      account.currentBalance > 0 ? 'text-red-600' :
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
                            {format(new Date(entry.transactionDate), "dd/MM/yyyy HH:mm", { locale: ar })}
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
                            <span className={`text-sm font-semibold ${
                              entry.transactionType === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {entry.transactionType === 'DEBIT' ? '+' : '-'} {entry.amount.toFixed(2)} د.ل
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${
                              entry.balance > 0 ? 'text-red-600' :
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
                          {format(new Date(invoice.createdAt), "dd/MM/yyyy", { locale: ar })}
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
                                {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ar })}
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
