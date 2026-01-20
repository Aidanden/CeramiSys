'use client';

/**
 * صفحة المصروفات المعدومة
 * Bad Debts / Write-offs Management Page
 */

import React, { useState, useRef, useMemo } from 'react';
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
import { useGetCurrentUserQuery } from '@/state/authApi';
import { BadDebtMonthlyReport } from '@/components/bad-debts/BadDebtMonthlyReport';
import {
    Folder,
    Calendar,
    BarChart3,
    TrendingUp,
    Printer,
    FileText,
    Search,
    X,
    Eye,
    Filter,
    Layout,
    PieChart as PieChartIcon,
    CircleDollarSign,
    Edit,
    Trash2,
    Plus
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface MainStatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    iconBgColor: string;
}

const MainStatCard = ({ title, value, subtitle, icon: Icon, iconBgColor }: MainStatCardProps) => {
    return (
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-red-100 dark:border-border-primary p-6 hover:shadow-md hover:border-red-200 dark:hover:border-red-800/30 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-text-primary">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 dark:text-text-muted mt-1">{subtitle}</p>}
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

// ألوان للرسم البياني الدائري
const CHART_COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function BadDebtsPage() {
    // State
    const [activeTab, setActiveTab] = useState<'categories' | 'expenses' | 'stats'>('categories');
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BadDebtCategory | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<BadDebtCategory | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Print ref
    const printRef = useRef<HTMLDivElement>(null);

    // Expenses filter state
    const [expensesCategoryId, setExpensesCategoryId] = useState<number | undefined>();
    const [expensesPage, setExpensesPage] = useState(1);
    const [expensesStartDate, setExpensesStartDate] = useState<string>('');
    const [expensesEndDate, setExpensesEndDate] = useState<string>('');

    // Stats filter state
    const currentDate = new Date();
    const [statsYear, setStatsYear] = useState(currentDate.getFullYear());

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

    const { data: expensesData, isLoading: expensesLoading, refetch: refetchExpenses } = useGetExpensesQuery({
        categoryId: expensesCategoryId,
        startDate: expensesStartDate || undefined,
        endDate: expensesEndDate || undefined,
        page: expensesPage,
        limit: 20
    });

    const { data: statsData, refetch: refetchStats } = useGetBadDebtStatsQuery({
        companyId: selectedCompanyId,
        year: statsYear
    });

    const { data: monthlyReportData, isLoading: monthlyReportLoading, isFetching: monthlyReportFetching, error: monthlyReportError } = useGetMonthlyReportQuery({
        year: statsYear,
        companyId: selectedCompanyId
    });

    const { data: treasuriesData } = useGetTreasuriesQuery({});
    const { data: companiesData } = useGetCompaniesQuery({});
    const { data: userData } = useGetCurrentUserQuery();

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
    const user = userData?.data;

    // حساب إجمالي المصروفات المعروضة
    const totalDisplayedExpenses = useMemo(() => {
        return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    }, [expenses]);

    // تحديد اسم الشركة/الشركات واسم المستخدم للطباعة
    const getCompanyInfo = () => {
        if (user?.isSystemUser && companiesData?.data?.companies) {
            const allCompanies = companiesData.data.companies.map((c: any) => c.name).join(' - ');
            return {
                name: allCompanies || 'نظام إدارة السيراميك',
                userName: user.fullName || user.username || 'المدير'
            };
        } else if (user?.company) {
            return {
                name: user.company.name,
                userName: user.fullName || user.username || '-'
            };
        }
        return {
            name: 'الشركة',
            userName: '-'
        };
    };

    // الحصول على اسم البند المحدد للتصفية
    const getSelectedCategoryName = () => {
        if (!expensesCategoryId) return undefined;
        const cat = categories.find(c => c.id === expensesCategoryId);
        return cat?.name;
    };

    // طباعة التقرير
    const handlePrintReport = () => {
        if (expenses.length === 0) {
            alert('لا توجد بيانات للطباعة!');
            return;
        }

        setTimeout(() => {
            if (printRef.current) {
                const printWindow = window.open('', '_blank', 'width=1200,height=800');
                if (!printWindow) {
                    alert('تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة.');
                    return;
                }

                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>تقرير المصروفات المعدومة</title>
                    </head>
                    <body>
                        ${printRef.current.innerHTML}
                        <script>
                            window.onload = function() {
                                setTimeout(() => {
                                    window.print();
                                }, 500);
                            };
                            window.onafterprint = function() {
                                setTimeout(() => {
                                    window.close();
                                }, 100);
                            };
                        </script>
                    </body>
                    </html>
                `;

                printWindow.document.write(htmlContent);
                printWindow.document.close();
            }
        }, 200);
    };

    // إعادة تعيين فلاتر المصروفات
    const resetExpensesFilters = () => {
        setExpensesCategoryId(undefined);
        setExpensesStartDate('');
        setExpensesEndDate('');
        setExpensesPage(1);
    };

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
            refetchExpenses();
            refetchStats();
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

    // بيانات الرسم البياني الدائري للبنود
    const pieChartData = useMemo(() => {
        if (!stats?.topCategories) return [];
        return stats.topCategories.map(cat => ({
            name: cat.categoryName,
            value: cat.totalAmount
        }));
    }, [stats?.topCategories]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-text-primary tracking-tight mb-2">📋 المصروفات المعدومة</h1>
                <p className="text-slate-600 dark:text-text-secondary">إدارة بنود المصروفات المعدومة وصرفها</p>
            </div>

            {/* Company Filter */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الشركة</label>
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-red-500 dark:focus:ring-red-900/50 outline-none transition-all"
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
            <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
                <nav className="flex gap-2 p-2 border-b border-slate-100 dark:border-border-primary">
                    {[
                        { key: 'categories', label: '📁 بنود المصروفات', icon: '📁' },
                        { key: 'expenses', label: '💸 سجل المصروفات', icon: '💸' },
                        { key: 'stats', label: '📊 الإحصائيات', icon: '📊' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key
                                ? 'bg-red-600 text-white shadow-md shadow-red-200 dark:shadow-none'
                                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover hover:text-red-600 dark:hover:text-red-400'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

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
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl w-64 bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        resetCategoryForm();
                                        setEditingCategory(null);
                                        setShowCategoryModal(true);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Plus className="w-5 h-5" />
                                    إضافة بند
                                </button>
                            </div>

                            {/* Categories Table */}
                            {categoriesLoading ? (
                                <div className="text-center py-10 bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary text-slate-600 dark:text-text-secondary">جاري التحميل...</div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-text-tertiary bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary">لا يوجد بنود مصروفات</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-surface-secondary">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">اسم البند</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">الوصف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">إجمالي المصروفات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">عدد العمليات</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-border-primary">
                                            {categories.map(category => (
                                                <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 dark:text-text-primary">{category.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-text-secondary text-sm">{category.description || '-'}</td>
                                                    <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">
                                                        {formatCurrency(category.totalExpenses || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">{category.expensesCount || 0}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openPayModal(category)}
                                                                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 dark:hover:bg-red-700 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="صرف مصروف"
                                                            >
                                                                <CircleDollarSign className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(category)}
                                                                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-700 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="تعديل"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(category)}
                                                                className="p-2 bg-slate-50 dark:bg-surface-secondary text-slate-600 dark:text-text-secondary rounded-xl hover:bg-gray-600 dark:hover:bg-gray-700 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="حذف"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
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
                            <div className="flex flex-wrap gap-4 mb-6 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">البند</label>
                                    <select
                                        value={expensesCategoryId || ''}
                                        onChange={(e) => {
                                            setExpensesCategoryId(e.target.value ? parseInt(e.target.value) : undefined);
                                            setExpensesPage(1);
                                        }}
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-red-500 dark:focus:ring-red-900/50 outline-none transition-all"
                                    >
                                        <option value="">جميع البنود</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">من تاريخ</label>
                                    <input
                                        type="date"
                                        value={expensesStartDate}
                                        onChange={(e) => {
                                            setExpensesStartDate(e.target.value);
                                            setExpensesPage(1);
                                        }}
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-red-500 dark:focus:ring-red-900/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">إلى تاريخ</label>
                                    <input
                                        type="date"
                                        value={expensesEndDate}
                                        onChange={(e) => {
                                            setExpensesEndDate(e.target.value);
                                            setExpensesPage(1);
                                        }}
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-red-500 dark:focus:ring-red-900/50 outline-none transition-all"
                                    />
                                </div>
                                {(expensesCategoryId || expensesStartDate || expensesEndDate) && (
                                    <button
                                        onClick={resetExpensesFilters}
                                        className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800 dark:hover:text-text-primary flex items-center gap-1"
                                    >
                                        <X className="w-4 h-4" />
                                        إزالة الفلاتر
                                    </button>
                                )}
                                <div className="flex-1"></div>
                                {/* Print and Preview Buttons */}
                                <button
                                    onClick={() => setShowPreviewModal(true)}
                                    disabled={expenses.length === 0}
                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-700 hover:text-white flex items-center gap-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Eye className="w-5 h-5" />
                                    معاينة
                                </button>
                                <button
                                    onClick={handlePrintReport}
                                    disabled={expenses.length === 0}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Printer className="w-5 h-5" />
                                    طباعة التقرير
                                </button>
                            </div>

                            {/* Summary Bar */}
                            {expenses.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4 mb-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-red-700 dark:text-red-400">
                                            <strong>{pagination?.total || expenses.length}</strong> عملية
                                        </span>
                                        {(expensesStartDate || expensesEndDate) && (
                                            <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                                {expensesStartDate && `من: ${expensesStartDate}`}
                                                {expensesStartDate && expensesEndDate && ' - '}
                                                {expensesEndDate && `إلى: ${expensesEndDate}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-lg font-bold text-red-700 dark:text-red-400">
                                        إجمالي الصفحة: {formatCurrency(totalDisplayedExpenses)}
                                    </div>
                                </div>
                            )}

                            {/* Expenses Table */}
                            {expensesLoading ? (
                                <div className="text-center py-10 bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary text-slate-600 dark:text-text-secondary">جاري التحميل...</div>
                            ) : expenses.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-text-tertiary bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary">لا يوجد مصروفات</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 dark:bg-surface-secondary">
                                                <tr>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">رقم الإيصال</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">البند</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">المبلغ</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">الوصف</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">التاريخ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-border-primary">
                                                {expenses.map(expense => (
                                                    <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                                                        <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-text-secondary">{expense.receiptNumber}</td>
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-text-primary">{expense.category?.name}</td>
                                                        <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-text-secondary text-sm">{expense.description || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">
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
                                                className="px-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 transition-all"
                                            >
                                                السابق
                                            </button>
                                            <span className="px-4 py-2">
                                                {expensesPage} / {pagination.pages}
                                            </span>
                                            <button
                                                onClick={() => setExpensesPage(p => Math.min(pagination.pages, p + 1))}
                                                disabled={expensesPage === pagination.pages}
                                                className="px-4 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary hover:bg-slate-50 dark:hover:bg-surface-hover disabled:opacity-50 transition-all"
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
                            {/* Year Filter */}
                            <div className="flex flex-wrap gap-4 items-center mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">السنة</label>
                                    <select
                                        value={statsYear}
                                        onChange={(e) => setStatsYear(parseInt(e.target.value))}
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-red-500 dark:focus:ring-red-900/50 outline-none transition-all"
                                    >
                                        {[2024, 2025, 2026, 2027].map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedCompanyId && (
                                    <button
                                        onClick={() => setSelectedCompanyId(undefined)}
                                        className="text-sm text-red-600 hover:text-red-800 underline"
                                    >
                                        عرض جميع الشركات
                                    </button>
                                )}
                            </div>

                            {/* Summary Stats Grid - like Payroll */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Main Stat Card */}
                                <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <TrendingUp className="w-8 h-8 opacity-50" />
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">سنوي</span>
                                    </div>
                                    <p className="text-red-100 text-sm font-medium mb-1">إجمالي المصروفات المعدومة</p>
                                    <p className="text-3xl font-bold">{formatCurrency(stats?.thisYear.totalAmount || 0)}</p>
                                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                                        <span>عدد العمليات: {stats?.thisYear.count || 0}</span>
                                        <span>البنود النشطة: {stats?.totalActiveCategories || 0}</span>
                                    </div>
                                </div>

                                {/* Distribution by Category */}
                                <div className="bg-white dark:bg-surface-primary border border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl">
                                            <PieChartIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-text-primary">توزيع المصروفات</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {stats?.topCategories.slice(0, 4).map((cat, idx) => (
                                            <div key={cat.categoryId}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-slate-500 dark:text-text-tertiary">{cat.categoryName}</span>
                                                    <span className="font-bold text-slate-700 dark:text-text-primary">
                                                        {Math.round((cat.totalAmount / (stats?.thisYear.totalAmount || 1)) * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-surface-elevated rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full" 
                                                        style={{ 
                                                            width: `${(cat.totalAmount / (stats?.thisYear.totalAmount || 1)) * 100}%`,
                                                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!stats?.topCategories || stats.topCategories.length === 0) && (
                                            <p className="text-slate-400 dark:text-text-muted text-xs text-center py-4 italic">لا توجد بيانات</p>
                                        )}
                                    </div>
                                </div>

                                {/* Top Categories List */}
                                <div className="bg-white dark:bg-surface-primary border border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl">
                                            <Layout className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-text-primary">أعلى البنود</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {stats?.topCategories.map((cat, idx) => (
                                            <div key={cat.categoryId} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-gray-400 dark:text-text-muted">{idx + 1}</span>
                                                    <span className="text-slate-600 dark:text-text-secondary">{cat.categoryName}</span>
                                                </div>
                                                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(cat.totalAmount)}</span>
                                            </div>
                                        ))}
                                        {(!stats?.topCategories || stats.topCategories.length === 0) && (
                                            <p className="text-slate-400 dark:text-text-muted text-xs text-center py-4 italic">لا توجد بيانات</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Monthly Bar Chart */}
                                <div className="bg-white dark:bg-surface-primary border border-slate-100 dark:border-border-primary rounded-2xl p-8 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800 dark:text-text-primary">التحليل الشهري</h4>
                                            <p className="text-sm text-slate-500 dark:text-text-tertiary">المصروفات المعدومة لكل شهر</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-text-tertiary">
                                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                            المصروفات
                                        </div>
                                    </div>
                                    <div className="h-[300px] w-full" dir="ltr">
                                        {(monthlyReportLoading || monthlyReportFetching) ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-text-tertiary">
                                                جاري التحميل...
                                            </div>
                                        ) : monthlyReportError ? (
                                            <div className="h-full flex items-center justify-center text-red-400 dark:text-red-500">
                                                حدث خطأ في جلب البيانات
                                            </div>
                                        ) : monthlyReport && monthlyReport.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthlyReport} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                                                    <XAxis
                                                        dataKey="monthName"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                                        className="dark:[&_text]:fill-slate-400"
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                                        className="dark:[&_text]:fill-slate-400"
                                                        tickFormatter={(value) => `${value}`}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                        cursor={{ fill: '#fef2f2' }}
                                                        formatter={(value: number) => [formatCurrency(value), 'المبلغ']}
                                                    />
                                                    <Bar dataKey="totalAmount" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={30} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-text-tertiary">
                                                لا توجد بيانات للعرض
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Pie Chart */}
                                <div className="bg-white dark:bg-surface-primary border border-slate-100 dark:border-border-primary rounded-2xl p-8 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800 dark:text-text-primary">توزيع البنود</h4>
                                            <p className="text-sm text-slate-500 dark:text-text-tertiary">نسبة كل بند من إجمالي المصروفات</p>
                                        </div>
                                    </div>
                                    <div className="h-[300px] w-full" dir="ltr">
                                        {pieChartData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {pieChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-text-tertiary">
                                                لا توجد بيانات للعرض
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Grid - like Payroll */}
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-text-primary mb-4">📊 المصروفات الشهرية لعام {statsYear}</h3>
                                {(monthlyReportLoading || monthlyReportFetching) ? (
                                    <div className="text-center py-10 text-gray-400 dark:text-text-tertiary">جاري التحميل...</div>
                                ) : monthlyReportError ? (
                                    <div className="text-center py-10 text-red-400 dark:text-red-500">حدث خطأ في جلب البيانات</div>
                                ) : monthlyReport && monthlyReport.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {monthlyReport.map(month => (
                                            <div key={month.month} className="bg-slate-50 dark:bg-surface-secondary rounded-xl p-4 text-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <p className="text-sm text-slate-500 dark:text-text-tertiary mb-1">{month.monthName}</p>
                                                <p className="text-lg font-bold text-red-600">{formatCurrency(month.totalAmount)}</p>
                                                <p className="text-xs text-gray-400 dark:text-text-muted">{month.count} عملية</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 dark:text-text-tertiary">لا توجد بيانات لعام {statsYear}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl max-w-md w-full">
                        <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">{editingCategory ? 'تعديل بند' : 'إضافة بند جديد'}</h3>
                            <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-white hover:text-gray-200 dark:hover:text-gray-300">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">اسم البند *</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    placeholder="مثال: مصاريف الصيانة"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الوصف</label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    rows={3}
                                    placeholder="وصف اختياري للبند..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                                className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800 dark:hover:text-text-primary"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                disabled={creating || updating || !categoryForm.name}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl max-w-md w-full">
                        <div className="bg-red-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">💸 صرف مصروف - {selectedCategory.name}</h3>
                            <button onClick={() => { setShowPayModal(false); setSelectedCategory(null); }} className="text-white hover:text-gray-200 dark:hover:text-gray-300">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">المبلغ *</label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    placeholder="أدخل المبلغ"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الوصف</label>
                                <input
                                    type="text"
                                    value={payForm.description}
                                    onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    placeholder="وصف المصروف..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">الخزينة *</label>
                                <select
                                    value={payForm.treasuryId}
                                    onChange={(e) => setPayForm({ ...payForm, treasuryId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1">ملاحظات</label>
                                <textarea
                                    value={payForm.notes}
                                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/50 transition-all"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowPayModal(false); setSelectedCategory(null); }}
                                className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800 dark:hover:text-text-primary"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handlePayBadDebt}
                                disabled={paying || !payForm.amount || !payForm.treasuryId}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                صرف المصروف
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                معاينة التقرير
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrintReport}
                                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium border border-white/30 shadow-sm hover:shadow-md"
                                >
                                    <Printer className="w-5 h-5" />
                                    طباعة
                                </button>
                                <button onClick={() => setShowPreviewModal(false)} className="text-white hover:text-gray-200 dark:hover:text-gray-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 p-4 bg-slate-100 dark:bg-surface-secondary">
                            <div className="transform scale-75 origin-top">
                                <BadDebtMonthlyReport
                                    expenses={expenses}
                                    startDate={expensesStartDate || undefined}
                                    endDate={expensesEndDate || undefined}
                                    categoryName={getSelectedCategoryName()}
                                    companyName={getCompanyInfo().name}
                                    userName={getCompanyInfo().userName}
                                    totalAmount={totalDisplayedExpenses}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden div for printing */}
            <div ref={printRef} style={{ display: 'none' }}>
                <BadDebtMonthlyReport
                    expenses={expenses}
                    startDate={expensesStartDate || undefined}
                    endDate={expensesEndDate || undefined}
                    categoryName={getSelectedCategoryName()}
                    companyName={getCompanyInfo().name}
                    userName={getCompanyInfo().userName}
                    totalAmount={totalDisplayedExpenses}
                />
            </div>
        </div>
    );
}
