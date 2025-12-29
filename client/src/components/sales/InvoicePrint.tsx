/**
 * مكون طباعة الفاتورة
 * Invoice Print Component
 */

import React from 'react';
import { Sale } from '@/state/salesApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface InvoicePrintProps {
  sale: Sale;
  enableLineDiscount?: boolean;
  enableInvoiceDiscount?: boolean;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({
  sale,
  enableLineDiscount = true,
  enableInvoiceDiscount = true
}) => {
  // حساب المجموع الفرعي للبنود
  const subTotal = sale.lines.reduce((sum, line) => sum + Number(line.subTotal), 0);
  const total = Number(sale.total);

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
        fontSize: '11px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>م</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>الصنف/الكود</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>الكمية</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>الكمية (متر)</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>سعر الوحدة</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>المجموع الجمالي</th>
            {enableLineDiscount && <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>الخصم</th>}
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>الصافي</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line, index) => {
            const isBox = line.product?.unit === 'صندوق';
            const unitsPerBox = line.product?.unitsPerBox ? Number(line.product.unitsPerBox) : null;
            const displayPrice = isBox && unitsPerBox ? line.unitPrice / unitsPerBox : line.unitPrice;

            // حساب الإجمالي قبل الخصم
            const lineBaseTotal = isBox && unitsPerBox
              ? line.qty * unitsPerBox * displayPrice
              : line.qty * displayPrice;

            return (
              <tr key={line.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicNumber(index + 1)}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>{line.product?.name || 'غير معروف'}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>ID: {line.product?.sku || '-'}</div>
                  {isBox && unitsPerBox && (
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                      ({formatArabicNumber(unitsPerBox)} م²/صندوق)
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicNumber(line.qty)} {line.product?.unit || 'وحدة'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {isBox && unitsPerBox ? (
                    <div style={{ fontWeight: 'bold' }}>
                      {formatArabicNumber((line.qty * unitsPerBox).toFixed(2))} م²
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <div>{formatArabicCurrency(displayPrice)}</div>
                  {isBox && <div style={{ fontSize: '9px', color: '#666' }}>/م²</div>}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicCurrency(lineBaseTotal)}
                </td>
                {enableLineDiscount && (
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', color: '#dc2626' }}>
                    {line.discountAmount && line.discountAmount > 0 ? (
                      <>
                        <div>{formatArabicCurrency(line.discountAmount)}</div>
                        <div style={{ fontSize: '9px' }}>({formatArabicNumber(line.discountPercentage || 0)}%)</div>
                      </>
                    ) : '-'}
                  </td>
                )}
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#1e40af' }}>
                  {formatArabicCurrency(line.subTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 'normal', fontSize: '13px', color: '#666' }}>
            <td colSpan={enableLineDiscount ? 7 : 6} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
              المجموع الفرعي (قبل خصم الفاتورة)
            </td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
              {formatArabicCurrency(subTotal)}
            </td>
          </tr>
          {enableInvoiceDiscount && sale.totalDiscountAmount && Number(sale.totalDiscountAmount) > 0 ? (
            <tr style={{ fontWeight: 'normal', fontSize: '13px', color: '#dc2626' }}>
              <td colSpan={enableLineDiscount ? 7 : 6} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>
                خصم إجمالي الفاتورة ({formatArabicNumber(Number(sale.totalDiscountPercentage || 0))}%)
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                -{formatArabicCurrency(Number(sale.totalDiscountAmount))}
              </td>
            </tr>
          ) : null}
          <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold', fontSize: '14px' }}>
            <td colSpan={enableLineDiscount ? 7 : 6} style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
              الصافي النهائي (المطالب بدفعه)
            </td>
            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', color: '#1e40af' }}>
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
