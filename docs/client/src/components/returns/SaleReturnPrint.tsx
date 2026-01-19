/**
 * مكون طباعة المردود
 * Sale Return Print Component
 */

import React from 'react';
import { SaleReturn } from '@/state/saleReturnApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface SaleReturnPrintProps {
  saleReturn: SaleReturn;
  companyName: string;
  companyCode: string;
}

export const SaleReturnPrint: React.FC<SaleReturnPrintProps> = ({ 
  saleReturn, 
  companyName, 
  companyCode 
}) => {
  return (
    <div className="print-return" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '20mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl',
      pageBreakAfter: 'always'
    }}>
      {/* رأس المردود */}
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#333' }}>
          {companyName}
        </h1>
        <p style={{ fontSize: '14px', margin: '5px 0', color: '#666' }}>
          كود الشركة: {companyCode}
        </p>
        <h2 style={{ fontSize: '24px', margin: '15px 0 0 0', color: '#dc2626' }}>
          فاتورة مردودات
        </h2>
      </div>

      {/* معلومات المردود */}
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
            <strong>رقم المردود:</strong> #{formatArabicNumber(saleReturn.id)}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>رقم الفاتورة الأصلية:</strong> {saleReturn.sale?.invoiceNumber || `#${saleReturn.saleId}`}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>التاريخ:</strong> {new Date(saleReturn.createdAt).toLocaleDateString('ar-LY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>الوقت:</strong> {new Date(saleReturn.createdAt).toLocaleTimeString('ar-LY')}
          </p>
        </div>
        <div>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>العميل:</strong> {saleReturn.customer?.name || '-'}
          </p>
          {saleReturn.customer?.phone && (
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>الهاتف:</strong> {saleReturn.customer.phone}
            </p>
          )}
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>الحالة:</strong> {
              saleReturn.status === 'PENDING' ? 'قيد الانتظار' :
              saleReturn.status === 'APPROVED' ? 'معتمد' : 'مرفوض'
            }
          </p>
          {saleReturn.reason && (
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>السبب:</strong> {saleReturn.reason}
            </p>
          )}
        </div>
      </div>

      {/* جدول الأصناف المردودة */}
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        marginBottom: '30px',
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#dc2626', color: 'white' }}>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>م</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>الصنف</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الكود</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الكمية</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الوحدة</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>السعر</th>
            <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {saleReturn.lines.map((line, index) => {
            const isBox = line.product?.unit === 'صندوق';
            const unitsPerBox = (line.product as any)?.unitsPerBox || 0;
            const totalUnits = isBox && unitsPerBox > 0 ? line.qty * unitsPerBox : 0;

            return (
              <tr key={line.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicNumber(index + 1)}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                  {line.product?.name || 'غير معروف'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {line.product?.sku || '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicNumber(line.qty)}
                  {isBox && totalUnits > 0 && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                      ({formatArabicNumber(totalUnits)} م²)
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {line.product?.unit || 'وحدة'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {formatArabicCurrency(line.unitPrice)}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
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
            <td style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center', color: '#dc2626' }}>
              {formatArabicCurrency(saleReturn.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* معلومات الدفع */}
      <div style={{ 
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#dbeafe',
        borderRadius: '8px',
        border: '1px solid #3b82f6'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1e40af' }}>معلومات الدفع:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px' }}>
          <div>
            <p style={{ margin: '0', color: '#666' }}>إجمالي المردود:</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>
              {formatArabicCurrency(saleReturn.total)}
            </p>
          </div>
          <div>
            <p style={{ margin: '0', color: '#666' }}>المدفوع:</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
              {formatArabicCurrency(saleReturn.paidAmount)}
            </p>
          </div>
          <div>
            <p style={{ margin: '0', color: '#666' }}>المتبقي:</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatArabicCurrency(saleReturn.remainingAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* ملاحظات */}
      {saleReturn.notes && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
          <p style={{ margin: '0', fontSize: '13px', color: '#92400e' }}>
            <strong>ملاحظات:</strong> {saleReturn.notes}
          </p>
        </div>
      )}

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
        <p style={{ margin: '5px 0' }}>فاتورة مردودات صحيحة</p>
        <p style={{ margin: '5px 0' }}>تم الطباعة بتاريخ: {new Date().toLocaleDateString('ar-LY')}</p>
      </div>
    </div>
  );
};
