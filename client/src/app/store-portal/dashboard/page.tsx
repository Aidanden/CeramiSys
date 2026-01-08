'use client';

import { useGetCurrentUserQuery, useGetInvoiceStatsQuery } from '@/state/storePortalApi';
import {
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Package,
    FileText
} from 'lucide-react';
import Link from 'next/link';

export default function StoreDashboardPage() {
    // جلب بيانات المستخدم الحالي - البيانات تأتي بنفس بنية login response
    const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUserQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const { data: stats, isLoading: isStatsLoading } = useGetInvoiceStatsQuery();
    
    // إعداد إظهار الأسعار
    const showPrices = currentUser?.store?.showPrices === true;
    
    const isLoading = isUserLoading || isStatsLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    مرحباً بك، {currentUser?.store?.name || currentUser?.user?.storeName} 👋
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    هذه لوحة التحكم الخاصة بك لإدارة مبيعاتك وفواتيرك.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Sales */}
                {showPrices && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">إجمالي المبيعات المعتمدة</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {Number(stats?.totalAmount || 0).toLocaleString('en-US')} د.ل
                        </p>
                    </div>
                )}

                {/* Pending Invoices */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                            <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">قيد الانتظار</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats?.pendingInvoices || 0}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">فاتورة بانتظار الموافقة</p>
                </div>

                {/* Approved Invoices */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">تمت الموافقة</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats?.approvedInvoices || 0}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">فاتورة معتمدة</p>
                </div>

                {/* Rejected Invoices */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <XCircle className="text-red-600 dark:text-red-400" size={24} />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">مرفوضة</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats?.rejectedInvoices || 0}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">فاتورة مرفوضة</p>
                </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">الأصناف الأكثر مبيعاً</h2>
                {stats?.topSelling && stats.topSelling.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">المنتج</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">الكمية المباعة</th>
                                    {showPrices && (
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300">إجمالي المبيعات</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stats.topSelling.map((item: any) => (
                                    <tr key={item.productId}>
                                        <td className="px-4 py-2">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.totalQty}</td>
                                        {showPrices && (
                                            <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white">
                                                {Number(item.totalAmount).toLocaleString('en-US')} د.ل
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد مبيعات حتى الآن</p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href="/store-portal/invoices"
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <FileText className="text-blue-600 dark:text-blue-400" size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">إدارة الفواتير</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                إنشاء فواتير جديدة ومتابعة حالة الفواتير السابقة
                            </p>
                        </div>
                    </div>
                </Link>

                <Link
                    href="/store-portal/products"
                    className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-full group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                            <Package className="text-purple-600 dark:text-purple-400" size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">المنتجات المتاحة</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                عرض قائمة المنتجات المخصصة لك وأسعارها
                            </p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
