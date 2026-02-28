"use client";

import React from 'react';
import { CreditSale, SalePayment } from '@/state/salePaymentApi';
import { formatArabicCurrency, formatArabicNumber } from '@/utils/formatArabicNumbers';

interface PaymentsHistoryPrintProps {
  sale: CreditSale;
  payments: SalePayment[];
  onEditPaymentMethod?: (payment: SalePayment) => void;
  showEditButtons?: boolean;
}

export const PaymentsHistoryPrint: React.FC<PaymentsHistoryPrintProps> = ({ sale, payments, onEditPaymentMethod, showEditButtons = false }) => {
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
    <div dir="rtl">
      <style>{`
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

      <div style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
        {/* Header - مصغر */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1f2937', paddingBottom: '8px', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{sale.company?.name || 'اسم الشركة'}</h1>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>سجل الدفعات المالية</h2>
        </div>

        {/* Invoice Info - مصغر وفي سطر واحد */}
        <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #d1d5db' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span><strong>فاتورة:</strong> {sale.invoiceNumber}</span>
            <span><strong>العميل:</strong> {sale.customer?.name || 'عميل نقدي'}</span>
            <span><strong>التاريخ:</strong> {formatDate(sale.createdAt)}</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>
              <strong>الباقي:</strong> {formatArabicCurrency(sale.remainingAmount)}
            </span>
          </div>
        </div>

        {/* Payments Table - مصغر مع أرقام أكبر */}
        <div style={{ marginBottom: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #6b7280', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#374151', color: 'white' }}>
                <th style={{ border: '1px solid #6b7280', padding: '6px', textAlign: 'center', fontSize: '11px' }}>#</th>
                <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>رقم الإيصال</th>
                <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>التاريخ</th>
                <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>المبلغ</th>
                <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>طريقة الدفع</th>
                <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>ملاحظات</th>
                {showEditButtons && (
                  <th style={{ border: '1px solid #6b7280', padding: '6px', fontSize: '11px' }}>إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', fontWeight: '600', fontSize: '11px' }}>
                    {index + 1}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', fontFamily: 'monospace', fontSize: '11px' }}>
                    {payment.receiptNumber}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', fontSize: '11px' }}>
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'left', fontWeight: 'bold', fontSize: '15px', color: '#15803d' }}>
                    {formatArabicCurrency(payment.amount)}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center', fontSize: '11px' }}>
                    {getPaymentMethodText(payment.paymentMethod)}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '5px', fontSize: '10px' }}>
                    {payment.notes || '-'}
                  </td>
                  {showEditButtons && (
                    <td style={{ border: '1px solid #d1d5db', padding: '5px', textAlign: 'center' }}>
                      <button
                        onClick={() => onEditPaymentMethod?.(payment)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title="تعديل طريقة الدفع"
                      >
                        🔄
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ border: '1px solid #6b7280', padding: '8px', textAlign: 'left', fontSize: '13px' }}>
                  إجمالي المدفوع:
                </td>
                <td style={{ border: '1px solid #6b7280', padding: '8px', textAlign: 'left', fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>
                  {formatArabicCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </td>
                <td colSpan={showEditButtons ? 3 : 2} style={{ border: '1px solid #6b7280', padding: '8px' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary - مصغر وفي سطر واحد */}
        <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f0f9ff', border: '1px solid #3b82f6', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>الإجمالي: </span>
              <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{formatArabicCurrency(sale.total)}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>المدفوع: </span>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#15803d' }}>{formatArabicCurrency(sale.paidAmount)}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>الباقي: </span>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#dc2626' }}>{formatArabicCurrency(sale.remainingAmount)}</span>
            </div>
            <div>
              {sale.remainingAmount === 0 ? (
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>✓ تم السداد</span>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626' }}>⚠ متبقي</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer & Signatures - مصغر */}
        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #9ca3af' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ borderTop: '1px solid #1f2937', marginBottom: '4px', marginTop: '20px' }}></div>
              <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>المحاسب</p>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ borderTop: '1px solid #1f2937', marginBottom: '4px', marginTop: '20px' }}></div>
              <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>المدير المالي</p>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ borderTop: '1px solid #1f2937', marginBottom: '4px', marginTop: '20px' }}></div>
              <p style={{ fontSize: '11px', fontWeight: '600', margin: 0 }}>المدير العام</p>
            </div>
          </div>
          <p style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
            تم الطباعة: {new Date().toLocaleString('ar-LY')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentsHistoryPrint;
