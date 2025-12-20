"use client";

import React, { useState, useMemo } from 'react';
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
    ArrowLeft,
    DollarSign,
    AlertCircle
} from 'lucide-react';
import {
    useGetProductsWithCostInfoQuery,
    useGetProductCostInfoQuery,
    useCalculateCostWithCustomRateMutation,
    useUpdateProductCostMutation,
    ProductWithCostInfo
} from '@/state/productCostApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

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

    const [calculateWithCustomRate, { isLoading: calculating }] = useCalculateCostWithCustomRateMutation();
    const [updateProductCost, { isLoading: updating }] = useUpdateProductCostMutation();

    // Computed values
    const products = productsData?.products || [];
    const pagination = productsData?.pagination;

    // Calculate cost with custom rate
    const calculatedCost = useMemo(() => {
        if (!costInfo?.lastPurchase) return null;

        const rate = customExchangeRate || costInfo.lastPurchase.exchangeRate;
        const totalWithExpenses = costInfo.lastPurchase.totalWithExpenses;
        const totalInLYD = totalWithExpenses * rate;
        const qty = costInfo.lastPurchase.qty;

        return {
            totalInLYD: Math.round(totalInLYD * 100) / 100,
            costPerUnit: qty > 0 ? Math.round((totalInLYD / qty) * 10000) / 10000 : 0,
            exchangeRate: rate
        };
    }, [costInfo, customExchangeRate]);

    // Handlers
    const handleSelectProduct = (product: ProductWithCostInfo) => {
        setSelectedProductId(product.id);
        setCustomExchangeRate(null);
        setSuccessMessage(null);
    };

    const handleUpdateCost = async () => {
        if (!costInfo || !costInfo.lastPurchase || !calculatedCost) return;

        try {
            const result = await updateProductCost({
                productId: costInfo.productId,
                newCost: calculatedCost.costPerUnit,
                purchaseId: costInfo.lastPurchase.id,
                exchangeRateUsed: calculatedCost.exchangeRate
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
        <div className="p-6 max-w-7xl mx-auto" dir="rtl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">إدارة تكلفة الأصناف</h1>
                            <p className="text-gray-600">احتساب وتحديث تكلفة الأصناف بناءً على آخر فاتورة مشتريات</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { refetchProducts(); if (selectedProductId) refetchCostInfo(); }}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        تحديث البيانات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products List */}
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
                            <Package className="w-5 h-5 text-gray-500" />
                            قائمة الأصناف
                        </h2>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="ابحث بالاسم أو الكود..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="w-full pr-9 pl-4 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {productsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p>لا توجد أصناف</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {products.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        className={`w-full text-right p-3 hover:bg-gray-50 transition-all ${selectedProductId === product.id ? 'bg-blue-50 border-r-4 border-blue-600' : 'border-r-4 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-semibold text-sm truncate ${selectedProductId === product.id ? 'text-blue-700' : 'text-gray-800'}`}>
                                                    {product.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{product.sku}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${product.cost ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {product.cost ? formatArabicCurrency(product.cost) : 'بدون تكلفة'}
                                                    </span>
                                                    {product.hasLastPurchase && (
                                                        <span className="text-[10px] text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                                                            <FileText className="w-3 h-3" />
                                                            فاتورة
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {selectedProductId === product.id && (
                                                <ArrowLeft className="w-4 h-4 text-blue-600 mt-1" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-600 font-medium">
                                {formatArabicNumber(page)} / {formatArabicNumber(pagination.pages)}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Cost Details */}
                <div className="lg:col-span-2">
                    {!selectedProductId ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">اختر صنفاً لعرض التفاصيل</h3>
                            <p className="text-gray-500 text-sm">قم باختيار صنف من القائمة لعرض تفاصيل التكلفة وآخر فاتورة مشتريات</p>
                        </div>
                    ) : costInfoLoading ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-500">جاري تحميل البيانات...</p>
                        </div>
                    ) : costInfo ? (
                        <div className="space-y-6">
                            {/* Success Message */}
                            {successMessage && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                        </div>
                                        <p className="text-green-800 font-medium text-sm">{successMessage}</p>
                                    </div>
                                    <button
                                        onClick={() => setSuccessMessage(null)}
                                        className="text-green-600 hover:text-green-800"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {/* Product Info Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">{costInfo.productName}</h2>
                                        <p className="text-gray-500 font-mono text-sm">{costInfo.productSku}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="text-left bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                            <span className="block text-xs text-gray-500 mb-1">الوحدة</span>
                                            <span className="font-bold text-gray-800">{costInfo.unit || '-'}</span>
                                        </div>
                                        <div className="text-left bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                            <span className="block text-xs text-gray-500 mb-1">التكلفة الحالية</span>
                                            <span className="font-bold text-gray-800">
                                                {costInfo.currentCost ? formatArabicCurrency(costInfo.currentCost) : 'غير محددة'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Last Purchase Details */}
                            {costInfo.lastPurchase ? (
                                <>
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                تفاصيل آخر فاتورة مشتريات
                                            </h3>
                                            <span className="text-xs text-gray-500 font-mono">
                                                #{costInfo.lastPurchase.invoiceNumber || costInfo.lastPurchase.id}
                                            </span>
                                        </div>

                                        <div className="p-5">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">تاريخ الفاتورة</p>
                                                    <p className="font-medium text-gray-900 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(costInfo.lastPurchase.purchaseDate).toLocaleDateString('ar-LY')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">العملة</p>
                                                    <p className="font-medium text-gray-900">{getCurrencyLabel(costInfo.lastPurchase.currency)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">سعر الصرف</p>
                                                    <p className="font-medium text-gray-900">{formatArabicNumber(costInfo.lastPurchase.exchangeRate)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">إجمالي الفاتورة</p>
                                                    <p className="font-medium text-gray-900">{formatArabicCurrency(costInfo.lastPurchase.totalWithExpenses)}</p>
                                                </div>
                                            </div>

                                            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الوحدة</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        <tr>
                                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                                {formatArabicNumber(costInfo.lastPurchase.qty)}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-900">
                                                                {formatArabicNumber(costInfo.lastPurchase.unitPrice)} {getCurrencySymbol(costInfo.lastPurchase.currency)}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-gray-900">
                                                                {formatArabicNumber(costInfo.lastPurchase.subTotal)} {getCurrencySymbol(costInfo.lastPurchase.currency)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Expenses Section */}
                                            <div className="bg-orange-50 rounded-lg border border-orange-100 p-4">
                                                <h4 className="font-bold text-orange-800 text-sm mb-3 flex items-center gap-2">
                                                    <Wallet className="w-4 h-4" />
                                                    توزيع المصروفات
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                    <div className="flex justify-between md:block">
                                                        <span className="text-orange-600 block mb-1 text-xs">إجمالي مصروفات الفاتورة</span>
                                                        <span className="font-bold text-orange-900">{formatArabicCurrency(costInfo.lastPurchase.totalExpenses)}</span>
                                                    </div>
                                                    <div className="flex justify-between md:block">
                                                        <span className="text-orange-600 block mb-1 text-xs">نسبة التحمل</span>
                                                        <span className="font-bold text-orange-900">{formatArabicNumber(costInfo.lastPurchase.expenseSharePercentage)}%</span>
                                                    </div>
                                                    <div className="flex justify-between md:block">
                                                        <span className="text-orange-600 block mb-1 text-xs">نصيب الصنف</span>
                                                        <span className="font-bold text-orange-900">
                                                            {formatArabicNumber(costInfo.lastPurchase.expenseShareAmount)} {getCurrencySymbol(costInfo.lastPurchase.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculation Card */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                                <BarChart3 className="w-4 h-4 text-green-600" />
                                                احتساب التكلفة النهائية
                                            </h3>
                                        </div>
                                        <div className="p-5">
                                            {/* Custom Exchange Rate Input */}
                                            {costInfo.lastPurchase.currency !== 'LYD' && (
                                                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                    <label className="block text-sm font-medium text-yellow-800 mb-2">
                                                        سعر الصرف المحتسب
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={customExchangeRate ?? costInfo.lastPurchase.exchangeRate}
                                                            onChange={(e) => setCustomExchangeRate(parseFloat(e.target.value) || null)}
                                                            className="w-32 px-3 py-1.5 border border-yellow-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                                        />
                                                        <span className="text-yellow-700 text-sm">د.ل / {getCurrencySymbol(costInfo.lastPurchase.currency)}</span>
                                                        {customExchangeRate && customExchangeRate !== costInfo.lastPurchase.exchangeRate && (
                                                            <button
                                                                onClick={() => setCustomExchangeRate(null)}
                                                                className="text-xs text-yellow-600 hover:text-yellow-800 underline mr-2"
                                                            >
                                                                استعادة الأصلي
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 rounded-lg p-6 border border-gray-200">
                                                <div className="mb-4 md:mb-0 text-center md:text-right">
                                                    <p className="text-sm text-gray-500 mb-1">التكلفة الجديدة المحسوبة (للوحدة)</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-3xl font-bold text-blue-600">
                                                            {formatArabicCurrency(calculatedCost?.costPerUnit || costInfo.lastPurchase.calculatedCostPerUnit)}
                                                        </p>
                                                        {costInfo.lastPurchase.currency !== 'LYD' && (
                                                            <span className="text-xs text-gray-400">
                                                                (بسعر صرف {formatArabicNumber(calculatedCost?.exchangeRate || costInfo.lastPurchase.exchangeRate)})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setShowConfirmModal(true)}
                                                    disabled={updating}
                                                    className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    اعتماد التكلفة الجديدة
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <AlertCircle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-1">لا توجد فاتورة مشتريات</h3>
                                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                                        لم يتم العثور على أي فاتورة مشتريات معتمدة لهذا الصنف. لا يمكن احتساب التكلفة بدون فاتورة مرجعية.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirmModal && costInfo && calculatedCost && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">تأكيد تحديث التكلفة</h3>
                            <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                <p className="text-xs text-blue-600 mb-1">الصنف</p>
                                <p className="font-medium text-blue-900 text-sm">{costInfo.productName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-gray-200 p-3 rounded">
                                    <p className="text-xs text-gray-500 mb-1">حالياً</p>
                                    <p className="font-bold text-gray-700">
                                        {costInfo.currentCost ? formatArabicCurrency(costInfo.currentCost) : '-'}
                                    </p>
                                </div>
                                <div className="border border-green-200 bg-green-50 p-3 rounded">
                                    <p className="text-xs text-green-600 mb-1">الجديد</p>
                                    <p className="font-bold text-green-700">
                                        {formatArabicCurrency(calculatedCost.costPerUnit)}
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-3 rounded">
                                <p>سيتم توثيق هذا التغيير في سجلات النظام مع ربطه بالفاتورة رقم <strong>#{costInfo.lastPurchase?.invoiceNumber}</strong></p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 text-sm font-medium"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleUpdateCost}
                                disabled={updating}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                            >
                                {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                تأكيد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
