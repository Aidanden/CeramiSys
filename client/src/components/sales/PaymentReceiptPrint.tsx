"use client";

import React from 'react';

interface PaymentReceiptPrintProps {
  payment: {
    id: number;
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
  };
  sale: {
    id: number;
    invoiceNumber: string;
    total: number;
    paidAmount: number;
    remainingAmount: number;
    customer?: {
      name: string;
      phone?: string;
    };
  };
  company?: {
    name: string;
    address?: string;
    phone?: string;
  };
}

const PaymentReceiptPrint: React.FC<PaymentReceiptPrintProps> = ({ payment, sale, company }) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' د.ل';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodText = (method: string) => {
    const methods: { [key: string]: string } = {
      'CASH': 'كاش',
      'BANK': 'حوالة مصرفية',
      'CARD': 'بطاقة'
    };
    return methods[method] || method;
  };

  return (
    <div className="hidden print:block" dir="rtl">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
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

      <div className="w-full max-w-[80mm] mx-auto p-4 font-arabic text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-3 mb-3">
          <h1 className="text-xl font-bold mb-1">{company?.name || 'اسم الشركة'}</h1>
          {company?.address && (
            <p className="text-xs text-gray-600">{company.address}</p>
          )}
          {company?.phone && (
            <p className="text-xs text-gray-600">هاتف: {company.phone}</p>
          )}
        </div>

        {/* Receipt Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold bg-gray-800 text-white py-2 px-4 rounded">
            إيصال قبض
          </h2>
        </div>

        {/* Receipt Info */}
        <div className="mb-4 space-y-2">
          <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-semibold">رقم الإيصال:</span>
            <span className="font-bold">{payment.receiptNumber}</span>
          </div>
          <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-semibold">التاريخ:</span>
            <span>{formatDate(payment.paymentDate)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-semibold">الوقت:</span>
            <span>{formatTime(payment.paymentDate)}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-4 bg-gray-100 p-3 rounded">
          <h3 className="font-bold mb-2 text-center">بيانات العميل</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">الاسم:</span>
              <span>{sale.customer?.name || 'عميل نقدي'}</span>
            </div>
            {sale.customer?.phone && (
              <div className="flex justify-between">
                <span className="font-semibold">الهاتف:</span>
                <span>{sale.customer.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-300">
          <h3 className="font-bold mb-2 text-center">بيانات الفاتورة</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">رقم الفاتورة:</span>
              <span>{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">إجمالي الفاتورة:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span className="font-semibold">المبلغ المدفوع سابقاً:</span>
              <span>{formatCurrency(sale.paidAmount - payment.amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-4 bg-blue-50 p-4 rounded border-2 border-blue-500">
          <h3 className="font-bold mb-3 text-center text-lg">تفاصيل الدفعة</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span className="font-bold">المبلغ المدفوع:</span>
              <span className="font-bold text-blue-700">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">طريقة الدفع:</span>
              <span className="font-bold">{getPaymentMethodText(payment.paymentMethod)}</span>
            </div>
            {payment.notes && (
              <div className="pt-2 border-t border-blue-300">
                <span className="font-semibold">ملاحظات:</span>
                <p className="text-xs mt-1">{payment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Remaining Amount */}
        <div className="mb-4 bg-yellow-50 p-3 rounded border border-yellow-400">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">المبلغ المتبقي:</span>
            <span className="font-bold text-xl text-red-600">
              {formatCurrency(sale.remainingAmount)}
            </span>
          </div>
        </div>

        {/* Summary Box */}
        <div className="mb-4 bg-gray-100 p-3 rounded">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>إجمالي الفاتورة:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>إجمالي المدفوع:</span>
              <span>{formatCurrency(sale.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold border-t border-gray-400 pt-1">
              <span>المتبقي:</span>
              <span>{formatCurrency(sale.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t-2 border-gray-800">
          <p className="text-xs mb-2">شكراً لتعاملكم معنا</p>
          <p className="text-xs text-gray-600">
            تم الطباعة: {new Date().toLocaleString('ar-LY')}
          </p>
        </div>

        {/* Signature Section */}
        <div className="mt-6 pt-4 border-t border-gray-400">
          <div className="flex justify-between items-end">
            <div className="text-center">
              <div className="border-t border-gray-800 w-32 mb-1"></div>
              <p className="text-xs">توقيع المستلم</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-800 w-32 mb-1"></div>
              <p className="text-xs">توقيع المحاسب</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptPrint;
