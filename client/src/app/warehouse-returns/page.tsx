'use client';

import React, { useState } from 'react';
import {
    useGetReturnOrdersQuery,
    useUpdateReturnOrderStatusMutation,
    ReturnOrder,
} from '@/state/warehouseApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber } from '@/utils/formatArabicNumbers';

export default function WarehouseReturnsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'CANCELLED' | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [notes, setNotes] = useState('');

    const { success, error: showError } = useToast();

    const {
        data: returnsData,
        isLoading,
        refetch,
    } = useGetReturnOrdersQuery(
        {
            page: currentPage,
            limit: 20,
            status: statusFilter || undefined,
            search: searchTerm || undefined,
        },
        {
            refetchOnMountOrArgChange: true,
        }
    );

    const [updateStatus, { isLoading: isUpdating }] = useUpdateReturnOrderStatusMutation();

    const handleUpdateStatus = async (
        orderId: number,
        newStatus: 'COMPLETED' | 'CANCELLED'
    ) => {
        try {
            await updateStatus({
                id: orderId,
                body: {
                    status: newStatus,
                    notes: notes || undefined,
                },
            }).unwrap();

            success(
                newStatus === 'COMPLETED'
                    ? 'تم استلام المردود وتأكيد المخزون بنجاح'
                    : 'تم إلغاء طلب الاستلام'
            );

            setShowDetailsModal(false);
            setSelectedOrder(null);
            setNotes('');
            refetch();
        } catch (err: any) {
            showError(err?.data?.message || 'حدث خطأ أثناء تحديث حالة الاستلام');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
            case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
            case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
            default: return 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'في انتظار الاستلام';
            case 'COMPLETED': return 'تم الاستلام';
            case 'CANCELLED': return 'ملغي';
            default: return status;
        }
    };

    return (
        <div className="p-6 w-full mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary">استلام المردودات</h1>
                            <p className="text-text-secondary">إدارة استلام البضائع المردودة إلى المخلف</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-surface-primary p-6 rounded-lg shadow-sm border border-slate-200 dark:border-border-primary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">بحث برقم المردود أو العميل</label>
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الحالة</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                        >
                            <option value="">جميع الحالات</option>
                            <option value="PENDING">معلق</option>
                            <option value="COMPLETED">تم الاستلام</option>
                            <option value="CANCELLED">ملغي</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-surface-primary rounded-lg shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-full text-right">
                        <thead className="bg-gray-50 dark:bg-surface-secondary">
                            <tr>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary w-32">رقم المردود</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary w-32">الفاتورة الأصلية</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary min-w-[200px]">العميل</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary w-32">الحالة</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary w-32">التاريخ</th>
                                <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-text-tertiary min-w-[150px]">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border-primary bg-white dark:bg-surface-primary">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-text-tertiary">جاري التحميل...</td></tr>
                            ) : returnsData?.data?.returnOrders?.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-surface-hover">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-text-primary">
                                        {order.saleReturn?.returnNumber || `#${order.saleReturnId}`}
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-text-primary">
                                        {order.saleReturn?.sale?.invoiceNumber || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-text-primary break-words">
                                        {order.saleReturn?.customer?.name || 'غير محدد'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-text-primary">
                                        {new Date(order.createdAt).toLocaleDateString('ar-LY')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                                        >
                                            عرض وتأكيد
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 bg-gray-600 dark:bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border border-slate-200 dark:border-border-primary w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-surface-primary">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold dark:text-text-primary">تفاصيل مردود المبيعات</h3>
                            <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-primary">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-text-secondary">رقم المردود</p>
                                <p className="font-bold dark:text-text-primary">{selectedOrder.saleReturn?.returnNumber || `#${selectedOrder.saleReturnId}`}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-text-secondary">العميل</p>
                                <p className="font-bold dark:text-text-primary">{selectedOrder.saleReturn?.customer?.name || 'غير محدد'}</p>
                            </div>
                        </div>

                        <h4 className="font-bold mb-3 dark:text-text-primary">الأصناف المردودة:</h4>
                        <div className="border border-slate-200 dark:border-border-primary rounded-lg overflow-hidden mb-6">
                            <table className="w-full text-right">
                                <thead className="bg-blue-50 dark:bg-blue-900/20">
                                    <tr>
                                        <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الصنف</th>
                                        <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الكود</th>
                                        <th className="px-4 py-2 border-b border-slate-200 dark:border-border-primary dark:text-text-secondary">الكمية</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-surface-primary">
                                    {selectedOrder.saleReturn?.lines?.map((line) => (
                                        <tr key={line.id} className="border-b border-slate-200 dark:border-border-primary">
                                            <td className="px-4 py-2 dark:text-text-primary">{line.product?.name}</td>
                                            <td className="px-4 py-2 font-mono dark:text-text-secondary">{line.product?.sku}</td>
                                            <td className="px-4 py-2 font-bold text-blue-600 dark:text-blue-400">
                                                {formatArabicNumber(Number(line.qty))} {line.product?.unit || 'صندوق'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">ملاحظات المخزن</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                placeholder="أضف ملاحظات عند الاستلام..."
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-gray-300 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-hover transition-colors">إلغاء</button>
                            {selectedOrder.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        تأكيد الاستلام
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        رفض الاستلام
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
