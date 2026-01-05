/**
 * Bonuses Report Component
 * مكون تقرير المكافآت
 */

import React from 'react';

interface Employee {
    id: number;
    name: string;
    jobTitle?: string;
    company?: {
        id: number;
        name: string;
        code: string;
    };
}

interface Bonus {
    id: number;
    employeeId: number;
    employee: Employee;
    type: 'BONUS' | 'RAISE' | 'INCENTIVE' | 'OVERTIME';
    typeName: string;
    amount: number;
    reason?: string;
    receiptNumber?: string;
    paymentDate: string;
    notes?: string;
}

interface BonusesReportProps {
    bonuses: Bonus[];
    month?: number;
    year?: number;
    type?: string;
    companyName: string;
    userName: string;
}

const arabicMonths = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const BonusesReport: React.FC<BonusesReportProps> = ({ bonuses, month, year, type, companyName, userName }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ar-LY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-LY');
    };

    const totalAmount = bonuses.reduce((sum, bonus) => sum + Number(bonus.amount), 0);

    const getFilterTitle = () => {
        const parts = [];
        if (month && year) {
            parts.push(`${arabicMonths[month]} ${year}`);
        } else if (year) {
            parts.push(`السنة ${year}`);
        }
        if (type) {
            const typeNames: any = {
                'BONUS': 'مكافآت',
                'RAISE': 'زيادات راتب',
                'INCENTIVE': 'حوافز',
                'OVERTIME': 'بدل إضافي'
            };
            parts.push(typeNames[type] || type);
        }
        return parts.length > 0 ? parts.join(' - ') : 'جميع الفترات';
    };

    return (
        <div style={{
            fontFamily: 'Arial, sans-serif',
            direction: 'rtl',
            padding: '20mm',
            maxWidth: '210mm',
            margin: '0 auto',
            backgroundColor: 'white',
            color: '#000'
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                marginBottom: '20px',
                borderBottom: '3px solid #1e40af',
                paddingBottom: '15px'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#1e40af',
                    margin: '0 0 8px 0'
                }}>
                    {companyName}
                </h1>
                <p style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: '4px 0'
                }}>
                    اسم المستخدم: {userName}
                </p>
                <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#000',
                    margin: '12px 0 0 0'
                }}>
                    تقرير المكافآت والزيادات
                </h2>
                <p style={{
                    fontSize: '16px',
                    color: '#444',
                    margin: '8px 0 0 0'
                }}>
                    {getFilterTitle()}
                </p>
            </div>

            {/* Report Info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '13px'
            }}>
                <div>
                    <strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}
                </div>
                <div>
                    <strong>عدد المكافآت:</strong> {bonuses.length}
                </div>
            </div>

            {/* Bonuses Table */}
            {bonuses.length > 0 ? (
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '25px',
                    fontSize: '13px'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#1e40af',
                            color: 'white'
                        }}>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>اسم الموظف</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>الوظيفة</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>النوع</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>المبلغ (د.ل)</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>التاريخ</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>رقم الإيصال</th>
                            <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>السبب</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bonuses.map((bonus, index) => (
                            <tr key={bonus.id} style={{
                                backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                            }}>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    {index + 1}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {bonus.employee.name}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {bonus.employee.jobTitle || '-'}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {bonus.typeName}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>
                                    {formatCurrency(Number(bonus.amount))}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {formatDate(bonus.paymentDate)}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {bonus.receiptNumber || '-'}
                                </td>
                                <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {bonus.reason || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p style={{ fontSize: '16px', color: '#666' }}>لا توجد مكافآت مسجلة</p>
                </div>
            )}

            {/* Summary */}
            {bonuses.length > 0 && (
                <div style={{
                    backgroundColor: '#e0f2fe',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #1e40af'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1e40af',
                            margin: 0
                        }}>
                            الإجمالي الكلي:
                        </h3>
                        <p style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#16a34a',
                            margin: 0
                        }}>
                            {formatCurrency(totalAmount)} د.ل
                        </p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '2px solid #e5e7eb',
                textAlign: 'center',
                fontSize: '12px',
                color: '#6b7280'
            }}>
                <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة السيراميك</p>
            </div>
        </div>
    );
};

export default BonusesReport;

