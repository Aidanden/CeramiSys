/**
 * مكون تقرير المصروفات المعدومة الشهري
 * Monthly Bad Debt Report Component
 */

import React from 'react';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface BadDebtReportProps {
  expenses: Array<{
    id: number;
    categoryId: number;
    category?: {
      id: number;
      name: string;
    };
    amount: number;
    description?: string;
    receiptNumber?: string;
    paymentDate: string;
    notes?: string;
    createdBy?: string;
  }>;
  startDate?: string;
  endDate?: string;
  categoryName?: string;
  companyName?: string;
  userName?: string;
  totalAmount?: number;
}

// أسماء الأشهر العربية
const arabicMonths = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const BadDebtMonthlyReport: React.FC<BadDebtReportProps> = ({ 
  expenses,
  startDate,
  endDate,
  categoryName,
  companyName = 'الشركة',
  userName = '-',
  totalAmount
}) => {
  // تجميع البيانات حسب البند
  const categoryData: { [key: number]: any } = {};

  expenses.forEach(expense => {
    const catId = expense.categoryId;
    if (!categoryData[catId]) {
      categoryData[catId] = {
        id: catId,
        name: expense.category?.name || 'غير محدد',
        expenses: [],
        total: 0
      };
    }
    categoryData[catId].expenses.push(expense);
    categoryData[catId].total += Number(expense.amount);
  });

  const categories = Object.values(categoryData);

  // حساب الإجمالي الكلي
  const grandTotal = totalAmount || expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // عنوان الفترة
  const getPeriodTitle = () => {
    if (startDate && endDate) {
      return `من ${formatDate(startDate)} إلى ${formatDate(endDate)}`;
    }
    return 'جميع الفترات';
  };

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
        padding: '15mm',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl',
        boxSizing: 'border-box'
      }}>
        {/* رأس التقرير */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px', 
          borderBottom: '3px solid #dc2626', 
          paddingBottom: '15px' 
        }}>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#dc2626' }}>
            {companyName}
          </h1>
          <p style={{ fontSize: '13px', margin: '5px 0', color: '#666' }}>
            اسم المستخدم: {userName}
          </p>
          <h2 style={{
            fontSize: '24px',
            margin: '12px 0 8px 0',
            color: '#dc2626',
            fontWeight: 'bold'
          }}>
            تقرير المصروفات المعدومة
          </h2>
          {categoryName && (
            <p style={{ fontSize: '16px', color: '#666', margin: '8px 0', fontWeight: 'bold' }}>
              البند: {categoryName}
            </p>
          )}
          <p style={{ fontSize: '14px', color: '#666', margin: '8px 0' }}>
            {getPeriodTitle()}
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            عدد العمليات: {expenses.length}
          </p>
        </div>

        {/* ملخص سريع */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          border: '2px solid #dc2626'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>عدد البنود</p>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
              {categories.length}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>عدد العمليات</p>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
              {expenses.length}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>الإجمالي الكلي</p>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatArabicCurrency(grandTotal)}
            </p>
          </div>
        </div>

        {/* جدول المصروفات */}
        <table className="report-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          fontSize: '11px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#dc2626', color: 'white' }}>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'center',
                width: '40px'
              }}>#</th>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>رقم الإيصال</th>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>البند</th>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>الوصف</th>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>التاريخ</th>
              <th style={{ 
                border: '1px solid #dc2626', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, index) => (
              <tr key={expense.id} className="report-row" style={{ 
                backgroundColor: index % 2 === 0 ? 'white' : '#fef2f2' 
              }}>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'center'
                }}>{index + 1}</td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontSize: '10px'
                }}>
                  {expense.receiptNumber || '-'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>
                  {expense.category?.name || 'غير محدد'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  color: '#666',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {expense.description || '-'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right'
                }}>
                  {new Date(expense.paymentDate).toLocaleDateString('ar-LY')}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: '#dc2626'
                }}>
                  {formatArabicCurrency(expense.amount)}
                </td>
              </tr>
            ))}
            
            {/* صف الإجمالي */}
            <tr style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold' }}>
              <td colSpan={5} style={{ 
                border: '2px solid #dc2626', 
                padding: '10px 6px',
                textAlign: 'center',
                fontSize: '12px'
              }}>
                الإجمالي الكلي
              </td>
              <td style={{ 
                border: '2px solid #dc2626', 
                padding: '10px 6px',
                textAlign: 'right',
                fontSize: '14px'
              }}>
                {formatArabicCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ملخص حسب البند */}
        {categories.length > 1 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ 
              fontSize: '14px', 
              marginBottom: '10px', 
              color: '#dc2626',
              borderBottom: '1px solid #dc2626',
              paddingBottom: '5px'
            }}>
              ملخص حسب البند
            </h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#fef2f2' }}>
                  <th style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '8px 6px', 
                    textAlign: 'right'
                  }}>البند</th>
                  <th style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '8px 6px', 
                    textAlign: 'center'
                  }}>عدد العمليات</th>
                  <th style={{ 
                    border: '1px solid #d1d5db', 
                    padding: '8px 6px', 
                    textAlign: 'right'
                  }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {categories.sort((a: any, b: any) => b.total - a.total).map((cat: any) => (
                  <tr key={cat.id}>
                    <td style={{ 
                      border: '1px solid #d1d5db', 
                      padding: '6px',
                      fontWeight: 'bold'
                    }}>{cat.name}</td>
                    <td style={{ 
                      border: '1px solid #d1d5db', 
                      padding: '6px',
                      textAlign: 'center'
                    }}>{cat.expenses.length}</td>
                    <td style={{ 
                      border: '1px solid #d1d5db', 
                      padding: '6px',
                      fontWeight: 'bold',
                      color: '#dc2626'
                    }}>{formatArabicCurrency(cat.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

export default BadDebtMonthlyReport;

