'use client';

import { useState } from 'react';
import {
    useGetInvoicesQuery,
    useApproveInvoiceMutation,
    useRejectInvoiceMutation,
    useGetInvoiceStatsQuery,
    InvoiceStatus,
} from '@/state/externalStoreInvoicesApi';
import { X, Eye, TrendingUp, FileText, Bell } from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useGetNotificationStatsQuery } from '@/state/notificationsApi';

const CheckCircle = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const Clock = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

const XCircle = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
);

export default function ExternalStoreInvoicesPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data, isLoading, refetch } = useGetInvoicesQuery({
        page,
        limit: 10,
        status: statusFilter || undefined,
    }, {
        pollingInterval: 5000, // تحديث كل 5 ثواني
        refetchOnFocus: true
    });
    const { data: stats } = useGetInvoiceStatsQuery(undefined, {
        pollingInterval: 5000,
        refetchOnFocus: true
    });
    const [approveInvoice] = useApproveInvoiceMutation();
    const [rejectInvoice] = useRejectInvoiceMutation();
    
    // جلب إحصائيات الإشعارات
    const { data: notificationStats } = useGetNotificationStatsQuery(undefined, {
        pollingInterval: 5000
    });

    const handleApprove = async (id: number) => {
        if (confirm('هل أنت متأكد من الموافقة على هذه الفاتورة؟')) {
            try {
                await approveInvoice(id).unwrap();
                refetch();
                setSelectedInvoice(null);
            } catch (error) {
                console.error('Failed to approve invoice:', error);
                alert('فشل في الموافقة على الفاتورة');
            }
        }
    };

    const handleReject = async (id: number) => {
        if (!rejectReason.trim()) {
            alert('يرجى إدخال سبب الرفض');
            return;
        }

        try {
            await rejectInvoice({ id, reason: rejectReason }).unwrap();
            refetch();
            setSelectedInvoice(null);
            setRejectReason('');
        } catch (error) {
            console.error('Failed to reject invoice:', error);
            alert('فشل في رفض الفاتورة');
        }
    };

    const getStatusBadge = (status: InvoiceStatus) => {
        const badges = {
            PENDING: { text: 'في انتظار المعالجة', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
            APPROVED: { text: 'تمت الموافقة', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
            REJECTED: { text: 'مرفوضة', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
        };
        return badges[status];
    };

    const handlePrintIssueOrder = (invoice: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>أمر صرف مخزني - ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; padding: 20px; direction: rtl; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
                    .header h2 { margin: 0; font-size: 18px; color: #666; font-family: sans-serif; }
                    
                    .info-grid { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 20px; 
                        margin-bottom: 30px; 
                        border: 1px solid #ddd;
                        padding: 15px;
                        border-radius: 8px;
                        background-color: #f9f9f9;
                    }
                    .info-item { display: flex; gap: 10px; align-items: center; }
                    .label { font-weight: bold; color: #444; min-width: 100px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th, td { border: 1px solid #000; padding: 12px; text-align: center; }
                    th { bg-color: #f0f0f0; font-weight: bold; font-size: 14px; }
                    
                    .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; padding: 0 40px; }
                    .signature-box { width: 200px; }
                    .signature-line { margin-top: 40px; border-top: 1px solid #000; }
                    
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                        .info-grid { background-color: #fff; border: 1px solid #000; }
                        th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>أمر صرف مخزني</h1>
                    <h2>Warehouse Issue Order</h2>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <span class="label">رقم الإذن:</span>
                        <span>${invoice.invoiceNumber || invoice.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">التاريخ:</span>
                        <span>${new Date(invoice.createdAt).toLocaleDateString('en-US')}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">المحل الطالب:</span>
                        <span>${invoice.store.name}</span>
                    </div>
                     <div class="info-item">
                        <span class="label">المرجع:</span>
                        <span>طلب #${invoice.id}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px">#</th>
                            <th>كود الصنف</th>
                            <th>اسم الصنف</th>
                            <th style="width: 150px">الكمية</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.lines.map((line: any, index: number) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td style="font-family: monospace; font-weight: bold;">${line.product.sku || '-'}</td>
                                <td style="text-align: right;">${line.product.name}</td>
                                <td style="font-weight: bold; font-size: 16px;">${Number(line.qty).toLocaleString('en-US')}</td>
                                <td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div class="signature-box">
                        <div style="font-weight: bold; margin-bottom: 10px;">المستلم</div>
                        <div class="signature-line"></div>
                    </div>
                    <div class="signature-box">
                        <div style="font-weight: bold; margin-bottom: 10px;">أمين المخزن</div>
                        <div class="signature-line"></div>
                    </div>
                    <div class="signature-box">
                        <div style="font-weight: bold; margin-bottom: 10px;">اعتماد المحاسبة</div>
                        <div class="signature-line"></div>
                    </div>
                </div>

                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500); 
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="p-6" dir="rtl">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        إدارة فواتير المحلات الخارجية
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        مراجعة والموافقة على فواتير المحلات
                    </p>
                </div>
                {/* Notifications Dropdown */}
                <div className="flex items-center gap-3">
                    <NotificationDropdown />
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي الفواتير</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
                            </div>
                            <FileText className="text-blue-600" size={32} />
                        </div>
                    </div>

                    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-all ${stats.pendingInvoices > 0 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">في الانتظار</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pendingInvoices}</p>
                            </div>
                            <Clock className="text-yellow-600" size={32} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">موافق عليها</p>
                                <p className="text-2xl font-bold text-green-600">{stats.approvedInvoices}</p>
                            </div>
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي المبيعات</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {Number(stats.totalAmount).toLocaleString('en-US')} د.ل
                                </p>
                            </div>
                            <TrendingUp className="text-blue-600" size={32} />
                        </div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                    <option value="">جميع الحالات</option>
                    <option value="PENDING">في الانتظار</option>
                    <option value="APPROVED">موافق عليها</option>
                    <option value="REJECTED">مرفوضة</option>
                </select>
            </div>

            {/* Invoices Table */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
                </div>
            ) : data?.invoices.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد فواتير</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        رقم الفاتورة
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        المحل
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        الإجمالي
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        الحالة
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        التاريخ
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                        الإجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {data?.invoices.map((invoice) => {
                                    const statusBadge = getStatusBadge(invoice.status);
                                    return (
                                        <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {invoice.invoiceNumber || `#${invoice.id}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {invoice.store.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {Number(invoice.total).toLocaleString('en-US')} د.ل
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}>
                                                    {statusBadge.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(invoice.createdAt).toLocaleDateString('en-US')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => setSelectedInvoice(invoice)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                                >
                                                    <Eye size={16} />
                                                    عرض
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        السابق
                    </button>
                    <span className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                        {page} / {data.pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.pagination.totalPages}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        التالي
                    </button>
                </div>
            )}

            {/* Invoice Details Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    تفاصيل الفاتورة #{selectedInvoice.id}
                                </h2>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Invoice Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">المحل</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.store.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">صاحب المحل</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.store.ownerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">التاريخ</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(selectedInvoice.createdAt).toLocaleString('en-US')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">الحالة</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedInvoice.status).class}`}>
                                        {getStatusBadge(selectedInvoice.status).text}
                                    </span>
                                </div>
                            </div>

                            {/* Invoice Lines */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">الأصناف</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">المنتج</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">الكمية</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">السعر</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {selectedInvoice.lines.map((line: any) => (
                                                <tr key={line.id}>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{line.product.name}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{Number(line.qty).toLocaleString('en-US')}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{Number(line.unitPrice).toLocaleString('en-US')}</td>
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                                        {Number(line.subTotal).toLocaleString('en-US')} د.ل
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">الإجمالي</td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white">
                                                    {Number(selectedInvoice.total).toLocaleString('en-US')} د.ل
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedInvoice.notes && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ملاحظات</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{selectedInvoice.notes}</p>
                                </div>
                            )}

                            {/* Rejection Reason */}
                            {selectedInvoice.status === 'REJECTED' && selectedInvoice.rejectionReason && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">سبب الرفض</h3>
                                    <p className="text-red-700 dark:text-red-300">{selectedInvoice.rejectionReason}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedInvoice.status === 'PENDING' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApprove(selectedInvoice.id)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        >
                                            <CheckCircle size={20} />
                                            الموافقة
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('أدخل سبب الرفض:');
                                                if (reason) {
                                                    setRejectReason(reason);
                                                    handleReject(selectedInvoice.id);
                                                }
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                        >
                                            <XCircle size={20} />
                                            رفض
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedInvoice.status === 'APPROVED' && (
                                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <button
                                        onClick={() => handlePrintIssueOrder(selectedInvoice)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                            <rect x="6" y="14" width="12" height="8"></rect>
                                        </svg>
                                        طباعة أمر صرف مخزني
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
