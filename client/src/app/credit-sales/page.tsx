"use client";

import React, { useState, useRef } from 'react';
import { 
  useGetCreditSalesQuery,
  useGetCreditSalesStatsQuery,
  useCreatePaymentMutation,
  useDeletePaymentMutation,
  CreditSale,
  SalePayment
} from '@/state/salePaymentApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { CreditPaymentReceiptPrint } from '@/components/sales/CreditPaymentReceiptPrint';
import { PaymentsHistoryPrint } from '@/components/sales/PaymentsHistoryPrint';

const CreditSalesPage = () => {
  const { success, error, confirm } = useToast();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFullyPaid, setFilterFullyPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SalePayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintReceiptModal, setShowPrintReceiptModal] = useState(false);
  const [showPrintHistoryModal, setShowPrintHistoryModal] = useState(false);
  
  // Print handlers
  const handlePrintPaymentReceipt = (payment: SalePayment, sale: CreditSale) => {
    setSelectedPayment(payment);
    setSelectedSale(sale);
    setShowPrintReceiptModal(true);
  };
  
  const handlePrintPaymentsHistory = (sale: CreditSale) => {
    setSelectedSale(sale);
    setShowPrintHistoryModal(true);
  };
  
  const printReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      error('خطأ', 'يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }
    
    const printContent = document.getElementById('receipt-print-content');
    if (!printContent) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال قبض</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; direction: rtl; }
          @media print {
            body { margin: 0; padding: 0; }
            .print-receipt { page-break-after: always; }
          }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const printHistory = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      error('خطأ', 'يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }
    
    const printContent = document.getElementById('history-print-content');
    if (!printContent) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سجل الدفعات</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; direction: rtl; }
          @media print {
            body { margin: 0; padding: 0; }
          }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // API calls
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  const { data: salesData, isLoading: salesLoading, refetch } = useGetCreditSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    isFullyPaid: filterFullyPaid === 'all' ? undefined : filterFullyPaid === 'paid'
  });

  const { data: statsData } = useGetCreditSalesStatsQuery();
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();
  const [deletePayment] = useDeletePaymentMutation();

  // Filter sales by selected company
  const filteredSales = salesData?.data?.sales?.filter((sale: CreditSale) => {
    if (!selectedCompanyId) return true;
    return sale.companyId === selectedCompanyId;
  }) || [];

  // Handle create payment
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const paymentMethod = formData.get('paymentMethod') as "CASH" | "BANK" | "CARD";
    const notes = formData.get('notes') as string;

    if (amount <= 0) {
      error('خطأ', 'المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount > selectedSale.remainingAmount) {
      error('خطأ', `المبلغ يتجاوز المبلغ المتبقي (${formatArabicCurrency(selectedSale.remainingAmount)})`);
      return;
    }

    try {
      const result = await createPayment({
        saleId: selectedSale.id,
        amount,
        paymentMethod,
        notes: notes || undefined
      }).unwrap();
      
      success('تم بنجاح', 'تم إنشاء إيصال القبض بنجاح');
      
      // تحديث البيانات
      await refetch();
      
      // إعداد بيانات الطباعة
      const newPayment = result.data.payment;
      const updatedSale = result.data.sale;
      
      setShowPaymentModal(false);
      
      // طباعة تلقائية
      setTimeout(() => {
        handlePrintPaymentReceipt(newPayment, updatedSale);
      }, 300);
    } catch (err: any) {
      error('خطأ', err.data?.message || 'حدث خطأ أثناء إنشاء الدفعة');
    }
  };

  // Handle delete payment
  const handleDeletePayment = async (payment: SalePayment) => {
    const confirmed = await confirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف إيصال القبض رقم ${payment.receiptNumber}؟`
    );

    if (confirmed) {
      try {
        await deletePayment(payment.id).unwrap();
        success('تم بنجاح', 'تم حذف الدفعة بنجاح');
        refetch();
      } catch (err: any) {
        error('خطأ', err.data?.message || 'حدث خطأ أثناء حذف الدفعة');
      }
    }
  };

  if (salesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = statsData?.data || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">المبيعات الآجلة</h1>
              <p className="text-gray-600">إدارة المبيعات الآجلة والدفعات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي المبيعات الآجلة</p>
              <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(stats.totalCreditSales || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ الإجمالي</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(stats.totalAmount || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ المدفوع</p>
              <p className="text-2xl font-bold text-green-600">{formatArabicCurrency(stats.totalPaid || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-orange-600">{formatArabicCurrency(stats.totalRemaining || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
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
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">جميع الشركات</option>
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
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <select
              value={filterFullyPaid}
              onChange={(e) => setFilterFullyPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">جميع الفواتير</option>
              <option value="unpaid">غير مسددة</option>
              <option value="paid">مسددة بالكامل</option>
            </select>
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير
          </button>
        </div>
      </div>

      {/* Sales Table */}
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
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ الإجمالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ المدفوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ المتبقي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
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
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-lg font-medium mb-2">لا توجد مبيعات آجلة</p>
                      <p className="text-sm">
                        {selectedCompanyId 
                          ? 'لا توجد مبيعات آجلة للشركة المختارة'
                          : filterFullyPaid !== 'all'
                          ? `لا توجد فواتير ${filterFullyPaid === 'paid' ? 'مسددة' : 'غير مسددة'}`
                          : searchTerm
                          ? 'لا توجد نتائج للبحث'
                          : 'ابدأ بإنشاء أول فاتورة مبيعات آجلة'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale: CreditSale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.invoiceNumber || `#${sale.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-600">{sale.company?.name}</span>
                      <span className="text-xs text-gray-500">{sale.company?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatArabicCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatArabicCurrency(sale.paidAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {formatArabicCurrency(sale.remainingAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.isFullyPaid 
                        ? 'bg-green-100 text-green-800' 
                        : sale.paidAmount > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.isFullyPaid ? 'مسددة' : sale.paidAmount > 0 ? 'مسددة جزئياً' : 'غير مسددة'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {!sale.isFullyPaid && (
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowPaymentModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="إضافة دفعة"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
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
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {salesData?.data?.pagination && filteredSales.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              عرض {formatArabicNumber(((currentPage - 1) * 10) + 1)} إلى {formatArabicNumber(Math.min(currentPage * 10, filteredSales.length))} من {formatArabicNumber(filteredSales.length)} نتيجة
              {selectedCompanyId && (
                <span className="mr-2 text-blue-600 font-medium">
                  (للشركة: {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= salesData.data.pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة دفعة جديدة</h3>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between mb-1">
                    <span>رقم الفاتورة:</span>
                    <span className="font-semibold">{selectedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>المبلغ الإجمالي:</span>
                    <span className="font-semibold">{formatArabicCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>المبلغ المدفوع:</span>
                    <span className="font-semibold text-green-600">{formatArabicCurrency(selectedSale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-semibold text-red-600">{formatArabicCurrency(selectedSale.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المبلغ المدفوع *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    max={selectedSale.remainingAmount}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل المبلغ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    طريقة الدفع *
                  </label>
                  <select
                    name="paymentMethod"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">كاش</option>
                    <option value="BANK">حوالة مصرفية</option>
                    <option value="CARD">بطاقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ملاحظات إضافية (اختياري)"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isCreatingPayment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isCreatingPayment ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedSale(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">تفاصيل الفاتورة</h3>
              
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">رقم الفاتورة:</span>
                  <div className="font-semibold">{selectedSale.invoiceNumber}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">العميل:</span>
                  <div className="font-semibold">{selectedSale.customer?.name || 'غير محدد'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">المبلغ الإجمالي:</span>
                  <div className="font-semibold">{formatArabicCurrency(selectedSale.total)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">المبلغ المتبقي:</span>
                  <div className="font-semibold text-red-600">{formatArabicCurrency(selectedSale.remainingAmount)}</div>
                </div>
              </div>

              {/* Payments History */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">سجل الدفعات ({formatArabicNumber(selectedSale.payments?.length || 0)})</h4>
                  {selectedSale.payments && selectedSale.payments.length > 0 && (
                    <button
                      onClick={() => handlePrintPaymentsHistory(selectedSale)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      🖨️ طباعة سجل الدفعات
                    </button>
                  )}
                </div>
                {selectedSale.payments && selectedSale.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSale.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-semibold">{formatArabicCurrency(payment.amount)}</div>
                          <div className="text-sm text-gray-600">
                            {payment.receiptNumber} - {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}
                          </div>
                          {payment.notes && <div className="text-xs text-gray-500">{payment.notes}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePrintPaymentReceipt(payment, selectedSale)}
                            className="text-blue-600 hover:text-blue-900"
                            title="طباعة إيصال القبض"
                          >
                            🖨️
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">لا توجد دفعات</p>
                )}
              </div>

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSale(null);
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Receipt Modal */}
      {showPrintReceiptModal && selectedPayment && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🖨️ معاينة إيصال القبض</h2>
              <button onClick={() => setShowPrintReceiptModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div id="receipt-print-content" style={{ transform: 'scale(0.5)', transformOrigin: 'top center', width: '200%' }}>
                  <CreditPaymentReceiptPrint payment={selectedPayment} sale={selectedSale} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setShowPrintReceiptModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                إلغاء
              </button>
              <button onClick={printReceipt} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print History Modal */}
      {showPrintHistoryModal && selectedSale && selectedSale.payments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">🖨️ معاينة سجل الدفعات</h2>
              <button onClick={() => setShowPrintHistoryModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div id="history-print-content" style={{ transform: 'scale(0.5)', transformOrigin: 'top center', width: '200%' }}>
                  <PaymentsHistoryPrint sale={selectedSale} payments={selectedSale.payments} />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button onClick={() => setShowPrintHistoryModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                إلغاء
              </button>
              <button onClick={printHistory} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditSalesPage;
