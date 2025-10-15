'use client';

import React, { useState, useRef } from 'react';
import { useGetCashSalesQuery, useIssueReceiptMutation, Sale } from '@/state/salesApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useToast } from '@/components/ui/Toast';
import { ReceiptPrint } from '@/components/sales/ReceiptPrint';

export default function CashierReceiptsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [issuedReceipts, setIssuedReceipts] = useState<Set<number>>(new Set());
  const [currentSaleToPrint, setCurrentSaleToPrint] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const { success, error: showError } = useToast();
  
  const { 
    data: salesData, 
    isLoading, 
    refetch 
  } = useGetCashSalesQuery({
    page: currentPage,
    limit: 20,
    receiptIssued: false,
    todayOnly: true
  });

  const [issueReceipt, { isLoading: isIssuing }] = useIssueReceiptMutation();

  const printReceipt = (sale: Sale) => {
    setCurrentSaleToPrint(sale);
    
    setTimeout(() => {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        showError('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
        return;
      }

      const receiptContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>إيصال قبض - ${sale.invoiceNumber || sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; direction: rtl; }
            @media print {
              body { margin: 0; padding: 0; }
              .receipt { page-break-after: always; }
            }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>
          <div id="receipt-container"></div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.print(), 100);
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(receiptContent);
      const container = printWindow.document.getElementById('receipt-container');
      if (container && printRef.current) {
        container.innerHTML = printRef.current.innerHTML;
      }
      printWindow.document.close();
      setCurrentSaleToPrint(null);
    }, 100);
  };

  const handleIssueReceipt = async (sale: Sale) => {
    try {
      await issueReceipt(sale.id).unwrap();
      setIssuedReceipts(prev => new Set(prev).add(sale.id));
      success(`تم إصدار إيصال القبض للفاتورة ${sale.invoiceNumber || sale.id}`);
      printReceipt(sale);
      setTimeout(() => refetch(), 2000);
    } catch (err: any) {
      showError(err?.data?.message || 'حدث خطأ أثناء إصدار إيصال القبض');
    }
  };

  const sales = salesData?.data?.sales || [];
  const pagination = salesData?.data?.pagination;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إيصالات القبض - المحاسب</h1>
        <p className="text-gray-600 mt-1">الفواتير النقدية المعلقة (اليوم)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">فواتير معلقة</p>
              <p className="text-2xl font-bold text-orange-600">{sales.length}</p>
            </div>
            <svg className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-blue-600">
                {sales.reduce((sum: number, sale: any) => sum + sale.total, 0).toFixed(2)} د.ل
              </p>
            </div>
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">المحاسب</p>
              <p className="text-lg font-bold text-gray-900">{user?.fullName || 'غير معروف'}</p>
            </div>
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  طريقة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    لا توجد فواتير نقدية معلقة
                  </td>
                </tr>
              ) : (
                sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.invoiceNumber || `#${sale.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer?.name || 'عميل نقدي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {sale.total.toFixed(2)} د.ل
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.paymentMethod === 'CASH' && 'نقدي'}
                      {sale.paymentMethod === 'BANK' && 'حوالة بنكية'}
                      {sale.paymentMethod === 'CARD' && 'بطاقة'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {issuedReceipts.has(sale.id) ? (
                        <div className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600">
                          <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          تم إصدار إيصال القبض
                        </div>
                      ) : (
                        <button
                          onClick={() => handleIssueReceipt(sale)}
                          disabled={isIssuing}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                        >
                          <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          إصدار إيصال قبض
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
        {pagination && pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span> إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span>{' '}
                  من <span className="font-medium">{pagination.total}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print container */}
      <div ref={printRef} className="hidden">
        {currentSaleToPrint && <ReceiptPrint sale={currentSaleToPrint} />}
      </div>
    </div>
  );
}
