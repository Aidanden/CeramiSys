/**
 * مكون طباعة فاتورة المحل
 * Store Invoice Print Component
 */

import React from 'react';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

interface StoreInvoicePrintProps {
    invoice: any;
    storeInfo: any;
}

export const StoreInvoicePrint: React.FC<StoreInvoicePrintProps> = ({
    invoice,
    storeInfo
}) => {
    if (!invoice) return null;

    const total = Number(invoice.total);

    return (
        <div className="print-invoice" style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            backgroundColor: 'white',
            fontFamily: 'Arial, sans-serif',
            direction: 'rtl',
            pageBreakAfter: 'always',
            boxSizing: 'border-box'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                <h1 style={{ fontSize: '24px', margin: '0 0 5px 0', color: '#333' }}>
                    طلب توريد بضاعة
                </h1>
                <p style={{ fontSize: '14px', margin: '3px 0', color: '#666' }}>
                    إلى: شركة التقازي للسيراميك والمواد الصحية
                </p>
                <div style={{ marginTop: '10px', display: 'inline-block', padding: '5px 15px', border: '1px solid #333', borderRadius: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>رقم الفاتورة: </span>
                    <span>{invoice.invoiceNumber || invoice.id}</span>
                </div>
            </div>

            {/* Store & Invoice Info */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
            }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#2563eb', borderBottom: '1px solid #bfdbfe', paddingBottom: '5px' }}>
                        بيانات المحل المرسل
                    </h3>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>اسم المحل:</strong> {storeInfo?.name || '---'}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>صاحب المحل:</strong> {storeInfo?.ownerName || '---'}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>رقم الهاتف:</strong> {storeInfo?.phone1 || '---'}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>العنوان:</strong> {storeInfo?.address || '---'}
                    </p>
                </div>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#2563eb', borderBottom: '1px solid #bfdbfe', paddingBottom: '5px' }}>
                        تفاصيل الفاتورة
                    </h3>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>التاريخ:</strong> {new Date(invoice.createdAt).toLocaleDateString('ar-LY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>الوقت:</strong> {new Date(invoice.createdAt).toLocaleTimeString('ar-LY')}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>الحالة:</strong> {
                            invoice.status === 'APPROVED' ? 'معتمدة' :
                                invoice.status === 'REJECTED' ? 'مرفوضة' : 'قيد الانتظار'
                        }
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '20px',
                fontSize: '12px'
            }}>
                <thead>
                    <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', width: '35px' }}>م</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>الصنف / SKU</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', width: '80px' }}>الكمية</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', width: '90px' }}>إجمالي العبوة</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', width: '100px' }}>السعر</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', width: '110px' }}>المجموع</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.lines?.map((line: any, index: number) => {
                        const unit = line.product?.unit || 'وحدة';
                        let unitPriceLabel = 'قطعة';
                        if (unit === 'صندوق') unitPriceLabel = 'متر';
                        else if (unit === 'لتر') unitPriceLabel = 'لتر';
                        else if (unit === 'كيس') unitPriceLabel = 'كيس';
                        else if (unit === 'متر') unitPriceLabel = 'متر';

                        let totalPackage = '';
                        if (unit === 'صندوق' && line.product?.unitsPerBox) {
                            totalPackage = `${formatArabicNumber(Number(line.qty) * Number(line.product.unitsPerBox))} م²`;
                        } else {
                            totalPackage = `${formatArabicNumber(Number(line.qty))} ${unit}`;
                        }

                        return (
                            <tr key={line.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    {formatArabicNumber(index + 1)}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold' }}>{line.product?.name || '---'}</div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>SKU: {line.product?.sku || '---'}</div>
                                    {line.product?.unit === 'صندوق' && line.product?.unitsPerBox && (
                                        <div style={{ fontSize: '10px', color: '#1e40af', marginTop: '2px' }}>
                                            عبوة الصندوق: {formatArabicNumber(Number(line.product.unitsPerBox))} م²
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    {formatArabicNumber(Number(line.qty))} {unit === 'صندوق' ? 'صندوق' : unit}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>
                                    {totalPackage}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    <div>{formatArabicCurrency(Number(line.unitPrice))}</div>
                                    <div style={{ fontSize: '9px', color: '#64748b' }}>سعر الـ {unitPriceLabel}</div>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                    {formatArabicCurrency(Number(line.subTotal))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '16px' }}>
                        <td colSpan={4} style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                            إجمالي الفاتورة:
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', color: '#1e40af' }}>
                            {formatArabicCurrency(total)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            {/* Notes Section */}
            {invoice.notes && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>ملاحظات:</h4>
                    <p style={{ margin: '0', fontSize: '14px', color: '#1e293b' }}>{invoice.notes}</p>
                </div>
            )}

            {/* Rejection Reason */}
            {invoice.status === 'REJECTED' && invoice.rejectionReason && (
                <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>سبب الرفض:</h4>
                    <p style={{ margin: '0', fontSize: '14px', color: '#991b1b' }}>{invoice.rejectionReason}</p>
                </div>
            )}

            {/* Signatures */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '40px',
                marginTop: '50px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '40px' }}>توقيع المحل</p>
                    <div style={{ borderBottom: '1px dashed #94a3b8', width: '200px', margin: '0 auto' }}></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '40px' }}>توقيع شركة التقازي</p>
                    <div style={{ borderBottom: '1px dashed #94a3b8', width: '200px', margin: '0 auto' }}></div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <p>تعتبر هذه الفاتورة طلب توريد بضاعة من المحل المذكور إلى شركة التقازي.</p>
                <p>تم تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} {new Date().toLocaleTimeString('ar-LY')}</p>
            </div>
        </div>
    );
};
