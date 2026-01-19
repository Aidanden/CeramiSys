/**
 * مكون تقرير المرتبات الشهري
 * Monthly Payroll Report Component
 */

import React from 'react';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface PayrollReportProps {
  month: number;
  year: number;
  payments: Array<{
    id: number;
    employeeId: number;
    employee?: {
      id: number;
      name: string;
      jobTitle?: string;
      baseSalary: number;
    };
    amount: number;
    type: 'PARTIAL' | 'FINAL';
    paymentDate: string;
    receiptNumber?: string;
    notes?: string;
  }>;
  bonuses?: Array<{
    id: number;
    employeeId: number;
    employee?: {
      id: number;
      name: string;
      jobTitle?: string;
    };
    type: string;
    amount: number;
    reason?: string;
    effectiveDate: string;
  }>;
  companyName?: string;
  userName?: string;
}

// أسماء الأشهر العربية
const arabicMonths = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// ترجمة أنواع العمليات
const translateType = (type: string) => {
  const types: { [key: string]: string } = {
    'PARTIAL': 'سلفة',
    'FINAL': 'راتب كامل',
    'BONUS': 'مكافأة',
    'RAISE': 'زيادة راتب',
    'INCENTIVE': 'حافز',
    'OVERTIME': 'بدل إضافي'
  };
  return types[type] || type;
};

export const PayrollMonthlyReport: React.FC<PayrollReportProps> = ({ 
  month,
  year,
  payments,
  bonuses = [],
  companyName = 'الشركة',
  userName = '-'
}) => {
  // تجميع البيانات حسب الموظف
  const employeeData: { [key: number]: any } = {};

  // معالجة المدفوعات
  payments.forEach(payment => {
    if (!employeeData[payment.employeeId]) {
      employeeData[payment.employeeId] = {
        id: payment.employeeId,
        name: payment.employee?.name || 'غير محدد',
        jobTitle: payment.employee?.jobTitle || '-',
        baseSalary: payment.employee?.baseSalary || 0,
        salaries: [],
        advances: [],
        bonuses: [],
        totalSalaries: 0,
        totalAdvances: 0,
        totalBonuses: 0
      };
    }
    
    if (payment.type === 'FINAL') {
      employeeData[payment.employeeId].salaries.push(payment);
      employeeData[payment.employeeId].totalSalaries += Number(payment.amount);
    } else {
      employeeData[payment.employeeId].advances.push(payment);
      employeeData[payment.employeeId].totalAdvances += Number(payment.amount);
    }
  });

  // معالجة المكافآت
  bonuses.forEach(bonus => {
    if (!employeeData[bonus.employeeId]) {
      employeeData[bonus.employeeId] = {
        id: bonus.employeeId,
        name: bonus.employee?.name || 'غير محدد',
        jobTitle: bonus.employee?.jobTitle || '-',
        baseSalary: 0,
        salaries: [],
        advances: [],
        bonuses: [],
        totalSalaries: 0,
        totalAdvances: 0,
        totalBonuses: 0
      };
    }
    
    employeeData[bonus.employeeId].bonuses.push(bonus);
    employeeData[bonus.employeeId].totalBonuses += Number(bonus.amount);
  });

  const employees = Object.values(employeeData);

  // حساب الإجماليات
  const grandTotalSalaries = employees.reduce((sum, emp: any) => sum + emp.totalSalaries, 0);
  const grandTotalAdvances = employees.reduce((sum, emp: any) => sum + emp.totalAdvances, 0);
  const grandTotalBonuses = employees.reduce((sum, emp: any) => sum + emp.totalBonuses, 0);
  const grandTotal = grandTotalSalaries + grandTotalAdvances + grandTotalBonuses;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
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
        width: '297mm',
        minHeight: '210mm',
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
          borderBottom: '3px solid #1e40af', 
          paddingBottom: '15px' 
        }}>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#1e40af' }}>
            {companyName}
          </h1>
          <p style={{ fontSize: '13px', margin: '5px 0', color: '#666' }}>
            اسم المستخدم: {userName}
          </p>
          <h2 style={{
            fontSize: '24px',
            margin: '12px 0 8px 0',
            color: '#1e40af',
            fontWeight: 'bold'
          }}>
            تقرير المرتبات الشهري
          </h2>
          <p style={{ fontSize: '16px', color: '#666', margin: '8px 0', fontWeight: 'bold' }}>
            {arabicMonths[month]} {year}
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}
          </p>
          <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
            عدد الموظفين: {employees.length}
          </p>
        </div>

        {/* ملخص سريع */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          border: '2px solid #1e40af'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>إجمالي الرواتب</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>
              {formatArabicCurrency(grandTotalSalaries)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>إجمالي السلف</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>
              {formatArabicCurrency(grandTotalAdvances)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>إجمالي المكافآت</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
              {formatArabicCurrency(grandTotalBonuses)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#666' }}>الإجمالي الكلي</p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#1e40af' }}>
              {formatArabicCurrency(grandTotal)}
            </p>
          </div>
        </div>

        {/* جدول الموظفين */}
        <table className="report-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          fontSize: '10px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>#</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>الموظف</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>المسمى الوظيفي</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right',
                color: '#d1fae5'
              }}>الرواتب</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right',
                color: '#fef3c7'
              }}>السلف</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right',
                color: '#dbeafe'
              }}>المكافآت</th>
              <th style={{ 
                border: '1px solid #1e40af', 
                padding: '10px 6px', 
                fontWeight: 'bold',
                textAlign: 'right'
              }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee: any, index) => (
              <tr key={employee.id} className="report-row" style={{ 
                backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' 
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
                  fontWeight: 'bold'
                }}>
                  {employee.name}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  color: '#666'
                }}>
                  {employee.jobTitle}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: '#16a34a',
                  backgroundColor: employee.totalSalaries > 0 ? '#f0fdf4' : 'transparent'
                }}>
                  {employee.totalSalaries > 0 ? formatArabicCurrency(employee.totalSalaries) : '-'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: '#f59e0b',
                  backgroundColor: employee.totalAdvances > 0 ? '#fffbeb' : 'transparent'
                }}>
                  {employee.totalAdvances > 0 ? formatArabicCurrency(employee.totalAdvances) : '-'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  backgroundColor: employee.totalBonuses > 0 ? '#eff6ff' : 'transparent'
                }}>
                  {employee.totalBonuses > 0 ? formatArabicCurrency(employee.totalBonuses) : '-'}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px 6px',
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: '#1e40af',
                  backgroundColor: '#eff6ff'
                }}>
                  {formatArabicCurrency(employee.totalSalaries + employee.totalAdvances + employee.totalBonuses)}
                </td>
              </tr>
            ))}
            
            {/* صف الإجماليات */}
            <tr style={{ backgroundColor: '#1e40af', color: 'white', fontWeight: 'bold' }}>
              <td colSpan={3} style={{ 
                border: '2px solid #1e40af', 
                padding: '10px 6px',
                textAlign: 'center',
                fontSize: '11px'
              }}>
                الإجمالي الكلي
              </td>
              <td style={{ 
                border: '2px solid #1e40af', 
                padding: '10px 6px',
                textAlign: 'right',
                fontSize: '11px'
              }}>
                {formatArabicCurrency(grandTotalSalaries)}
              </td>
              <td style={{ 
                border: '2px solid #1e40af', 
                padding: '10px 6px',
                textAlign: 'right',
                fontSize: '11px'
              }}>
                {formatArabicCurrency(grandTotalAdvances)}
              </td>
              <td style={{ 
                border: '2px solid #1e40af', 
                padding: '10px 6px',
                textAlign: 'right',
                fontSize: '11px'
              }}>
                {formatArabicCurrency(grandTotalBonuses)}
              </td>
              <td style={{ 
                border: '2px solid #1e40af', 
                padding: '10px 6px',
                textAlign: 'right',
                fontSize: '12px'
              }}>
                {formatArabicCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

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




