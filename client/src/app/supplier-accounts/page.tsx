"use client";

import React, { useState } from "react";
import { 
  useGetAllSuppliersAccountSummaryQuery, 
  useGetSupplierAccountQuery,
  useGetSupplierOpenPurchasesQuery 
} from "@/state/supplierAccountApi";
import { User, Search, TrendingUp, TrendingDown, FileText, X, DollarSign, Calendar, Phone, Mail, Home } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { formatLibyanCurrencyEnglish, formatEnglishNumber, formatEnglishDate } from "@/utils/formatLibyanNumbers";

type ViewMode = 'summary' | 'account' | 'purchases';

const SupplierAccountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  
  const { data: summaryData, isLoading, error } = useGetAllSuppliersAccountSummaryQuery();
  const { data: accountData, isLoading: isLoadingAccount } = useGetSupplierAccountQuery(
    selectedSupplierId!, 
    { skip: !selectedSupplierId || viewMode !== 'account' }
  );
  const { data: purchasesData, isLoading: isLoadingPurchases } = useGetSupplierOpenPurchasesQuery(
    selectedSupplierId!, 
    { skip: !selectedSupplierId || viewMode !== 'purchases' }
  );

  const suppliers = summaryData?.data || [];
  const account = accountData?.data;
  const openPurchases = purchasesData?.data || [];

  // تصفية الموردين بناءً على البحث
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // إحصائيات
  const totalCreditors = suppliers.filter(s => s.currentBalance > 0).length; // موردين لهم مستحقات علينا
  const totalDebtors = suppliers.filter(s => s.currentBalance < 0).length; // موردين مدينين لنا
  const totalCredit = suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
  const totalDebt = suppliers.reduce((sum, s) => sum + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : 0), 0);

  const handleShowAccount = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setViewMode('account');
  };

  const handleShowPurchases = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setViewMode('purchases');
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    setSelectedSupplierId(null);
  };

  const formatCurrency = formatLibyanCurrencyEnglish;
  const formatNumber = formatEnglishNumber;

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600'; // مستحقات علينا
    if (balance < 0) return 'text-green-600'; // مدين لنا
    return 'text-gray-600'; // متوازن
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return 'مستحق عليك';
    if (balance < 0) return 'مدين لك';
    return 'متوازن';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">حدث خطأ في تحميل البيانات</div>
      </div>
    );
  }

  // عرض ملخص الحسابات
  if (viewMode === 'summary') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">حسابات الموردين</h1>
          <p className="text-gray-600 mt-1">إدارة ومتابعة حسابات الموردين والمستحقات</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-800">مستحقات علينا</p>
                <p className="text-2xl font-bold text-red-900">{formatNumber(totalCreditors)}</p>
                <p className="text-xs text-red-700">{formatCurrency(totalCredit)}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-800">مدينين لنا</p>
                <p className="text-2xl font-bold text-green-900">{formatNumber(totalDebtors)}</p>
                <p className="text-xs text-green-700">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">إجمالي الموردين</p>
                <p className="text-2xl font-bold text-blue-900">{formatNumber(suppliers.length)}</p>
                <p className="text-xs text-blue-700">مورد نشط</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-800">صافي الرصيد</p>
                <p className={`text-2xl font-bold ${getBalanceColor(totalCredit - totalDebt)}`}>
                  {formatCurrency(totalCredit - totalDebt)}
                </p>
                <p className="text-xs text-purple-700">
                  {totalCredit > totalDebt ? 'مستحق عليك' : totalDebt > totalCredit ? 'مدين لك' : 'متوازن'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white shadow overflow-hidden rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الهاتف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الرصيد الحالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {supplier.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getBalanceColor(supplier.currentBalance)}`}>
                      {formatCurrency(Math.abs(supplier.currentBalance))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      supplier.currentBalance > 0 
                        ? 'bg-red-100 text-red-800' 
                        : supplier.currentBalance < 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getBalanceText(supplier.currentBalance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleShowAccount(supplier.id)}
                      className="text-blue-600 hover:text-blue-900 ml-2"
                    >
                      عرض الحساب
                    </button>
                    <button
                      onClick={() => handleShowPurchases(supplier.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      المشتريات المفتوحة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // عرض تفاصيل الحساب
  if (viewMode === 'account' && account) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">حساب المورد: {account.supplier.name}</h1>
            <p className="text-gray-600 mt-1">تفاصيل الحساب والحركات المالية</p>
          </div>
          <button
            onClick={handleBackToSummary}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <X className="w-4 h-4 ml-2" />
            العودة للقائمة
          </button>
        </div>

        {/* Supplier Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center">
              <User className="w-5 h-5 text-gray-400 ml-2" />
              <div>
                <p className="text-sm text-gray-500">اسم المورد</p>
                <p className="font-medium">{account.supplier.name}</p>
              </div>
            </div>
            {account.supplier.phone && (
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 ml-2" />
                <div>
                  <p className="text-sm text-gray-500">رقم الهاتف</p>
                  <p className="font-medium">{account.supplier.phone}</p>
                </div>
              </div>
            )}
            {account.supplier.email && (
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 ml-2" />
                <div>
                  <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                  <p className="font-medium">{account.supplier.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 ml-2" />
              <div>
                <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
                <p className="font-medium">
                  {formatEnglishDate(account.supplier.createdAt)}
                </p>
              </div>
            </div>
          </div>
          {account.supplier.address && (
            <div className="mt-4 flex items-start">
              <Home className="w-5 h-5 text-gray-400 ml-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">العنوان</p>
                <p className="font-medium">{account.supplier.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  account.currentBalance > 0 ? 'bg-red-100' : account.currentBalance < 0 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <DollarSign className={`w-4 h-4 ${getBalanceColor(account.currentBalance)}`} />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">الرصيد الحالي</p>
                <p className={`text-2xl font-bold ${getBalanceColor(account.currentBalance)}`}>
                  {formatCurrency(Math.abs(account.currentBalance))}
                </p>
                <p className="text-xs text-gray-500">{getBalanceText(account.currentBalance)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">إجمالي المدين</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(account.totalDebit)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">إجمالي الدائن</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(account.totalCredit)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Entries */}
        <div className="bg-white shadow overflow-hidden rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">حركات الحساب</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">جميع المعاملات المالية للمورد</p>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الوصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الرصيد
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {account.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatEnglishDate(entry.transactionDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.description || `${entry.referenceType} #${entry.referenceId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.transactionType === 'DEBIT' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entry.transactionType === 'DEBIT' ? 'مدين' : 'دائن'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        entry.transactionType === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getBalanceColor(entry.balance)}`}>
                        {formatCurrency(Math.abs(entry.balance))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // عرض المشتريات المفتوحة
  if (viewMode === 'purchases' && selectedSupplierId) {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              المشتريات المفتوحة: {selectedSupplier?.name}
            </h1>
            <p className="text-gray-600 mt-1">المشتريات غير المسددة بالكامل</p>
          </div>
          <button
            onClick={handleBackToSummary}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <X className="w-4 h-4 ml-2" />
            العودة للقائمة
          </button>
        </div>

        {isLoadingPurchases ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الفاتورة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الشركة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي الفاتورة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ المدفوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ المتبقي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {openPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.invoiceNumber || `#${purchase.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(purchase.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(purchase.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {formatCurrency(purchase.remainingAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatEnglishDate(purchase.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : purchase.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {purchase.status === 'APPROVED' ? 'معتمدة' : 
                         purchase.status === 'DRAFT' ? 'مسودة' : 'ملغية'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openPurchases.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مشتريات مفتوحة</h3>
                <p className="mt-1 text-sm text-gray-500">جميع المشتريات مسددة بالكامل</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default SupplierAccountsPage;
