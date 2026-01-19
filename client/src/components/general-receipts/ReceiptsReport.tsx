/**
 * مكون تقرير الإيصالات الخارجية
 * General Receipts Report Component
 */

import React from 'react';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface ReceiptsReportProps {
  receipts: Array<{
    id: number;
    type: string;
    amount: number;
    description?: string;
    receiptNumber?: string;
    paymentDate: string;
    contact?: { name: string; phone?: string };
    customer?: { name: string; phone?: string };
    supplier?: { name: string; phone?: string };
    employee?: { name: string; phone?: string };
  }>;
  companyName?: string;
  userName?: string;
}

export const ReceiptsReport: React.FC<ReceiptsReportProps> = ({ 
  receipts,
  companyName = 'الشركة',
  userName = '-'
}) => {
  // حساب الإجماليات
  const totalDeposits = receipts.filter(r => r.type === 'DEPOSIT').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalWithdrawals = receipts.filter(r => r.type === 'WITHDRAWAL').reduce((sum, r) => sum + Number(r.amount), 0);
  const netAmount = totalDeposits - totalWithdrawals;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-table {
            page-break-inside: auto;
          }
          .report-row {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
      <div style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl',
        boxSizing: 'border-box'
      }}>
        {/* رأس التقرير */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px', 
          borderBottom: '3px solid #1e40af', 
          paddingBottom: '15px' 
        }}>
          <h1 style={{ fontSize: '26px', margin: '0 0 8px 0', color: '#1e40af' }}>
            {companyName}
          </h1>
          <p style={{ fontSize: '13px', margin: '5px 0', color: '#666' }}>
            اسم المستخدم: {userName}
          </p>
          <h2 style={{
            fontSize: '22px',
            margin: '12px 0 8px 0',
            color: '#1e40af',
            fontWeight: 'bold'
          }}>
            تقرير الإيصالات الخارجية
          </h2>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            عدد العمليات: {receipts.length}
          </p>
        </div>

        {/* جدول الإيصالات */}
        <table className="report-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          fontSize: '11px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>#</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>التاريخ</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>رقم الإيصال</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>الجهة</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right',
                color: '#16a34a'
              }}>قبض (+)</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right',
                color: '#dc2626'
              }}>صرف (-)</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px 4px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>البيان</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt, index) => {
              const entityName = receipt.contact?.name || receipt.customer?.name || receipt.supplier?.name || receipt.employee?.name || '-';
              const entityType = receipt.contact ? 'جهة' : receipt.customer ? 'عميل' : receipt.supplier ? 'مورد' : receipt.employee ? 'موظف' : '';
              
              return (
                <tr key={receipt.id} className="report-row" style={{ 
                  backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' 
                }}>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'center'
                  }}>{index + 1}</td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}>
                    {new Date(receipt.paymentDate).toLocaleDateString('ar-LY')}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right'
                  }}>
                    {receipt.receiptNumber || `#${receipt.id}`}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{entityName}</div>
                    {entityType && <div style={{ fontSize: '9px', color: '#666' }}>({entityType})</div>}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: receipt.type === 'DEPOSIT' ? '#16a34a' : '#666'
                  }}>
                    {receipt.type === 'DEPOSIT' ? formatArabicCurrency(Number(receipt.amount)) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: receipt.type === 'WITHDRAWAL' ? '#dc2626' : '#666'
                  }}>
                    {receipt.type === 'WITHDRAWAL' ? formatArabicCurrency(Number(receipt.amount)) : '-'}
                  </td>
                  <td style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '6px 4px',
                    textAlign: 'right',
                    fontSize: '10px'
                  }}>
                    {receipt.description || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* الإجماليات */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          border: '2px solid #1e40af'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            color: '#1e40af',
            borderBottom: '2px solid #1e40af',
            paddingBottom: '8px'
          }}>
            ملخص التقرير
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>إجمالي المقبوضات</p>
              <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                {formatArabicCurrency(totalDeposits)}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>إجمالي المدفوعات</p>
              <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                {formatArabicCurrency(totalWithdrawals)}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>الصافي</p>
              <p style={{ 
                margin: '0', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: netAmount >= 0 ? '#16a34a' : '#dc2626' 
              }}>
                {formatArabicCurrency(Math.abs(netAmount))}
                {netAmount >= 0 ? ' (فائض)' : ' (عجز)'}
              </p>
            </div>
          </div>
        </div>

        {/* التذييل */}
        <div style={{
          marginTop: '30px',
          paddingTop: '15px',
          borderTop: '1px solid #d1d5db',
          textAlign: 'center',
          fontSize: '10px',
          color: '#666'
        }}>
          <p style={{ margin: '2px 0' }}>✓ هذا التقرير صادر إلكترونياً ولا يحتاج إلى ختم أو توقيع</p>
          <p style={{ margin: '2px 0' }}>نظام إدارة السيراميك - CeramiSys</p>
        </div>
      </div>
    </>
  );
};

