'use client';

import { useGetCurrentUserQuery, useGetInvoiceStatsQuery } from '@/state/storePortalApi';
import {
    Package,
    TrendingUp,
    AlertCircle,
    Check,
    X,
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <Package className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            مرحباً بك، {currentUser?.store?.name || currentUser?.user?.storeName} 👋
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            نظرة عامة على أداء مبيعاتك وإدارة فواتير طلب التوريد لمحلك
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sales */}
                {showPrices && (
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">إجمالي المبيعات المعتمدة</p>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                                    {Number(stats?.totalAmount || 0).toLocaleString('en-US', { numberingSystem: 'latn' })}
                                    <span className="text-sm mr-1.5 font-medium text-slate-400">د.ل</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Invoices */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">فواتير قيد المراجعة</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-amber-600 transition-colors">
                                {Number(stats?.pendingInvoices || 0).toLocaleString('en-US', { numberingSystem: 'latn' })}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* Approved Invoices */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">فواتير تمت الموافقة</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">
                                {Number(stats?.approvedInvoices || 0).toLocaleString('en-US', { numberingSystem: 'latn' })}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Check size={24} />
                        </div>
                    </div>
                </div>

                {/* Rejected Invoices */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">فواتير مرفوضة</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">
                                {Number(stats?.rejectedInvoices || 0).toLocaleString('en-US', { numberingSystem: 'latn' })}
                            </h3>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <X size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Selling Products */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            الأصناف الأكثر مبيعاً
                        </h3>
                    </div>

                    {stats?.topSelling && stats.topSelling.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">المنتج</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">الكمية المباعة</th>
                                        {showPrices && (
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">إجمالي القيمة</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats.topSelling.map((item: any) => (
                                        <tr key={item.productId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-1">{item.sku}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                                                    {Number(item.totalQty).toLocaleString('en-US', { numberingSystem: 'latn' })}
                                                </span>
                                            </td>
                                            {showPrices && (
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-blue-600">
                                                        {Number(item.totalAmount).toLocaleString('en-US', { numberingSystem: 'latn' })}
                                                        <span className="text-xs mr-1 text-slate-400">د.ل</span>
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Package className="mx-auto text-slate-200 mb-3" size={48} />
                            <p className="text-slate-400 font-medium">لا توجد مبيعات مسجلة حتى الآن</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white px-2">
                        إجراءات سريعة
                    </h2>

                    <Link
                        href="/store-portal/invoices"
                        className="block bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">إدارة الفواتير</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    إنشاء وعرض فواتير التوريد
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/store-portal/products"
                        className="block bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Package size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-purple-600 transition-colors">قائمة المنتجات</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    استعراض الأسعار والمنتجات
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
