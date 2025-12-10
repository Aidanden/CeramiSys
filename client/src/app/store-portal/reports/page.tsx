'use client';

import { useGetInvoiceStatsQuery, useGetInvoicesQuery } from '@/state/storePortalApi';
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function StoreReportsPage() {
    const { data: stats, isLoading: statsLoading } = useGetInvoiceStatsQuery();
    const { data: invoicesData, isLoading: invoicesLoading } = useGetInvoicesQuery();

    if (statsLoading || invoicesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // حساب المبيعات الشهرية (بسيط)
    const monthlySales = invoicesData?.invoices
        .filter((inv: any) => inv.status === 'APPROVED')
        .reduce((acc: any, inv: any) => {
            const date = new Date(inv.createdAt);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            if (!acc[monthYear]) acc[monthYear] = 0;
            acc[monthYear] += Number(inv.total);
            return acc;
        }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التقارير والإحصائيات</h1>
                <p className="text-gray-600 dark:text-gray-400">نظرة شاملة على أداء مبيعاتك</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {Number(stats?.totalAmount || 0).toLocaleString('ar-EG')} د.ل
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">عدد الفواتير المعتمدة</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats?.approvedInvoices || 0}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">متوسط قيمة الفاتورة</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats?.approvedInvoices > 0
                                    ? (Number(stats.totalAmount) / stats.approvedInvoices).toLocaleString('ar-EG')
                                    : 0} د.ل
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Sales Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    المبيعات الشهرية
                </h2>
                {monthlySales && Object.keys(monthlySales).length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">الشهر</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">إجمالي المبيعات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {Object.entries(monthlySales).map(([month, amount]: [string, any]) => (
                                    <tr key={month}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{month}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                            {Number(amount).toLocaleString('ar-EG')} د.ل
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد بيانات مبيعات</p>
                )}
            </div>

            {/* Top Selling Products (Detailed) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تفاصيل الأصناف الأكثر مبيعاً</h2>
                {stats?.topSelling && stats.topSelling.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">المنتج</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">SKU</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">الكمية المباعة</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">إجمالي الإيرادات</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300">النسبة من الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stats.topSelling.map((item: any) => {
                                    const percentage = stats.totalAmount > 0
                                        ? (item.totalAmount / stats.totalAmount) * 100
                                        : 0;

                                    return (
                                        <tr key={item.productId}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{item.sku}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.totalQty}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                                {Number(item.totalAmount).toLocaleString('ar-EG')} د.ل
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{percentage.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد مبيعات حتى الآن</p>
                )}
            </div>
        </div>
    );
}
