'use client';

import React, { useState, useRef } from 'react';
import {
  useGetSaleReturnsQuery,
  useApproveSaleReturnMutation,
  useRejectSaleReturnMutation,
  useCreateReturnPaymentMutation,
  useDeleteReturnPaymentMutation,
  SaleReturn,
  ReturnPayment
} from '@/state/saleReturnApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useToast } from '@/components/ui/Toast';
import { Search, Filter, X, DollarSign, FileText, CheckCircle, XCircle, Eye, Trash2, Printer } from 'lucide-react';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { ReturnPaymentReceiptPrint } from '@/components/returns/ReturnPaymentReceiptPrint';
import ReactDOMServer from 'react-dom/server';

export default function ReturnPaymentsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPaymentForPrint, setSelectedPaymentForPrint] = useState<ReturnPayment | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const { success, error: showError } = useToast();

  // Get payment status filter
  const getPaymentStatusFilter = () => {
    if (paymentStatusFilter === 'paid') return true;
    if (paymentStatusFilter === 'pending') return false;
    return undefined;
  };

  // Fetch sale returns
  const {
    data: returnsData,
    isLoading,
    isFetching,
    refetch
  } = useGetSaleReturnsQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
    isFullyPaid: getPaymentStatusFilter(),
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });

  const [approveSaleReturn] = useApproveSaleReturnMutation();
  const [rejectSaleReturn] = useRejectSaleReturnMutation();
  const [createReturnPayment] = useCreateReturnPaymentMutation();
  const [deleteReturnPayment] = useDeleteReturnPaymentMutation();

  // Handle approve return
  const handleApproveReturn = async (returnId: number) => {
    try {
      await approveSaleReturn(returnId).unwrap();
      success('تم اعتماد المردود بنجاح');
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || 'فشل في اعتماد المردود');
    }
  };

  // Handle reject return
  const handleRejectReturn = async (returnId: number) => {
    try {
      await rejectSaleReturn(returnId).unwrap();
      success('تم رفض المردود');
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || 'فشل في رفض المردود');
    }
  };

  // Handle create payment
  const handleCreatePayment = async () => {
    if (!selectedReturn) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (amount > parseFloat(selectedReturn.remainingAmount.toString())) {
      showError('المبلغ يتجاوز المبلغ المتبقي');
      return;
    }

    try {
      const result = await createReturnPayment({
        saleReturnId: selectedReturn.id,
        amount: amount,
        paymentMethod: paymentMethod,
        notes: paymentNotes || undefined
      }).unwrap();

      success('تم إضافة الدفعة بنجاح');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      
      // Show print modal immediately after creating payment
      setSelectedPaymentForPrint(result.data);
      setShowPrintModal(true);
      
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || 'فشل في إضافة الدفعة');
    }
  };

  // Handle delete payment
  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;

    try {
      await deleteReturnPayment(paymentId).unwrap();
      success('تم حذف الدفعة بنجاح');
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || 'فشل في حذف الدفعة');
    }
  };

  // Handle print payment receipt
  const handlePrintPayment = (payment: ReturnPayment) => {
    setSelectedPaymentForPrint(payment);
    setShowPrintModal(true);
  };

  // Handle actual print
  const handleActualPrint = () => {
    if (!selectedPaymentForPrint || !selectedReturn) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Render the receipt component to HTML string
    const receiptElement = (
      <ReturnPaymentReceiptPrint
        payment={selectedPaymentForPrint}
        saleReturn={selectedReturn}
        companyName={user?.company?.name || 'اسم الشركة'}
        companyCode={user?.company?.code || '-'}
        accountantName={user?.fullName || user?.username || 'غير محدد'}
      />
    );

    const receiptHTML = ReactDOMServer.renderToStaticMarkup(receiptElement);

    // Write complete HTML document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إيصال دفع مردودات</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif;
            direction: rtl;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0;
            }
            @page {
              size: A4;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        ${receiptHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
          window.onafterprint = function() {
            window.close();
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const returns = returnsData?.data || [];
  const totalPages = returnsData?.pagination?.totalPages || 1;

  return (
    <div className="min-h-screen bg-surface-primary p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">إيصالات الدفع - المردودات</h1>
        <p className="text-text-secondary mt-2">إدارة إيصالات دفع المردودات والمبالغ المستردة</p>
      </div>

      {/* Filters */}
      <div className="bg-surface-secondary rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" size={20} />
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pr-10 pl-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
          >
            <option value="">جميع الحالات</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="APPROVED">معتمدة</option>
            <option value="REJECTED">مرفوضة</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
          >
            <option value="all">جميع المردودات</option>
            <option value="pending">مردودات غير مدفوعة</option>
            <option value="paid">مردودات مدفوعة بالكامل</option>
          </select>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-surface-secondary rounded-lg shadow-sm overflow-hidden">
        {isLoading || isFetching ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">
            <FileText className="mx-auto mb-4" size={48} />
            <p>لا توجد مردودات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-tertiary">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    رقم المردود
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    رقم الفاتورة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    المبلغ الكلي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    المبلغ المدفوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    المبلغ المتبقي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary divide-y divide-border-primary">
                {returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      #{formatArabicNumber(returnItem.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {returnItem.sale.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {returnItem.customer?.name || 'بدون عميل'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                      {formatArabicCurrency(returnItem.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-success-600">
                      {formatArabicCurrency(returnItem.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-danger-600">
                      {formatArabicCurrency(returnItem.remainingAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          returnItem.status === 'APPROVED'
                            ? 'bg-success-100 text-success-800'
                            : returnItem.status === 'PENDING'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-danger-100 text-danger-800'
                        }`}
                      >
                        {returnItem.status === 'APPROVED'
                          ? 'معتمد'
                          : returnItem.status === 'PENDING'
                          ? 'قيد الانتظار'
                          : 'مرفوض'}
                      </span>
                      {returnItem.isFullyPaid && (
                        <span className="mr-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-info-100 text-info-800">
                          مدفوع بالكامل
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {returnItem.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveReturn(returnItem.id)}
                              className="text-success-600 hover:text-success-800 transition-colors"
                              title="اعتماد المردود"
                            >
                              <CheckCircle size={20} />
                            </button>
                            <button
                              onClick={() => handleRejectReturn(returnItem.id)}
                              className="text-danger-600 hover:text-danger-800 transition-colors"
                              title="رفض المردود"
                            >
                              <XCircle size={20} />
                            </button>
                          </>
                        )}
                        {returnItem.status === 'APPROVED' && !returnItem.isFullyPaid && (
                          <button
                            onClick={() => {
                              setSelectedReturn(returnItem);
                              setPaymentAmount(returnItem.remainingAmount.toString());
                              setShowPaymentModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-800 transition-colors"
                            title="إصدار إيصال دفع"
                          >
                            <DollarSign size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReturn(returnItem);
                            setShowDetailsModal(true);
                          }}
                          className="text-info-600 hover:text-info-800 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-surface-secondary px-4 py-3 flex items-center justify-between border-t border-border-primary sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-border-primary text-sm font-medium rounded-md text-text-primary bg-surface-primary hover:bg-surface-secondary disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="mr-3 relative inline-flex items-center px-4 py-2 border border-border-primary text-sm font-medium rounded-md text-text-primary bg-surface-primary hover:bg-surface-secondary disabled:opacity-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-text-tertiary">
                  صفحة <span className="font-medium">{formatArabicNumber(currentPage)}</span> من{' '}
                  <span className="font-medium">{formatArabicNumber(totalPages)}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-primary bg-surface-primary text-sm font-medium text-text-tertiary hover:bg-surface-secondary disabled:opacity-50"
                  >
                    السابق
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-surface-primary border-border-primary text-text-tertiary hover:bg-surface-secondary'
                      }`}
                    >
                      {formatArabicNumber(i + 1)}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-primary bg-surface-primary text-sm font-medium text-text-tertiary hover:bg-surface-secondary disabled:opacity-50"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-primary rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">إصدار إيصال دفع</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReturn(null);
                  setPaymentAmount('');
                  setPaymentNotes('');
                }}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  المبلغ المتبقي
                </label>
                <div className="text-2xl font-bold text-danger-600">
                  {formatArabicCurrency(selectedReturn.remainingAmount)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  مبلغ الدفعة
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  step="0.01"
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
                >
                  <option value="CASH">كاش</option>
                  <option value="BANK">حوالة مصرفية</option>
                  <option value="CARD">بطاقة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-primary text-text-primary"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreatePayment}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  إصدار الإيصال
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedReturn(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                  className="flex-1 bg-surface-tertiary text-text-primary py-2 rounded-lg hover:bg-surface-secondary transition-colors font-medium"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-primary rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">تفاصيل المردود</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReturn(null);
                }}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Return Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">رقم المردود</p>
                  <p className="font-semibold text-text-primary">#{formatArabicNumber(selectedReturn.id)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">رقم الفاتورة</p>
                  <p className="font-semibold text-text-primary">{selectedReturn.sale.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">العميل</p>
                  <p className="font-semibold text-text-primary">{selectedReturn.customer?.name || 'بدون عميل'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">التاريخ</p>
                  <p className="font-semibold text-text-primary">
                    {new Date(selectedReturn.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>

              {/* Return Lines */}
              <div>
                <h4 className="font-semibold text-text-primary mb-2">الأصناف المرتجعة</h4>
                <table className="w-full">
                  <thead className="bg-surface-tertiary">
                    <tr>
                      <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">الصنف</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">الكمية</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">سعر الوحدة</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border-primary">
                        <td className="px-4 py-2 text-sm text-text-primary">{line.product.name}</td>
                        <td className="px-4 py-2 text-sm text-text-primary">{formatArabicNumber(line.qty)}</td>
                        <td className="px-4 py-2 text-sm text-text-primary">{formatArabicCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-text-primary">
                          {formatArabicCurrency(line.subTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-border-primary pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">المبلغ الكلي</p>
                    <p className="text-xl font-bold text-text-primary">{formatArabicCurrency(selectedReturn.total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">المبلغ المدفوع</p>
                    <p className="text-xl font-bold text-success-600">
                      {formatArabicCurrency(selectedReturn.paidAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">المبلغ المتبقي</p>
                    <p className="text-xl font-bold text-danger-600">
                      {formatArabicCurrency(selectedReturn.remainingAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payments History */}
              {selectedReturn.payments && selectedReturn.payments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">سجل الدفعات</h4>
                  <table className="w-full">
                    <thead className="bg-surface-tertiary">
                      <tr>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">التاريخ</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">المبلغ</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">طريقة الدفع</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">الملاحظات</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border-primary">
                          <td className="px-4 py-2 text-sm text-text-primary">
                            {new Date(payment.paymentDate).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-success-600">
                            {formatArabicCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-text-primary">
                            {payment.paymentMethod === 'CASH'
                              ? 'كاش'
                              : payment.paymentMethod === 'BANK'
                              ? 'حوالة'
                              : 'بطاقة'}
                          </td>
                          <td className="px-4 py-2 text-sm text-text-primary">{payment.notes || '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePrintPayment(payment)}
                                className="text-primary-600 hover:text-primary-800"
                                title="طباعة الإيصال"
                              >
                                <Printer size={18} />
                              </button>
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-danger-600 hover:text-danger-800"
                                title="حذف الدفعة"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedPaymentForPrint && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-primary-600 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">معاينة إيصال الدفع</h2>
              <button 
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPaymentForPrint(null);
                }}
                className="text-white hover:bg-primary-700 p-2 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Print Preview */}
            <div className="p-6 bg-gray-100 max-h-[600px] overflow-auto">
              <div className="flex justify-center">
                <div className="scale-75 origin-top" style={{ width: '210mm' }}>
                  <ReturnPaymentReceiptPrint
                    payment={selectedPaymentForPrint}
                    saleReturn={selectedReturn}
                    companyName={user?.company?.name || 'اسم الشركة'}
                    companyCode={user?.company?.code || '-'}
                    accountantName={user?.fullName || user?.username || 'غير محدد'}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedPaymentForPrint(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={handleActualPrint}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Printer size={20} />
                طباعة الإيصال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

