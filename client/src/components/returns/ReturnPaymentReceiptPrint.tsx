/**
 * مكون طباعة إيصال دفع مردودات
 * Return Payment Receipt Print Component
 */

import React from 'react';
import { ReturnPayment, SaleReturn } from '@/state/saleReturnApi';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface ReturnPaymentReceiptPrintProps {
  payment: ReturnPayment;
  saleReturn: SaleReturn;
  companyName: string;
  companyCode: string;
  accountantName: string;
}

// تحويل الرقم إلى كلمات عربية
const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 1000);
  
  let result = '';
  
  // الآلاف
  const thousands = Math.floor(integerPart / 1000);
  if (thousands > 0) {
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands <= 10) result += ones[thousands] + ' آلاف';
    else result += formatThousands(thousands) + ' ألف';
    result += ' و';
  }
  
  // المئات
  const remainder = integerPart % 1000;
  const hundredsDigit = Math.floor(remainder / 100);
  if (hundredsDigit > 0) {
    result += hundreds[hundredsDigit] + ' و';
  }
  
  // العشرات والآحاد
  const lastTwo = remainder % 100;
  if (lastTwo >= 10 && lastTwo < 20) {
    result += teens[lastTwo - 10];
  } else {
    const tensDigit = Math.floor(lastTwo / 10);
    const onesDigit = lastTwo % 10;
    
    if (tensDigit > 0) {
      result += tens[tensDigit];
      if (onesDigit > 0) result += ' و';
    }
    if (onesDigit > 0) {
      result += ones[onesDigit];
    }
  }
  
  // إزالة "و" الزائدة
  result = result.replace(/\s+و\s*$/, '');
  
  // إضافة الكسور
  if (decimalPart > 0) {
    result += ' جنيه و' + decimalPart + ' قرش';
  } else {
    result += ' جنيه';
  }
  
  return result;
};

const formatThousands = (num: number): string => {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  
  if (num >= 10 && num < 20) {
    return teens[num - 10];
  }
  
  const tensDigit = Math.floor(num / 10);
  const onesDigit = num % 10;
  
  let result = '';
  if (tensDigit > 0) result += tens[tensDigit];
  if (onesDigit > 0) {
    if (tensDigit > 0) result += ' و';
    result += ones[onesDigit];
  }
  
  return result;
};

export const ReturnPaymentReceiptPrint: React.FC<ReturnPaymentReceiptPrintProps> = ({ 
  payment, 
  saleReturn, 
  companyName, 
  companyCode,
  accountantName
}) => {
  const amountInWords = numberToArabicWords(payment.amount);

  return (
    <div className="print-receipt" style={{ 
      width: '210mm', 
      minHeight: '148mm',
      padding: '12mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl',
      pageBreakAfter: 'always',
      border: '2px solid #333'
    }}>
      {/* رأس الإيصال - بسيط */}
      <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '22px', margin: '0 0 4px 0', color: '#000' }}>
          {companyName}
        </h1>
        <p style={{ fontSize: '12px', margin: '3px 0', color: '#666' }}>
          كود الشركة: {companyCode}
        </p>
        <h2 style={{ fontSize: '18px', margin: '8px 0 0 0', color: '#000', fontWeight: 'bold' }}>
          إيصال دفع - مردودات
        </h2>
      </div>

      {/* معلومات الإيصال - في سطر واحد */}
      <div style={{ 
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span><strong>رقم الإيصال:</strong> {payment.receiptNumber || `#${payment.id}`}</span>
          <span><strong>التاريخ:</strong> {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}</span>
          <span><strong>طريقة الدفع:</strong> {
            payment.paymentMethod === 'CASH' ? 'كاش' :
            payment.paymentMethod === 'BANK' ? 'حوالة' : 
            payment.paymentMethod === 'CARD' ? 'بطاقة' : 'أخرى'
          }</span>
        </div>
      </div>

      {/* معلومات المستلم - بسيط */}
      <div style={{ 
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '4px'
      }}>
        <p style={{ margin: '0', fontSize: '13px' }}>
          <strong>دفعنا لـ:</strong> <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{saleReturn.customer?.name || 'عميل'}</span>
          {saleReturn.customer?.phone && <span style={{ marginRight: '15px', color: '#666' }}>هاتف: {saleReturn.customer.phone}</span>}
        </p>
      </div>

      {/* المبلغ - واضح وبسيط */}
      <div style={{ 
        marginBottom: '15px',
        padding: '15px',
        textAlign: 'center',
        border: '2px solid #333',
        borderRadius: '6px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>مبلغ وقدره</p>
        <p style={{ 
          margin: '0 0 10px 0', 
          fontSize: '36px', 
          fontWeight: 'bold', 
          color: '#000'
        }}>
          {formatArabicCurrency(payment.amount)}
        </p>
        <p style={{ margin: '0', fontSize: '13px', color: '#666', borderTop: '1px dashed #999', paddingTop: '8px' }}>
          فقط: {amountInWords} لا غير
        </p>
      </div>

      {/* معلومات المردود - سطر واحد */}
      <div style={{ 
        marginBottom: '12px',
        padding: '8px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '4px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
          <strong>دفعة من مردود رقم:</strong> #{saleReturn.id} • <strong>فاتورة:</strong> {saleReturn.sale.invoiceNumber || saleReturn.sale.id}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '1px solid #fecaca' }}>
          <span>إجمالي المردود: <strong style={{ fontSize: '14px' }}>{formatArabicCurrency(saleReturn.total)}</strong></span>
          <span style={{ color: '#16a34a' }}>المدفوع: <strong style={{ fontSize: '14px' }}>{formatArabicCurrency(saleReturn.paidAmount)}</strong></span>
          <span style={{ color: '#dc2626' }}>الباقي: <strong style={{ fontSize: '14px' }}>{formatArabicCurrency(saleReturn.remainingAmount)}</strong></span>
        </div>
      </div>

      {/* ملاحظات */}
      {payment.notes && (
        <div style={{ 
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#fef9c3',
          border: '1px solid #fbbf24',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0', fontSize: '12px' }}>
            <strong>ملاحظات:</strong> {payment.notes}
          </p>
        </div>
      )}

      {/* التوقيعات */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '30px',
        paddingTop: '12px',
        borderTop: '1px solid #d1d5db'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '20px' }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>المحاسب</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666' }}>{accountantName}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '20px' }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>المستلم</p>
          </div>
        </div>
      </div>

      {/* الختم */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '15px', 
        fontSize: '10px', 
        color: '#999' 
      }}>
        <p style={{ margin: '2px 0' }}>إيصال دفع مردودات صحيح</p>
        <p style={{ margin: '2px 0' }}>تم الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}</p>
      </div>
    </div>
  );
};

