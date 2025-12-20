'use client';

/**
 * صفحة المصروفات المعدومة
 * Bad Debts / Write-offs Management Page
 */

import React, { useState } from 'react';
import {
    useGetCategoriesQuery,
    useGetCategoryQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
    usePayBadDebtMutation,
    useGetExpensesQuery,
    useGetBadDebtStatsQuery,
    useGetMonthlyReportQuery,
    BadDebtCategory,
    BadDebtExpense,
} from '@/state/badDebtApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { Folder, Calendar, BarChart3, TrendingUp } from 'lucide-react';

interface MainStatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    iconBgColor: string;
}

const MainStatCard = ({ title, value, subtitle, icon: Icon, iconBgColor }: MainStatCardProps) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>
        </div>
    );
};

// تنسيق العملة
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 2
    }).format(amount);
};

// أسماء الأشهر العربية
const arabicMonths = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function BadDebtsPage() {
    // State
    const [activeTab, setActiveTab] = useState<'categories' | 'expenses' | 'stats'>('categories');
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BadDebtCategory | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<BadDebtCategory | null>(null);

    // Expenses filter
    const [expensesCategoryId, setExpensesCategoryId] = useState<number | undefined>();
    const [expensesPage, setExpensesPage] = useState(1);
    const currentYear = new Date().getFullYear();

    // Form state
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: ''
    });

    const [payForm, setPayForm] = useState({
        amount: '',
        description: '',
        treasuryId: '',
        notes: ''
    });

    // Queries
    const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useGetCategoriesQuery({
        companyId: selectedCompanyId,
        isActive: true,
        search: searchTerm || undefined
    });

    const { data: expensesData, isLoading: expensesLoading } = useGetExpensesQuery({
        categoryId: expensesCategoryId,
        page: expensesPage,
        limit: 20
    });

    const { data: statsData } = useGetBadDebtStatsQuery({
        companyId: selectedCompanyId,
        year: currentYear
    });

    const { data: monthlyReportData } = useGetMonthlyReportQuery({
        year: currentYear,
        companyId: selectedCompanyId
    });

    const { data: treasuriesData } = useGetTreasuriesQuery({});
    const { data: companiesData } = useGetCompaniesQuery({});

    // Mutations
    const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
    const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
    const [deleteCategory] = useDeleteCategoryMutation();
    const [payBadDebt, { isLoading: paying }] = usePayBadDebtMutation();

    const categories = categoriesData?.data || [];
    const expenses = expensesData?.data?.expenses || [];
    const pagination = expensesData?.data?.pagination;
    const treasuries = treasuriesData || [];
    const companies = companiesData?.data?.companies || [];
    const stats = statsData?.data;
    const monthlyReport = monthlyReportData?.data || [];

    // Handlers
    const handleCreateCategory = async () => {
        try {
            await createCategory({
                name: categoryForm.name,
                description: categoryForm.description || undefined,
                companyId: selectedCompanyId
            }).unwrap();

            setShowCategoryModal(false);
            resetCategoryForm();
            refetchCategories();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء إنشاء البند');
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory) return;

        try {
            await updateCategory({
                id: editingCategory.id,
                data: {
                    name: categoryForm.name,
                    description: categoryForm.description || undefined
                }
            }).unwrap();

            setShowCategoryModal(false);
            setEditingCategory(null);
            resetCategoryForm();
            refetchCategories();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء تحديث البند');
        }
    };

    const handleDeleteCategory = async (category: BadDebtCategory) => {
        if (!confirm(`هل أنت متأكد من حذف البند "${category.name}"؟`)) return;

        try {
            const result = await deleteCategory(category.id).unwrap();
            alert(result.message);
            refetchCategories();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء حذف البند');
        }
    };

    const handlePayBadDebt = async () => {
        if (!selectedCategory || !payForm.treasuryId || !payForm.amount) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        try {
            await payBadDebt({
                categoryId: selectedCategory.id,
                amount: parseFloat(payForm.amount),
                description: payForm.description || undefined,
                treasuryId: parseInt(payForm.treasuryId),
                notes: payForm.notes || undefined
            }).unwrap();

            setShowPayModal(false);
            setSelectedCategory(null);
            resetPayForm();
            refetchCategories();
            alert('تم صرف المصروف بنجاح');
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء صرف المصروف');
        }
    };

    const resetCategoryForm = () => {
        setCategoryForm({
            name: '',
            description: ''
        });
    };

    const resetPayForm = () => {
        setPayForm({
            amount: '',
            description: '',
            treasuryId: '',
            notes: ''
        });
    };

    const openEditModal = (category: BadDebtCategory) => {
        setEditingCategory(category);
        setCategoryForm({
            name: category.name,
            description: category.description || ''
        });
        setShowCategoryModal(true);
    };

    const openPayModal = (category: BadDebtCategory) => {
        setSelectedCategory(category);
        setShowPayModal(true);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 المصروفات المعدومة</h1>
                <p className="text-gray-600">إدارة بنود المصروفات المعدومة وصرفها</p>
            </div>

            {/* Company Filter */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">جميع الشركات</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MainStatCard
                        title="البنود النشطة"
                        value={stats.totalActiveCategories.toString()}
                        icon={Folder}
                        iconBgColor="bg-blue-500"
                    />
                    <MainStatCard
                        title="مصروفات هذا الشهر"
                        value={formatCurrency(stats.thisMonth.totalAmount)}
                        subtitle={`${stats.thisMonth.count} عملية`}
                        icon={Calendar}
                        iconBgColor="bg-red-500"
                    />
                    <MainStatCard
                        title="إجمالي هذا العام"
                        value={formatCurrency(stats.thisYear.totalAmount)}
                        subtitle={`${stats.thisYear.count} عملية`}
                        icon={BarChart3}
                        iconBgColor="bg-purple-500"
                    />
                    <MainStatCard
                        title="أعلى بند"
                        value={stats.topCategories[0]?.categoryName || '-'}
                        subtitle={stats.topCategories[0] ? formatCurrency(stats.topCategories[0].totalAmount) : undefined}
                        icon={TrendingUp}
                        iconBgColor="bg-orange-500"
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md mb-6">
                <div className="border-b border-gray-200">
                    <div className="flex">
                        {[
                            { key: 'categories', label: '📁 بنود المصروفات' },
                            { key: 'expenses', label: '💸 سجل المصروفات' },
                            { key: 'stats', label: '📊 الإحصائيات' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-6 py-4 font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Categories Tab */}
                    {activeTab === 'categories' && (
                        <div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        placeholder="🔍 بحث عن بند..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg w-64"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        resetCategoryForm();
                                        setEditingCategory(null);
                                        setShowCategoryModal(true);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    ➕ إضافة بند
                                </button>
                            </div>

                            {/* Categories Table */}
                            {categoriesLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">لا يوجد بنود مصروفات</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">اسم البند</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الوصف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">إجمالي المصروفات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">عدد العمليات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {categories.map(category => (
                                                <tr key={category.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900">{category.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 text-sm">{category.description || '-'}</td>
                                                    <td className="px-4 py-3 font-semibold text-red-600">
                                                        {formatCurrency(category.totalExpenses || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{category.expensesCount || 0}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openPayModal(category)}
                                                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                                                title="صرف مصروف"
                                                            >
                                                                💸
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(category)}
                                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                                                title="تعديل"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(category)}
                                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                                                                title="حذف"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expenses Tab */}
                    {activeTab === 'expenses' && (
                        <div>
                            {/* Filters */}
                            <div className="flex gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">البند</label>
                                    <select
                                        value={expensesCategoryId || ''}
                                        onChange={(e) => setExpensesCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">جميع البنود</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Expenses Table */}
                            {expensesLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : expenses.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">لا يوجد مصروفات</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">رقم الإيصال</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">البند</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">المبلغ</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الوصف</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">التاريخ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {expenses.map(expense => (
                                                    <tr key={expense.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{expense.receiptNumber}</td>
                                                        <td className="px-4 py-3 font-medium text-gray-900">{expense.category?.name}</td>
                                                        <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                                                        <td className="px-4 py-3 text-gray-600 text-sm">{expense.description || '-'}</td>
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {new Date(expense.paymentDate).toLocaleDateString('ar-LY')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {pagination && pagination.pages > 1 && (
                                        <div className="flex justify-center gap-2 mt-6">
                                            <button
                                                onClick={() => setExpensesPage(p => Math.max(1, p - 1))}
                                                disabled={expensesPage === 1}
                                                className="px-4 py-2 border rounded-lg disabled:opacity-50"
                                            >
                                                السابق
                                            </button>
                                            <span className="px-4 py-2">
                                                {expensesPage} / {pagination.pages}
                                            </span>
                                            <button
                                                onClick={() => setExpensesPage(p => Math.min(pagination.pages, p + 1))}
                                                disabled={expensesPage === pagination.pages}
                                                className="px-4 py-2 border rounded-lg disabled:opacity-50"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Stats Tab */}
                    {activeTab === 'stats' && (
                        <div>
                            {/* Top Categories */}
                            {stats && stats.topCategories.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">🔝 أعلى البنود استخداماً</h3>
                                    <div className="space-y-3">
                                        {stats.topCategories.map((cat, index) => (
                                            <div key={cat.categoryId} className="flex items-center bg-gray-50 rounded-lg p-4">
                                                <span className="text-2xl font-bold text-gray-400 w-10">{index + 1}</span>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{cat.categoryName}</p>
                                                    <p className="text-sm text-gray-500">{cat.count} عملية</p>
                                                </div>
                                                <p className="text-lg font-bold text-red-600">{formatCurrency(cat.totalAmount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Monthly Chart */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 المصروفات الشهرية لعام {currentYear}</h3>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                    {monthlyReport.map(month => (
                                        <div key={month.month} className="bg-gray-50 rounded-lg p-4 text-center">
                                            <p className="text-sm text-gray-500 mb-1">{month.monthName}</p>
                                            <p className="text-lg font-bold text-red-600">{formatCurrency(month.totalAmount)}</p>
                                            <p className="text-xs text-gray-400">{month.count} عملية</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">{editingCategory ? 'تعديل بند' : 'إضافة بند جديد'}</h3>
                            <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-white hover:text-gray-200">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم البند *</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder="مثال: مصاريف الصيانة"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                    placeholder="وصف اختياري للبند..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                disabled={creating || updating || !categoryForm.name}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {editingCategory ? 'تحديث' : 'إضافة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {showPayModal && selectedCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">💸 صرف مصروف - {selectedCategory.name}</h3>
                            <button onClick={() => { setShowPayModal(false); setSelectedCategory(null); }} className="text-white hover:text-gray-200">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder="أدخل المبلغ"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                                <input
                                    type="text"
                                    value={payForm.description}
                                    onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder="وصف المصروف..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                <select
                                    value={payForm.treasuryId}
                                    onChange={(e) => setPayForm({ ...payForm, treasuryId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                >
                                    <option value="">اختر الخزينة</option>
                                    {treasuries.map(treasury => (
                                        <option key={treasury.id} value={treasury.id}>
                                            {treasury.name} ({formatCurrency(treasury.balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                <textarea
                                    value={payForm.notes}
                                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowPayModal(false); setSelectedCategory(null); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handlePayBadDebt}
                                disabled={paying || !payForm.amount || !payForm.treasuryId}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                صرف المصروف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
