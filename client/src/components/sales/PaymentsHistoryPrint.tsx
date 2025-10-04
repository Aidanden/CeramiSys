"use client";

import React from 'react';
import { CreditSale, SalePayment } from '@/state/salePaymentApi';
import { formatArabicCurrency, formatArabicNumber } from '@/utils/formatArabicNumbers';

interface PaymentsHistoryPrintProps {
  sale: CreditSale;
  payments: SalePayment[];
}

export const PaymentsHistoryPrint: React.FC<PaymentsHistoryPrintProps> = ({ sale, payments }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const getPaymentMethodText = (method: string) => {
    const methods: { [key: string]: string } = {
      'CASH': 'كاش',
      'BANK': 'حوالة',
      'CARD': 'بطاقة'
    };
    return methods[method] || method;
  };

  return (
    <div className="hidden print:block" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="w-full max-w-[210mm] mx-auto p-6 font-arabic">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">{sale.company?.name || 'اسم الشركة'}</h1>
          <p className="text-sm text-gray-600">كود الشركة: {sale.company?.code || '-'}</p>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gray-800 text-white py-3 px-6 rounded inline-block">
            سجل الدفعات المالية
          </h2>
        </div>

        {/* Invoice Info */}
        <div className="mb-6 bg-gray-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-3 text-center border-b border-gray-400 pb-2">
            بيانات الفاتورة
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">رقم الفاتورة:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">تاريخ الفاتورة:</span>
                <span>{formatDate(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">اسم العميل:</span>
                <span>{sale.customer?.name || 'عميل نقدي'}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">إجمالي الفاتورة:</span>
                <span className="font-bold">{formatArabicCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between mb-2 text-green-700">
                <span className="font-semibold">المبلغ المدفوع:</span>
                <span className="font-bold">{formatArabicCurrency(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="font-semibold">المبلغ المتبقي:</span>
                <span className="font-bold">{formatArabicCurrency(sale.remainingAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 text-center">
            تفاصيل الدفعات ({formatArabicNumber(payments.length)} دفعة)
          </h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-400 p-2 text-center">#</th>
                <th className="border border-gray-400 p-2">رقم الإيصال</th>
                <th className="border border-gray-400 p-2">التاريخ</th>
                <th className="border border-gray-400 p-2">المبلغ</th>
                <th className="border border-gray-400 p-2">طريقة الدفع</th>
                <th className="border border-gray-400 p-2">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border border-gray-400 p-2 text-center font-semibold">
                    {index + 1}
                  </td>
                  <td className="border border-gray-400 p-2 font-mono">
                    {payment.receiptNumber}
                  </td>
                  <td className="border border-gray-400 p-2">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="border border-gray-400 p-2 text-left font-bold text-green-700">
                    {formatArabicCurrency(payment.amount)}
                  </td>
                  <td className="border border-gray-400 p-2 text-center">
                    {getPaymentMethodText(payment.paymentMethod)}
                  </td>
                  <td className="border border-gray-400 p-2 text-sm">
                    {payment.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={3} className="border border-gray-400 p-2 text-left">
                  الإجمالي:
                </td>
                <td className="border border-gray-400 p-2 text-left text-green-700">
                  {formatArabicCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </td>
                <td colSpan={2} className="border border-gray-400 p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary */}
        <div className="mb-6 bg-blue-50 p-4 rounded border-2 border-blue-500">
          <h3 className="font-bold text-lg mb-3 text-center">الملخص المالي</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white p-3 rounded border border-gray-300">
              <p className="text-sm text-gray-600 mb-1">إجمالي الفاتورة</p>
              <p className="text-xl font-bold">{formatArabicCurrency(sale.total)}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-300">
              <p className="text-sm text-gray-600 mb-1">المبلغ المدفوع</p>
              <p className="text-xl font-bold text-green-700">{formatArabicCurrency(sale.paidAmount)}</p>
            </div>
            <div className="bg-white p-3 rounded border border-red-300">
              <p className="text-sm text-gray-600 mb-1">المبلغ المتبقي</p>
              <p className="text-xl font-bold text-red-600">{formatArabicCurrency(sale.remainingAmount)}</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="mb-6 text-center">
          {sale.remainingAmount === 0 ? (
            <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded inline-block">
              <p className="text-xl font-bold">✓ تم السداد بالكامل</p>
            </div>
          ) : (
            <div className="bg-yellow-100 border-2 border-yellow-500 text-yellow-800 p-4 rounded inline-block">
              <p className="text-xl font-bold">⚠ يوجد مبلغ متبقي: {formatArabicCurrency(sale.remainingAmount)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t-2 border-gray-800">
          <p className="text-sm mb-2">هذا المستند للمراجعة فقط</p>
          <p className="text-xs text-gray-600">
            تم الطباعة: {new Date().toLocaleString('ar-LY')}
          </p>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t border-gray-400">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-full mb-2 mt-12"></div>
              <p className="text-sm font-semibold">المحاسب</p>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-full mb-2 mt-12"></div>
              <p className="text-sm font-semibold">المدير المالي</p>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-full mb-2 mt-12"></div>
              <p className="text-sm font-semibold">المدير العام</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsHistoryPrint;
