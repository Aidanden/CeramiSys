/**
 * مكون طباعة إيصال القبض/الصرف الخارجي
 * General Receipt Print Component
 */

import React from 'react';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface GeneralReceiptPrintProps {
  receipt: {
    id: number;
    type: string;
    amount: number;
    description?: string;
    notes?: string;
    receiptNumber?: string;
    paymentDate: string;
    contact?: { name: string; phone?: string };
    customer?: { name: string; phone?: string };
    supplier?: { name: string; phone?: string };
    employee?: { name: string; phone?: string };
  };
  companyName?: string;
  userName?: string;
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
    result += ' دينار و' + decimalPart + ' درهم';
  } else {
    result += ' دينار';
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

export const GeneralReceiptPrint: React.FC<GeneralReceiptPrintProps> = ({ 
  receipt,
  companyName = 'الشركة',
  userName = '-'
}) => {
  const amountInWords = numberToArabicWords(Number(receipt.amount));
  const isDeposit = receipt.type === 'DEPOSIT';
  
  // تحديد اسم الجهة
  const entityName = receipt.contact?.name || receipt.customer?.name || receipt.supplier?.name || receipt.employee?.name || 'غير محدد';
  const entityPhone = receipt.contact?.phone || receipt.customer?.phone || receipt.supplier?.phone || receipt.employee?.phone;
  const entityType = receipt.contact ? 'جهة اتصال' : receipt.customer ? 'عميل' : receipt.supplier ? 'مورد' : receipt.employee ? 'موظف' : 'غير محدد';

  return (
    <>
      <style>{`
        @media print {
          .print-receipt {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <div className="print-receipt" style={{
        width: '210mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '15mm',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl',
        border: '3px double #333',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* رأس الإيصال */}
        <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #1e40af', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 5px 0', color: '#1e40af' }}>
            {companyName}
          </h1>
          <p style={{ fontSize: '12px', margin: '3px 0', color: '#666' }}>
            اسم المستخدم: {userName}
          </p>
          <h2 style={{
            fontSize: '20px',
            margin: '8px 0 0 0',
            color: 'white',
            backgroundColor: isDeposit ? '#16a34a' : '#dc2626',
            padding: '6px',
            borderRadius: '6px'
          }}>
            {isDeposit ? 'إيصال قبض' : 'إيصال صرف'}
          </h2>
        </div>

        {/* معلومات الإيصال */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: isDeposit ? '#f0fdf4' : '#fee2e2',
          borderRadius: '6px',
          border: `1px solid ${isDeposit ? '#16a34a' : '#dc2626'}`
        }}>
          <div>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>رقم الإيصال:</strong> {receipt.receiptNumber || `#${receipt.id}`}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>التاريخ:</strong> {new Date(receipt.paymentDate).toLocaleDateString('ar-LY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>الوقت:</strong> {new Date(receipt.paymentDate).toLocaleTimeString('ar-LY')}
            </p>
          </div>
        </div>

        {/* معلومات الجهة */}
        <div style={{
          marginBottom: '15px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          border: '1px solid #fbbf24'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>
            {isDeposit ? 'استلمنا من:' : 'دفعنا إلى:'}
          </p>
          <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#1e40af' }}>
            {entityName}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            ({entityType})
          </p>
          {entityPhone && (
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
              الهاتف: {entityPhone}
            </p>
          )}
        </div>

        {/* المبلغ */}
        <div style={{
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          border: '2px solid #1e40af',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#1e40af' }}>
            مبلغ وقدره
          </p>
          <p style={{
            margin: '0 0 15px 0',
            fontSize: '32px',
            fontWeight: 'bold',
            color: isDeposit ? '#16a34a' : '#dc2626',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}>
            {formatArabicCurrency(Number(receipt.amount))}
          </p>
          <div style={{
            padding: '12px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px dashed #1e40af'
          }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#1e40af', fontWeight: 'bold' }}>
              فقط: {amountInWords} لا غير
            </p>
          </div>
        </div>

        {/* السبب/البيان */}
        <div style={{
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #d1d5db'
        }}>
          <p style={{ margin: '0', fontSize: '13px' }}>
            <strong>وذلك عن:</strong> {receipt.description || 'إيصال عام'}
          </p>
          {receipt.notes && (
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
              <strong>ملاحظات:</strong> {receipt.notes}
            </p>
          )}
        </div>

        {/* التوقيعات */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          marginTop: '20px',
          paddingTop: '12px',
          borderTop: '1px solid #ddd'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '2px solid #333', paddingTop: '8px', marginTop: '30px' }}>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>المستلم</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#666' }}>الاسم والتوقيع</p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '2px solid #333', paddingTop: '8px', marginTop: '30px' }}>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>{isDeposit ? 'الدافع' : 'المستلم'}</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#666' }}>الاسم والتوقيع</p>
            </div>
          </div>
        </div>

        {/* الختم */}
        <div style={{
          textAlign: 'center',
          marginTop: '15px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '10px',
          color: '#666'
        }}>
          <p style={{ margin: '2px 0' }}>✓ إيصال {isDeposit ? 'قبض' : 'صرف'} خارجي صحيح</p>
          <p style={{ margin: '2px 0' }}>تم الطباعة بتاريخ: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}</p>
        </div>
      </div>
    </>
  );
};

