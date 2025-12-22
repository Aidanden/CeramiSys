/**
 * مكون طباعة الفاتورة
 * Invoice Print Component
 */

import React from 'react';
import { Sale } from '@/state/salesApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface InvoicePrintProps {
  sale: Sale;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({ sale }) => {
  // حساب الإجمالي
  const total = sale.lines.reduce((sum, line) => sum + line.subTotal, 0);

  return (
    <div className="print-invoice" style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl',
      pageBreakAfter: 'always'
    }}>
      {/* رأس الفاتورة */}
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#333' }}>
          {sale.company.name}
        </h1>
        <p style={{ fontSize: '14px', margin: '5px 0', color: '#666' }}>
          كود الشركة: {sale.company.code}
        </p>
        <h2 style={{ fontSize: '24px', margin: '15px 0 0 0', color: '#2563eb' }}>
          فاتورة مبيعات
        </h2>
      </div>

      {/* معلومات الفاتورة */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>رقم الفاتورة:</strong> {sale.invoiceNumber || sale.id}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>التاريخ:</strong> {new Date(sale.createdAt).toLocaleDateString('ar-LY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>الوقت:</strong> {new Date(sale.createdAt).toLocaleTimeString('ar-LY')}
          </p>
        </div>
        <div>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>العميل:</strong> {sale.customer?.name || 'عميل نقدي'}
          </p>
          {sale.customer?.phone && (
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>الهاتف:</strong> {sale.customer.phone}
            </p>
          )}
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>نوع البيع:</strong> {sale.saleType === 'CASH' ? 'نقدي' : 'آجل'}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>طريقة الدفع:</strong> {
              sale.paymentMethod === 'CASH' ? 'كاش' :
                sale.paymentMethod === 'BANK' ? 'حوالة بنكية' : 'بطاقة'
            }
          </p>
        </div>
      </div>

      {/* جدول الأصناف */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '30px',
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>م</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>الصنف</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الكود</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الكمية</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الكمية (متر)</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>سعر الوحدة</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line, index) => {
            // حساب الأمتار المربعة وسعر المتر للأصناف بوحدة صندوق
            const isBox = line.product?.unit === 'صندوق';
            const unitsPerBox = line.product?.unitsPerBox ? Number(line.product.unitsPerBox) : null;

            // السعر: إذا صندوق نعرض سعر المتر، وإلا نعرض سعر الوحدة
            const displayPrice = isBox && unitsPerBox ? line.unitPrice / unitsPerBox : line.unitPrice;

            return (
              <tr key={line.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicNumber(index + 1)}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                  <div>{line.product?.name || 'غير معروف'}</div>
                  {isBox && unitsPerBox && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                      ({formatArabicNumber(unitsPerBox)} م²/صندوق)
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {line.product?.sku || '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#2563eb' }}>
                    {formatArabicNumber(line.qty)} {line.product?.unit || 'وحدة'}
                  </div>
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {isBox && unitsPerBox ? (
                    <div style={{ fontWeight: 'bold', color: '#2563eb' }}>
                      {formatArabicNumber((line.qty * unitsPerBox).toFixed(2))} م²
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {formatArabicCurrency(displayPrice)}
                  </div>
                  {isBox && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      /م²
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>
                  {formatArabicCurrency(line.subTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '16px' }}>
            <td colSpan={6} style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'left' }}>
              المجموع الإجمالي
            </td>
            <td style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center', color: '#1e40af' }}>
              {formatArabicCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ملاحظات */}
      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #3b82f6' }}>
        <p style={{ margin: '0', fontSize: '13px', color: '#1e40af' }}>
          <strong>ملاحظة:</strong> الأصناف المباعة بالصندوق تم عرضها بالأمتار المربعة (م²) مع سعر المتر للوضوح. تفاصيل الصناديق موضحة تحت اسم الصنف.
        </p>
      </div>

      {/* التوقيعات */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '30px',
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #ddd'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #333', paddingTop: '10px', marginTop: '40px' }}>
            <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>المحاسب</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #333', paddingTop: '10px', marginTop: '40px' }}>
            <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>المدير</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #333', paddingTop: '10px', marginTop: '40px' }}>
            <p style={{ margin: '0', fontSize: '13px', fontWeight: 'bold' }}>العميل</p>
          </div>
        </div>
      </div>

      {/* الختم */}
      <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <p style={{ margin: '5px 0' }}>شكراً لتعاملكم معنا</p>
        <p style={{ margin: '5px 0' }}>تم الطباعة بتاريخ: {new Date().toLocaleDateString('ar-LY')}</p>
      </div>
    </div>
  );
};
