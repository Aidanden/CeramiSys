"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    RefreshCw,
    Package,
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Save,
    Edit,
    Info,
    ChevronLeft,
    BarChart3,
    FileText
} from 'lucide-react';
import { useGetPurchasesQuery } from '@/state/purchaseApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useUpdateProductCostMutation } from '@/state/productCostApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { useToast } from '@/components/ui/Toast';

interface PurchaseLineWithCost {
    productId: number;
    productName: string;
    productSku: string;
    qty: number;
    unitPrice: number;
    subTotal: number;
    valuePercentage: number;
    expenseShare: number;
    totalWithExpense: number;
    totalInLYD: number;
    costPerUnit: number;
}

export default function InvoiceCostPage() {
    const { success, error } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
    const [customExchangeRate, setCustomExchangeRate] = useState<number | null>(null);
    const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);

    // Fetch user and companies
    const { data: currentUserResponse } = useGetCurrentUserQuery();
    const currentUser = currentUserResponse?.data;

    const { data: companiesData } = useGetCompaniesQuery();

    // Fetch purchases (approved only)
    const { data: purchasesData, isLoading, refetch } = useGetPurchasesQuery({
        page: 1,
        limit: 50,
        companyId: selectedCompanyId,
        isApproved: true,
        invoiceNumber: searchTerm || undefined
    });

    const [updateProductCost, { isLoading: isUpdatingCost }] = useUpdateProductCostMutation();

    const purchases = purchasesData?.purchases || [];
    const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
    const companies = companiesData?.data?.companies || [];

    // Set default company filter based on user
    useEffect(() => {
        if (currentUser && !selectedCompanyId) {
            setSelectedCompanyId(currentUser.companyId);
        }
    }, [currentUser, selectedCompanyId]);

    // Calculate cost distribution for selected purchase
    const calculateCostDistribution = (): PurchaseLineWithCost[] => {
        if (!selectedPurchase || !selectedPurchase.lines) return [];

        // استخدام سعر الصرف المخصص أو سعر الصرف الأصلي
        const exchangeRate = customExchangeRate || Number(selectedPurchase.exchangeRate || 1);
        const totalExpenses = Number(selectedPurchase.totalExpenses || 0);

        // حساب إجمالي الفاتورة بالعملة الأجنبية (USD/EUR)
        const purchaseTotalForeign = selectedPurchase.lines.reduce((sum, line) =>
            sum + Number(line.subTotal), 0
        );

        // تحويل إجمالي الفاتورة إلى دينار
        const purchaseTotalLYD = purchaseTotalForeign * exchangeRate;

        return selectedPurchase.lines.map(line => {
            const lineSubTotalForeign = Number(line.subTotal);

            // تحويل قيمة المنتج إلى دينار
            const lineSubTotalLYD = lineSubTotalForeign * exchangeRate;

            // حساب نسبة المنتج من إجمالي الفاتورة (بالدينار)
            const valuePercentage = purchaseTotalLYD > 0 ? (lineSubTotalLYD / purchaseTotalLYD) * 100 : 0;

            // حساب نصيب المنتج من المصروفات (بالدينار)
            const expenseShare = (valuePercentage / 100) * totalExpenses;

            // الإجمالي مع المصروفات (بالدينار)
            const totalInLYD = lineSubTotalLYD + expenseShare;

            // التكلفة لكل وحدة
            const qty = Number(line.qty);
            const costPerUnit = qty > 0 ? totalInLYD / qty : 0;

            return {
                productId: line.productId,
                productName: line.product?.name || 'غير معروف',
                productSku: line.product?.sku || '',
                qty,
                unitPrice: Number(line.unitPrice),
                subTotal: lineSubTotalForeign, // القيمة بالعملة الأجنبية
                valuePercentage,
                expenseShare,
                totalWithExpense: lineSubTotalLYD, // القيمة بالدينار قبل المصروفات
                totalInLYD, // القيمة النهائية بالدينار (مع المصروفات)
                costPerUnit
            };
        });
    };

    const costDistribution = calculateCostDistribution();

    // Calculate totals
    const exchangeRate = customExchangeRate || Number(selectedPurchase?.exchangeRate || 1);
    const totals = costDistribution.reduce((acc, line) => ({
        subTotalForeign: acc.subTotalForeign + line.subTotal,
        subTotalLYD: acc.subTotalLYD + line.totalWithExpense,
        expenseShare: acc.expenseShare + line.expenseShare,
        totalInLYD: acc.totalInLYD + line.totalInLYD
    }), { subTotalForeign: 0, subTotalLYD: 0, expenseShare: 0, totalInLYD: 0 });

    // Reset custom exchange rate when purchase changes
    useEffect(() => {
        setCustomExchangeRate(null);
    }, [selectedPurchaseId]);

    // Handle update product cost
    const handleUpdateProductCost = async (productId: number, newCost: number) => {
        if (!selectedPurchase) return;

        try {
            setUpdatingProductId(productId);
            await updateProductCost({
                productId,
                newCost,
                purchaseId: selectedPurchase.id,
                exchangeRateUsed: exchangeRate,
                notes: `تحديث من فاتورة ${selectedPurchase?.invoiceNumber || selectedPurchase?.id}`
            }).unwrap();

            success('تم تحديث تكلفة المنتج بنجاح');
            setUpdatingProductId(null);
        } catch (err: any) {
            error(err?.data?.message || 'حدث خطأ في تحديث التكلفة');
            setUpdatingProductId(null);
        }
    };

    // Handle update all products cost
    const handleUpdateAllProductsCost = async () => {
        if (!selectedPurchase || costDistribution.length === 0) return;

        try {
            setUpdatingProductId(-1); // -1 للدلالة على تحديث الكل

            for (const line of costDistribution) {
                await updateProductCost({
                    productId: line.productId,
                    newCost: line.costPerUnit,
                    purchaseId: selectedPurchase.id,
                    exchangeRateUsed: exchangeRate,
                    notes: `تحديث جماعي من فاتورة ${selectedPurchase?.invoiceNumber || selectedPurchase?.id}`
                }).unwrap();
            }

            success(`تم تحديث تكلفة ${costDistribution.length} منتج بنجاح`);
            setUpdatingProductId(null);
        } catch (err: any) {
            error(err?.data?.message || 'حدث خطأ في تحديث التكاليف');
            setUpdatingProductId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-transparent" dir="rtl">
            {/* Header */}
            <div className="mb-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-50 dark:border-blue-800/20">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-text-primary tracking-tight">تكلفة الفاتورة</h1>
                            <p className="text-slate-600 dark:text-text-secondary mt-1 text-lg">حساب توزيع التكلفة على جميع منتجات الفاتورة</p>
                        </div>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-border-primary shadow-sm text-sm font-bold text-slate-700 dark:text-text-primary bg-white dark:bg-surface-secondary hover:bg-slate-50 dark:hover:bg-surface-hover hover:border-slate-300 dark:hover:border-border-primary transition-all duration-200 group"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        تحديث البيانات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Purchase List */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border-2 border-slate-100 dark:border-border-primary p-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-text-primary mb-6 flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            فواتير المشتريات المعتمدة
                        </h2>

                        {/* Company Filter */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 dark:text-text-tertiary mb-1.5 uppercase tracking-wider">
                                الشركة
                            </label>
                            <select
                                value={selectedCompanyId || ''}
                                onChange={(e) => {
                                    setSelectedCompanyId(e.target.value ? Number(e.target.value) : undefined);
                                    setSelectedPurchaseId(null);
                                }}
                                className="w-full px-4 py-2.5 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                            >
                                <option value="">جميع الشركات</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="بحث برقم الفاتورة..."
                                    className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-100 dark:border-border-primary rounded-xl bg-slate-50/50 dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Purchases List */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pl-1">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : purchases.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-surface-secondary rounded-2xl border-2 border-dashed border-slate-100 dark:border-border-primary">
                                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-400 dark:text-text-tertiary font-bold">لا توجد فواتير معتمدة</p>
                                </div>
                            ) : (
                                purchases.map((purchase) => (
                                    <button
                                        key={purchase.id}
                                        onClick={() => setSelectedPurchaseId(purchase.id)}
                                        className={`w-full text-right p-5 rounded-2xl border-2 transition-all duration-200 group ${selectedPurchaseId === purchase.id
                                            ? 'border-blue-500 bg-blue-600 shadow-lg shadow-blue-500/20 translate-x-1'
                                            : 'border-slate-100 dark:border-border-primary bg-white dark:bg-surface-secondary hover:border-blue-200 dark:hover:border-blue-900/40 hover:bg-slate-50/50 dark:hover:bg-blue-900/5'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`font-black text-lg tracking-tight ${selectedPurchaseId === purchase.id ? 'text-white' : 'text-slate-900 dark:text-text-primary'}`}>
                                                {purchase.invoiceNumber || `#${purchase.id}`}
                                            </span>
                                            {selectedPurchaseId === purchase.id ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                            ) : (
                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            )}
                                        </div>
                                        <div className={`space-y-2 ${selectedPurchaseId === purchase.id ? 'text-blue-50' : 'text-slate-500 dark:text-text-secondary'}`}>
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <Package className="w-4 h-4 opacity-70" />
                                                {purchase.lines?.length || 0} صنف
                                            </div>
                                            <div className="flex items-center gap-2 font-black text-base">
                                                <DollarSign className="w-4 h-4 opacity-70" />
                                                {formatArabicCurrency(Number(purchase.total))}
                                            </div>
                                            {purchase.totalExpenses && Number(purchase.totalExpenses) > 0 && (
                                                <div className={`flex items-center gap-2 text-sm font-bold ${selectedPurchaseId === purchase.id ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`}>
                                                    <Edit className="w-4 h-4" />
                                                    مصروفات: {formatArabicCurrency(Number(purchase.totalExpenses))}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Cost Distribution */}
                <div className="lg:col-span-2">
                    {!selectedPurchase ? (
                        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border-2 border-slate-100 dark:border-border-primary p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 dark:border-border-primary">
                                <FileText className="w-10 h-10 text-slate-300 dark:text-text-tertiary" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-text-primary mb-2">اختر فاتورة للبدء</h3>
                            <p className="text-slate-500 dark:text-text-tertiary max-w-sm mx-auto">اختر فاتورة مشتريات معتمدة من القائمة لعرض وتوزيع التكاليف على الأصناف</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-xl border-2 border-slate-100 dark:border-border-primary overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                            {/* Purchase Header */}
                            <div className="p-8 border-b-2 border-slate-50 dark:border-border-primary bg-slate-50/50 dark:bg-surface-secondary relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-surface-primary rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-border-primary">
                                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">بيانات فاتورة المشتريات</p>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-text-primary">
                                                فاتورة {selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}
                                            </h2>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPurchaseId(null)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-surface-primary text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-border-primary transition-all shadow-sm"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                                    <div className="bg-white dark:bg-surface-primary rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-border-primary transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase tracking-wider mb-2">إجمالي الفاتورة</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-text-primary">
                                            {formatArabicCurrency(Number(selectedPurchase.total))}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-surface-primary rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-border-primary transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider mb-2">إجمالي المصروفات</p>
                                        <p className="text-lg font-black text-orange-600 dark:text-orange-400">
                                            {formatArabicCurrency(Number(selectedPurchase.totalExpenses || 0))}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-surface-primary rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-border-primary transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase tracking-wider mb-2">سعر الصرف الأصلي</p>
                                        <p className="text-lg font-black text-slate-600 dark:text-text-secondary">
                                            {formatArabicNumber(Number(selectedPurchase.exchangeRate || 1))}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-surface-primary rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-border-primary transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-2">العملة</p>
                                        <p className="text-lg font-black text-green-600 dark:text-green-400">
                                            {selectedPurchase.currency || 'LYD'}
                                        </p>
                                    </div>
                                </div>

                                {/* Custom Exchange Rate Input */}
                                {selectedPurchase.currency !== 'LYD' && (
                                    <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 rounded-3xl p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                        <label className="block text-sm font-black text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            استخدام سعر صرف مخصص لحساب التكلفة النهائية
                                        </label>
                                        <div className="flex gap-4 items-center">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={customExchangeRate || ''}
                                                    onChange={(e) => setCustomExchangeRate(e.target.value ? Number(e.target.value) : null)}
                                                    placeholder={`السعر الأصلي: ${selectedPurchase.exchangeRate}`}
                                                    className="w-full px-5 py-4 border-2 border-white dark:border-border-primary rounded-2xl bg-white dark:bg-surface-primary text-slate-900 dark:text-text-primary text-xl font-black outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all shadow-inner"
                                                />
                                            </div>
                                            {customExchangeRate && (
                                                <button
                                                    onClick={() => setCustomExchangeRate(null)}
                                                    className="px-6 py-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl font-black hover:bg-amber-200 dark:hover:bg-amber-900/50 shadow-sm transition-all active:scale-95"
                                                >
                                                    إعادة تعيين للأصلي
                                                </button>
                                            )}
                                        </div>
                                        {customExchangeRate && (
                                            <div className="mt-4 flex items-center gap-2 text-amber-700 dark:text-amber-400/80">
                                                <AlertCircle className="w-4 h-4" />
                                                <p className="text-xs font-bold">
                                                    سيتم استخدام سعر الصرف <span className="underline underline-offset-4 decoration-amber-400">{formatArabicNumber(customExchangeRate)}</span> بدلاً من سعر الفاتورة الأصلي.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cost Distribution Table */}
                            <div className="p-8">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-text-primary uppercase tracking-tight">قائمة الأصناف وتوزيع التكلفة</h3>
                                    </div>
                                    <button
                                        onClick={handleUpdateAllProductsCost}
                                        disabled={isUpdatingCost}
                                        className="inline-flex items-center gap-3 bg-emerald-600 dark:bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {isUpdatingCost && updatingProductId === -1 ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                جاري التحديث...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                اعتماد وتحديث تكلفة جميع الأصناف
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="border-2 border-slate-100 dark:border-border-primary rounded-3xl overflow-hidden bg-white dark:bg-surface-primary shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 dark:bg-surface-secondary border-b-2 border-slate-100 dark:border-border-primary">
                                                    <th className="py-5 px-6 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest w-[25%]">الأصناف</th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest text-center">الكمية</th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest">
                                                        القيمة ({selectedPurchase?.currency})
                                                    </th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest">
                                                        القيمة (د.ل)
                                                    </th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest text-center">نسبة الحجم</th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest">المصروفات</th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest text-blue-600 dark:text-blue-400">الإجمالي</th>
                                                    <th className="py-5 px-4 font-black text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50/10">التكلفة/وحدة</th>
                                                    <th className="py-5 px-6 font-black text-[10px] text-slate-400 dark:text-text-tertiary uppercase tracking-widest text-center">التحديث</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-border-primary">
                                                {costDistribution.map((line, index) => (
                                                    <tr key={line.productId} className="hover:bg-slate-50/50 dark:hover:bg-blue-900/5 transition-colors group">
                                                        <td className="py-5 px-6">
                                                            <div className="space-y-1">
                                                                <p className="font-black text-slate-900 dark:text-text-primary leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={line.productName}>{line.productName}</p>
                                                                <p className="text-xs font-bold text-slate-400 dark:text-text-tertiary font-mono" title={line.productSku}>{line.productSku}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-5 px-4 text-center">
                                                            <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-surface-secondary text-slate-700 dark:text-text-primary rounded-lg text-xs font-black">
                                                                {formatArabicNumber(line.qty)}
                                                            </span>
                                                        </td>
                                                        <td className="py-5 px-4 text-slate-600 dark:text-text-secondary font-bold">
                                                            {formatArabicNumber(line.subTotal.toFixed(2))}
                                                        </td>
                                                        <td className="py-5 px-4 text-slate-900 dark:text-text-primary font-black">
                                                            {formatArabicNumber(line.totalWithExpense.toFixed(0))}
                                                        </td>
                                                        <td className="py-5 px-4 text-center">
                                                            <span className="inline-flex px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-black border border-blue-100 dark:border-blue-800/20">
                                                                {formatArabicNumber(line.valuePercentage.toFixed(1))}%
                                                            </span>
                                                        </td>
                                                        <td className="py-5 px-4 text-orange-600 dark:text-orange-400 font-bold">
                                                            {formatArabicNumber(line.expenseShare.toFixed(0))}
                                                        </td>
                                                        <td className="py-5 px-4 text-blue-700 dark:text-blue-400 font-black">
                                                            {formatArabicNumber(line.totalInLYD.toFixed(0))}
                                                        </td>
                                                        <td className="py-5 px-4 bg-emerald-50/30 dark:bg-emerald-900/10">
                                                            <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg">
                                                                {formatArabicNumber(line.costPerUnit.toFixed(2))}
                                                            </span>
                                                        </td>
                                                        <td className="py-5 px-6 text-center">
                                                            <button
                                                                onClick={() => handleUpdateProductCost(line.productId, line.costPerUnit)}
                                                                disabled={isUpdatingCost && updatingProductId === line.productId}
                                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white border border-emerald-100 dark:border-emerald-800/30 transition-all shadow-sm active:scale-90 mx-auto"
                                                                title="تحديث تكلفة الصنف"
                                                            >
                                                                {isUpdatingCost && updatingProductId === line.productId ? (
                                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    <Save className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Totals Row */}
                                                <tr className="bg-slate-900 dark:bg-slate-950 text-white font-black">
                                                    <td className="py-5 px-6" colSpan={2}>
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="w-5 h-5 text-blue-400" />
                                                            تقرير الإجماليات للفاتورة
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        {formatArabicNumber(totals.subTotalForeign.toFixed(2))}
                                                    </td>
                                                    <td className="py-5 px-4">
                                                        {formatArabicNumber(totals.subTotalLYD.toFixed(0))}
                                                    </td>
                                                    <td className="py-5 px-4 text-center">
                                                        <span className="px-2 py-1 bg-blue-600 rounded-lg text-[10px]">100%</span>
                                                    </td>
                                                    <td className="py-5 px-4 text-orange-400">
                                                        {formatArabicNumber(totals.expenseShare.toFixed(0))}
                                                    </td>
                                                    <td className="py-5 px-4 text-blue-400">
                                                        {formatArabicNumber(totals.totalInLYD.toFixed(0))}
                                                    </td>
                                                    <td className="py-5 px-4">-</td>
                                                    <td className="py-5 px-6">-</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                                <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">إجمالي ({selectedPurchase?.currency})</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-text-primary">
                                            {formatArabicNumber(totals.subTotalForeign.toFixed(2))}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-r-4 border-r-blue-500">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">إجمالي (د.ل)</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-text-primary">
                                            {formatArabicNumber(totals.subTotalLYD.toFixed(0))}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-r-4 border-r-orange-500">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">المصروفات المستهلكة</p>
                                        <p className="text-2xl font-black text-orange-700 dark:text-orange-400">
                                            {formatArabicNumber(totals.expenseShare.toFixed(0))}
                                        </p>
                                    </div>
                                </div>
                                <div className="relative group overflow-hidden bg-white dark:bg-surface-primary border-2 border-slate-100 dark:border-border-primary rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-r-4 border-r-emerald-500">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-125 duration-500"></div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">الإجمالي النهائي</p>
                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                                            {formatArabicNumber(totals.totalInLYD.toFixed(0))}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formula Explanation */}
                            <div className="mt-8 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-3xl p-6">
                                <h3 className="text-lg font-black text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    خوازمية احتساب التكلفة الفعلية
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    <p className="text-sm font-bold text-slate-600 dark:text-text-tertiary flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">١</span>
                                        تحويل قيمة المنتج إلى دينار = قيمة المنتج بالعملة ({selectedPurchase?.currency}) × سعر الصرف المستخدم حالياً
                                    </p>
                                    <p className="text-sm font-bold text-slate-600 dark:text-text-tertiary flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">٢</span>
                                        حساب نسبة المنتج من القيمة للمجموعة = (قيمة المنتج بالدينار ÷ إجمالي الفاتورة بالدينار) × ١٠٠
                                    </p>
                                    <p className="text-sm font-bold text-slate-600 dark:text-text-tertiary flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">٣</span>
                                        نصيب المنتج من المصروفات التشغيلية = (النسبة ÷ ١٠٠) × إجمالي المصروفات المرتبطة بالفاتورة
                                    </p>
                                    <p className="text-sm font-bold text-slate-600 dark:text-text-tertiary flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">٤</span>
                                        الإجمالي النهائي للتكلفة = قيمة المنتج بالدينار + نصيب المصروفات
                                    </p>
                                    <div className="col-span-1 md:col-span-2 pt-3 border-t border-slate-100 dark:border-border-primary/50 mt-2">
                                        <p className="text-sm font-black text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            قاعدة النظام: يتم توزيع المصروفات نسبياً؛ المنتج الأعلى قيمة يتحمل الحصة الأكبر من المصروفات.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
