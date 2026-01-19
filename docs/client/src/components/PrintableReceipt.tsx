import React from 'react';
import { formatLibyanCurrencyArabic, formatEnglishDate } from '@/utils/formatLibyanNumbers';

interface PrintableReceiptProps {
  receipt: any;
  installment?: any;
  isFullPayment?: boolean;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt, installment, isFullPayment = false }) => {
  const printDate = new Date().toLocaleString('en-GB');

  return (
    <div className="printable-receipt" style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '80mm',
      margin: '0 auto',
      padding: '10px',
      fontSize: '12px',
      lineHeight: '1.4',
      display: 'none'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#000' }}>
          إيصال دفع
        </h1>
        <p style={{ margin: '5px 0', fontSize: '10px', color: '#666' }}>
          تاريخ الطباعة: {printDate}
        </p>
      </div>

      {/* Receipt Details */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>رقم الإيصال:</span>
          <span>#{receipt.id}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontWeight: 'bold' }}>المورد:</span>
          <span>{receipt.supplier.name}</span>
        </div>

        {receipt.purchase && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>فاتورة المشتريات:</span>
            <span>{receipt.purchase.invoiceNumber || `#${receipt.purchase.id}`}</span>
          </div>
        )}

        {receipt.type && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>النوع:</span>
            <span>
              {receipt.type === 'MAIN_PURCHASE' ? 'فاتورة رئيسية' :
               receipt.type === 'EXPENSE' ? 'مصروف' : receipt.type}
            </span>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>
          تفاصيل الدفعة
        </h3>

        {installment ? (
          // Individual installment
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>المبلغ المدفوع:</span>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {formatLibyanCurrencyArabic(installment.amount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>تاريخ الدفع:</span>
              <span>{formatEnglishDate(installment.paidAt)}</span>
            </div>

            {installment.paymentMethod && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>طريقة الدفع:</span>
                <span>{installment.paymentMethod}</span>
              </div>
            )}

            {installment.referenceNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>الرقم المرجعي:</span>
                <span>{installment.referenceNumber}</span>
              </div>
            )}

            {installment.notes && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>ملاحظات:</span>
                <p style={{ margin: '5px 0', fontSize: '11px' }}>{installment.notes}</p>
              </div>
            )}
          </>
        ) : (
          // Full payment
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>المبلغ الإجمالي:</span>
              <span>{formatLibyanCurrencyArabic(receipt.amount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>المبلغ المدفوع:</span>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#008000' }}>
                {formatLibyanCurrencyArabic(receipt.amount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>تاريخ التسديد:</span>
              <span>{receipt.paidAt ? formatEnglishDate(receipt.paidAt) : printDate}</span>
            </div>
          </>
        )}
      </div>

      {/* Receipt Summary */}
      <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '15px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0', textAlign: 'center' }}>
          ملخص الإيصال
        </h4>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>المبلغ الإجمالي:</span>
          <span>{formatLibyanCurrencyArabic(receipt.amount)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>المبلغ المدفوع:</span>
          <span>{formatLibyanCurrencyArabic(receipt.paidAmount || 0)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #ccc', paddingTop: '5px', marginTop: '5px' }}>
          <span>المبلغ المتبقي:</span>
          <span style={{ color: '#FF0000' }}>
            {formatLibyanCurrencyArabic(receipt.remainingAmount || receipt.amount)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '15px' }}>
        <p style={{ margin: '0', fontSize: '10px', color: '#666' }}>
          شكراً لتعاملكم معنا
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#666' }}>
          تم إصدار هذا الإيصال بواسطة النظام الآلي
        </p>
      </div>
    </div>
  );
};

export default PrintableReceipt;
