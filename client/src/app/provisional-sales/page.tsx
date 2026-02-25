'use client';

import React, { useState } from 'react';
import {
  useGetProvisionalSalesQuery,
  useConvertProvisionalSaleToSaleMutation,
  ProvisionalSale,
} from '@/state/provisionalSalesApi';
import { ProvisionalSalePrintModal } from '@/components/provisional-sales/ProvisionalSalePrintModal';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

export default function ProvisionalSalesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PENDING' | 'APPROVED' | 'CONVERTED' | 'CANCELLED' | ''>('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ProvisionalSale | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saleToConvert, setSaleToConvert] = useState<ProvisionalSale | null>(null);
  const [convertSaleType, setConvertSaleType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD'>('CASH');

  const { success, error: showError } = useToast();

  const { data, isLoading, refetch } = useGetProvisionalSalesQuery({
    page: currentPage,
    limit: 20,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });

  const [convertToSale, { isLoading: isConverting }] = useConvertProvisionalSaleToSaleMutation();

  const handlePrint = (sale: ProvisionalSale) => {
    setSelectedSale(sale);
    setShowPrintModal(true);
  };

  const handleConvert = async () => {
    if (!saleToConvert) return;

    try {
      await convertToSale({
        id: saleToConvert.id,
        data: {
          saleType: convertSaleType,
          paymentMethod: convertPaymentMethod,
        },
      }).unwrap();

      success('تم ترحيل الفاتورة المبدئية إلى فاتورة مبيعات بنجاح');
      setShowConvertModal(false);
      setSaleToConvert(null);
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || 'فشل ترحيل الفاتورة');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: { text: 'مسودة', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      PENDING: { text: 'معلقة', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      APPROVED: { text: 'معتمدة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      CONVERTED: { text: 'مرحلة', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      CANCELLED: { text: 'ملغية', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    };
    const badge = badges[status as keyof typeof badges] || badges.DRAFT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-text-primary mb-2">
          الفواتير المبدئية
        </h1>
        <p className="text-slate-600 dark:text-text-secondary">
          إدارة ومعاينة الفواتير المبدئية قبل ترحيلها إلى فواتير مبيعات
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="بحث برقم الفاتورة أو العميل..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary"
        >
          <option value="">جميع الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="PENDING">معلقة</option>
          <option value="APPROVED">معتمدة</option>
          <option value="CONVERTED">مرحلة</option>
          <option value="CANCELLED">ملغية</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-primary rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-border-primary">
          <thead className="bg-slate-50 dark:bg-surface-secondary">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                رقم الفاتورة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                العميل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                المبلغ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-surface-primary divide-y divide-slate-200 dark:divide-border-primary">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-500 dark:text-text-secondary">
                  جاري التحميل...
                </td>
              </tr>
            ) : data?.provisionalSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-500 dark:text-text-secondary">
                  لا توجد فواتير مبدئية
                </td>
              </tr>
            ) : (
              data?.provisionalSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-text-primary">
                    {sale.invoiceNumber || `#${sale.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-text-primary">
                    {sale.customer?.name || 'عميل نقدي'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-text-primary">
                    {formatArabicCurrency(sale.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusBadge(sale.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-text-secondary">
                    {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(sale)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-1 rounded"
                        title="طباعة الفاتورة المبدئية"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      {!sale.isConverted && sale.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setSaleToConvert(sale);
                            setShowConvertModal(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded"
                          title="ترحيل إلى فاتورة مبيعات"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      )}
                      {sale.isConverted && sale.convertedSale && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          مرحلة → #{sale.convertedSale.invoiceNumber || sale.convertedSale.id}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Print Modal */}
      <ProvisionalSalePrintModal
        sale={selectedSale}
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setSelectedSale(null);
        }}
      />

      {/* Convert Modal */}
      {showConvertModal && saleToConvert && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50"
            onClick={() => setShowConvertModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-text-primary mb-4">
                ترحيل الفاتورة المبدئية
              </h3>
              <p className="text-sm text-slate-600 dark:text-text-secondary mb-4">
                سيتم إنشاء فاتورة مبيعات عادية من هذه الفاتورة المبدئية
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-primary mb-2">
                    نوع البيع
                  </label>
                  <select
                    value={convertSaleType}
                    onChange={(e) => setConvertSaleType(e.target.value as 'CASH' | 'CREDIT')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary"
                  >
                    <option value="CASH">نقدي</option>
                    <option value="CREDIT">آجل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-text-primary mb-2">
                    طريقة الدفع
                  </label>
                  <select
                    value={convertPaymentMethod}
                    onChange={(e) => setConvertPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'CARD')}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary"
                  >
                    <option value="CASH">كاش</option>
                    <option value="BANK">حوالة بنكية</option>
                    <option value="CARD">بطاقة</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-surface-secondary text-slate-700 dark:text-text-primary rounded-lg hover:bg-slate-300 dark:hover:bg-surface-hover transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isConverting ? 'جاري الترحيل...' : 'ترحيل'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
