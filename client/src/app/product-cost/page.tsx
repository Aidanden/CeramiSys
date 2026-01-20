"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
    RefreshCw,
    Package,
    FileText,
    Calendar,
    ArrowRight,
    TrendingUp,
    CreditCard,
    BarChart3,
    Wallet,
    DollarSign,
    AlertCircle,
    Bookmark,
    CheckCircle,
    Check,
    HelpCircle,
    ChevronLeft
} from 'lucide-react';
import {
    useGetProductsWithCostInfoQuery,
    useGetProductCostInfoQuery,
    useUpdateProductCostMutation,
    ProductWithCostInfo
} from '@/state/productCostApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

// Helper for Arabic date formatting
const formatArabicDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Currency display helper
const getCurrencyLabel = (currency: string) => {
    switch (currency) {
        case 'USD': return 'دولار أمريكي';
        case 'EUR': return 'يورو';
        default: return 'دينار ليبي';
    }
};

const getCurrencySymbol = (currency: string) => {
    switch (currency) {
        case 'USD': return '$';
        case 'EUR': return '€';
        default: return 'د.ل';
    }
};

export default function ProductCostPage() {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [customExchangeRate, setCustomExchangeRate] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // API Queries
    const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetProductsWithCostInfoQuery({
        page,
        limit: 15,
        search: searchTerm || undefined
    });

    const { data: costInfo, isLoading: costInfoLoading, refetch: refetchCostInfo } = useGetProductCostInfoQuery(
        selectedProductId!,
        { skip: !selectedProductId }
    );

    const [updateProductCost, { isLoading: updating }] = useUpdateProductCostMutation();

    // Computed values
    const products = productsData?.products || [];
    const filteredProducts = products;

    // Calculate cost with custom rate
    const calculatedCost = useMemo(() => {
        if (!costInfo?.lastPurchase) return null;

        const rate = customExchangeRate || costInfo.lastPurchase.exchangeRate;
        const totalWithExpenses = costInfo.lastPurchase.totalWithExpenses;
        const totalInLYD = totalWithExpenses * rate;
        const qty = costInfo.lastPurchase.qty;

        return {
            totalInLYD,
            costPerUnit: qty > 0 ? totalInLYD / qty : 0,
            exchangeRateUsed: rate,
            percentage: costInfo.lastPurchase.expenseSharePercentage || 0,
            expenseSharePerUnit: qty > 0 ? costInfo.lastPurchase.expenseShareAmount / qty : 0
        };
    }, [costInfo, customExchangeRate]);

    const handleUpdateCost = async () => {
        if (!costInfo || !costInfo.lastPurchase || !calculatedCost) return;

        try {
            const result = await updateProductCost({
                productId: costInfo.productId,
                newCost: calculatedCost.costPerUnit,
                purchaseId: costInfo.lastPurchase.id,
                exchangeRateUsed: calculatedCost.exchangeRateUsed
            }).unwrap();

            setSuccessMessage(result.message);
            setShowConfirmModal(false);
            refetchProducts();
            refetchCostInfo();
        } catch (error: any) {
            console.error('Error updating cost:', error);
            alert(error.data?.message || 'حدث خطأ في تحديث التكلفة');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-transparent" dir="rtl">
            {/* Header */}
            <div className="mb-8 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-800/20">
                            <Bookmark className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">تكلفة المنتج</h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 text-lg">تحليل وعرض تفاصيل تكلفة صنف محدد بناءً على آخر فاتورة</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { refetchProducts(); if (selectedProductId) refetchCostInfo(); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm text-sm font-bold text-slate-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        تحديث القائمة
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Product Search & List */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 p-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <Bookmark className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            قائمة الأصناف
                        </h2>

                        <div className="mb-6 relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="بحث عن صنف..."
                                className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {productsLoading ? (
                                <div className="text-center py-12">
                                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-400 dark:text-slate-500 font-bold">لم يتم العثور على نتائج</p>
                                </div>
                            ) : (
                                filteredProducts.map((product: ProductWithCostInfo) => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedProductId(product.id);
                                            setCustomExchangeRate(null);
                                            setSuccessMessage(null);
                                        }}
                                        className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200 group ${selectedProductId === product.id
                                            ? 'border-emerald-500 bg-emerald-600 shadow-lg shadow-emerald-500/20 translate-x-1'
                                            : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-black text-sm tracking-tight ${selectedProductId === product.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                {product.name}
                                            </span>
                                            {selectedProductId === product.id ? (
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            ) : (
                                                <div className="w-1.5 h-6 bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            )}
                                        </div>
                                        <div className={`text-xs font-bold ${selectedProductId === product.id ? 'text-emerald-50' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {product.sku}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Cost Details */}
                <div className="lg:col-span-2">
                    {!selectedProductId ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-100 dark:border-slate-700 p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">اختر صنفاً للبدء</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">اختر من قائمة الأصناف لعرض تحليل التكلفة المعتمد على آخر فاتورة مشتريات</p>
                        </div>
                    ) : costInfoLoading ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border-2 border-slate-100 dark:border-slate-700 p-24 text-center">
                            <RefreshCw className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-6" />
                            <p className="text-xl font-black text-slate-900 dark:text-white animate-pulse">جاري جلب بيانات التكلفة...</p>
                        </div>
                    ) : !costInfo?.lastPurchase ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 rounded-3xl p-16 text-center">
                            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-amber-900 dark:text-amber-400 mb-2">لا توجد بيانات شراء لهذا الصنف</h3>
                            <p className="text-amber-700 dark:text-amber-500/80 max-w-sm mx-auto">لم يتم العثور على فواتير مشتريات معتمدة لهذا الصنف سابقاً لحساب تكلفته</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-2 border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                            {/* Product & Purchase Overview */}
                            <div className="p-8 border-b-2 border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700">
                                            <Bookmark className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">تفاصيل تكلفة الصنف</p>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                                {costInfo?.productName}
                                            </h2>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedProductId(null)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-slate-700 transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">رقم الفاتورة</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">
                                            #{costInfo.lastPurchase.invoiceNumber || costInfo.lastPurchase.id}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-slate-700 transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">التاريخ</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">
                                            {formatArabicDate(costInfo.lastPurchase.purchaseDate)}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-slate-700 transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">الكمية المشراة</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">
                                            {formatArabicNumber(costInfo.lastPurchase.qty)}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-50 dark:border-slate-700 transition-transform hover:scale-[1.02]">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-2">رقم الصنف</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                                            {costInfo.productSku}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Base Cost Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <DollarSign className="w-5 h-5" />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white">القيمة الشرائية</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <span className="text-slate-500 dark:text-slate-400 font-bold">السعر بالعملة الأجنبية</span>
                                                <span className="text-xl font-black text-slate-900 dark:text-white">
                                                    {formatArabicNumber(Number(costInfo.lastPurchase.unitPrice))} {getCurrencySymbol(costInfo.lastPurchase.currency)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <span className="text-slate-500 dark:text-slate-400 font-bold">سعر الصرف (الأصلي)</span>
                                                <span className="text-xl font-black text-slate-600 dark:text-slate-300">
                                                    {formatArabicNumber(Number(costInfo.lastPurchase.exchangeRate || 1))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-900/5 rounded-2xl">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">القيمة بالدينار الليبي</span>
                                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                    {formatArabicCurrency(Number(costInfo.lastPurchase.unitPrice) * Number(costInfo.lastPurchase.exchangeRate || 1))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white">تحميل المصروفات</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <span className="text-slate-500 dark:text-slate-400 font-bold">إجمالي مصروفات الفاتورة</span>
                                                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                    {formatArabicCurrency(Number(costInfo.lastPurchase.totalExpenses || 0))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                                <span className="text-slate-500 dark:text-slate-400 font-bold">حصة المنتج من المصروفات</span>
                                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                    {formatArabicNumber(calculatedCost?.percentage.toFixed(2) || 0)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 border-2 border-orange-100 dark:border-orange-900/30 bg-orange-50/20 dark:bg-orange-900/5 rounded-2xl">
                                                <span className="text-orange-600 dark:text-orange-400 font-bold">نصيب الوحدة من المصروفات</span>
                                                <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                                    {formatArabicCurrency(calculatedCost?.expenseSharePerUnit || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Exchange Rate Input */}
                                {costInfo.lastPurchase.currency !== 'LYD' && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-5">
                                        <label className="block text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-4 flex items-center gap-2">
                                            <CreditCard className="w-5 h-5" />
                                            سعر الصرف المحتسب للتكلفة
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={customExchangeRate ?? costInfo.lastPurchase.exchangeRate}
                                                onChange={(e) => setCustomExchangeRate(parseFloat(e.target.value) || null)}
                                                className="w-40 px-4 py-3 border-2 border-yellow-200 dark:border-yellow-900/50 rounded-xl focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none text-lg font-black bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-inner"
                                            />
                                            <span className="text-yellow-700 dark:text-yellow-400/80 font-bold">د.ل / {getCurrencySymbol(costInfo.lastPurchase.currency)}</span>
                                            {customExchangeRate && customExchangeRate !== costInfo.lastPurchase.exchangeRate && (
                                                <button
                                                    onClick={() => setCustomExchangeRate(null)}
                                                    className="px-4 py-2 bg-white dark:bg-slate-900 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-black border border-yellow-200 dark:border-yellow-900/30 hover:bg-yellow-50 dark:hover:bg-yellow-900/50 transition-all active:scale-95"
                                                >
                                                    إعادة للأصلي
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Final Calculation Summary */}
                                <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/20 transition-colors duration-700"></div>

                                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                        <div>
                                            <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                التكلفة النهائية المحسوبة للوحدة
                                            </p>
                                            <div className="flex items-baseline gap-4">
                                                <h3 className="text-5xl font-black text-white">
                                                    {formatArabicCurrency(calculatedCost?.costPerUnit || 0)}
                                                </h3>
                                                {costInfo.lastPurchase.currency !== 'LYD' && (
                                                    <p className="text-slate-400 border-r border-slate-700 pr-4 py-1">
                                                        <span className="block text-[10px] uppercase font-bold text-slate-500">تم الحساب بـ</span>
                                                        <span className="font-black text-sm">سعر صرف {formatArabicNumber(calculatedCost?.exchangeRateUsed || costInfo.lastPurchase.exchangeRate)}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowConfirmModal(true)}
                                            disabled={updating}
                                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                                        >
                                            {updating ? (
                                                <RefreshCw className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <Check className="w-6 h-6" />
                                            )}
                                            اعتماد التكلفة الجديدة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-900 rounded-2xl p-4 flex items-center gap-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-500 ring-4 ring-green-500/5">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-green-900 dark:text-green-300 font-black text-sm">{successMessage}</p>
                        <p className="text-green-700/60 dark:text-green-400/60 text-xs font-bold">تم تحديث بيانات الصنف في النظام بنجاح</p>
                    </div>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 text-green-400 transition-colors"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && costInfo?.lastPurchase && calculatedCost && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border-2 border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 mx-auto">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-4">تحديث تكلفة الصنف</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-center font-bold leading-relaxed mb-8">
                                هل أنت متأكد من رغبتك في تحديث تكلفة الشراء لهذا الصنف لتصبح <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">{formatArabicCurrency(calculatedCost.costPerUnit)}</span>؟
                                <br />
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">سيتم استخدام هذه التكلفة في حسابات الأرباح والتقارير المالية.</span>
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleUpdateCost()}
                                    disabled={updating}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {updating ? 'جاري التحديث...' : 'نعم، قم بالتحديث'}
                                </button>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-white px-6 py-4 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
