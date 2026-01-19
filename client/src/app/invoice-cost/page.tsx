"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    RefreshCw,
    FileText,
    Calendar,
    DollarSign,
    Package,
    TrendingUp,
    ArrowLeft,
    CheckCircle2,
    Edit2,
    Save
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
    const { data: userData } = useGetCurrentUserQuery();
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
        if (userData && !selectedCompanyId) {
            setSelectedCompanyId(userData.companyId);
        }
    }, [userData, selectedCompanyId]);

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
        <div className="p-6 max-w-7xl mx-auto" dir="rtl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">تكلفة الفاتورة</h1>
                            <p className="text-gray-600">حساب توزيع التكلفة على جميع منتجات الفاتورة</p>
                        </div>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        تحديث البيانات
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Purchase List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            فواتير المشتريات المعتمدة
                        </h2>

                        {/* Company Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                الشركة
                            </label>
                            <select
                                value={selectedCompanyId || ''}
                                onChange={(e) => {
                                    setSelectedCompanyId(e.target.value ? Number(e.target.value) : undefined);
                                    setSelectedPurchaseId(null);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="بحث برقم الفاتورة..."
                                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Purchases List */}
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : purchases.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    لا توجد فواتير معتمدة
                                </div>
                            ) : (
                                purchases.map((purchase) => (
                                    <button
                                        key={purchase.id}
                                        onClick={() => setSelectedPurchaseId(purchase.id)}
                                        className={`w-full text-right p-4 rounded-lg border-2 transition-all ${selectedPurchaseId === purchase.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900">
                                                {purchase.invoiceNumber || `#${purchase.id}`}
                                            </span>
                                            {selectedPurchaseId === purchase.id && (
                                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Package className="w-4 h-4" />
                                                {purchase.lines?.length || 0} صنف
                                            </div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign className="w-4 h-4" />
                                                {formatArabicCurrency(Number(purchase.total))}
                                            </div>
                                            {purchase.totalExpenses && Number(purchase.totalExpenses) > 0 && (
                                                <div className="flex items-center gap-2 text-orange-600">
                                                    <TrendingUp className="w-4 h-4" />
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
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">اختر فاتورة لعرض توزيع التكلفة</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            {/* Purchase Header */}
                            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        فاتورة {selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}
                                    </h2>
                                    <button
                                        onClick={() => setSelectedPurchaseId(null)}
                                        className="text-gray-600 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">إجمالي الفاتورة</p>
                                        <p className="font-bold text-gray-900">
                                            {formatArabicCurrency(Number(selectedPurchase.total))}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">المصروفات</p>
                                        <p className="font-bold text-orange-600">
                                            {formatArabicCurrency(Number(selectedPurchase.totalExpenses || 0))}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">سعر الصرف الأصلي</p>
                                        <p className="font-bold text-gray-600">
                                            {formatArabicNumber(Number(selectedPurchase.exchangeRate || 1))}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-xs text-gray-600 mb-1">العملة</p>
                                        <p className="font-bold text-green-600">
                                            {selectedPurchase.currency || 'LYD'}
                                        </p>
                                    </div>
                                </div>

                                {/* Custom Exchange Rate Input */}
                                {selectedPurchase.currency !== 'LYD' && (
                                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            سعر صرف مخصص لحساب التكلفة
                                        </label>
                                        <div className="flex gap-3 items-center">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={customExchangeRate || ''}
                                                onChange={(e) => setCustomExchangeRate(e.target.value ? Number(e.target.value) : null)}
                                                placeholder={`السعر الأصلي: ${selectedPurchase.exchangeRate}`}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            {customExchangeRate && (
                                                <button
                                                    onClick={() => setCustomExchangeRate(null)}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                >
                                                    إعادة تعيين
                                                </button>
                                            )}
                                        </div>
                                        {customExchangeRate && (
                                            <p className="text-xs text-yellow-700 mt-2">
                                                ⚠️ سيتم استخدام سعر الصرف {formatArabicNumber(customExchangeRate)} بدلاً من {formatArabicNumber(Number(selectedPurchase.exchangeRate))}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cost Distribution Table */}
                            <div className="p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                                    {customExchangeRate && (
                                        <div className="flex-1 bg-yellow-100 border border-yellow-300 rounded-lg p-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-yellow-700" />
                                            <p className="text-xs text-yellow-800 font-medium">
                                                يتم استخدام سعر صرف مخصص: {formatArabicNumber(customExchangeRate)} بدلاً من {formatArabicNumber(Number(selectedPurchase.exchangeRate))}
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleUpdateAllProductsCost}
                                        disabled={isUpdatingCost}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                    >
                                        {isUpdatingCost && updatingProductId === -1 ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                جاري تحديث الكل...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                تحديث تكلفة الكل
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div>
                                    <table className="w-full table-fixed">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="text-right py-3 px-3 font-bold text-gray-700 w-[25%]">المنتج</th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[7%]">الكمية</th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[8%]">
                                                    <span className="block">القيمة</span>
                                                    <span className="block text-xs font-normal text-gray-600">({selectedPurchase?.currency})</span>
                                                </th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[8%]">
                                                    <span className="block">القيمة</span>
                                                    <span className="block text-xs font-normal text-gray-600">(د.ل)</span>
                                                </th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[6%]">النسبة</th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[9%]">المصروفات</th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 w-[9%]">الإجمالي</th>
                                                <th className="text-right py-3 px-2 font-bold text-gray-700 bg-blue-50 w-[10%]">التكلفة/وحدة</th>
                                                <th className="text-center py-3 px-2 font-bold text-gray-700 bg-green-50 w-[13%]">تحديث</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {costDistribution.map((line, index) => (
                                                <tr key={line.productId} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                                    <td className="py-3 px-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900 leading-tight" title={line.productName}>{line.productName}</p>
                                                            <p className="text-sm text-gray-500 mt-0.5" title={line.productSku}>{line.productSku}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 text-gray-700 text-center">
                                                        {formatArabicNumber(line.qty)}
                                                    </td>
                                                    <td className="py-3 px-2 text-purple-700 font-medium">
                                                        {formatArabicNumber(line.subTotal.toFixed(0))}
                                                    </td>
                                                    <td className="py-3 px-2 text-gray-700 font-medium">
                                                        {formatArabicNumber(line.totalWithExpense.toFixed(0))}
                                                    </td>
                                                    <td className="py-3 px-2 text-center">
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium inline-block">
                                                            {formatArabicNumber(line.valuePercentage.toFixed(1))}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 text-orange-600 font-medium">
                                                        {formatArabicNumber(line.expenseShare.toFixed(0))}
                                                    </td>
                                                    <td className="py-3 px-2 text-green-600 font-bold">
                                                        {formatArabicNumber(line.totalInLYD.toFixed(0))}
                                                    </td>
                                                    <td className="py-3 px-2 bg-blue-50">
                                                        <span className="font-bold text-blue-900 block">
                                                            {formatArabicNumber(line.costPerUnit.toFixed(2))}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 bg-green-50 text-center">
                                                        <button
                                                            onClick={() => handleUpdateProductCost(line.productId, line.costPerUnit)}
                                                            disabled={isUpdatingCost && updatingProductId === line.productId}
                                                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUpdatingCost && updatingProductId === line.productId ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    جاري...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Save className="w-4 h-4" />
                                                                    تحديث
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Totals Row */}
                                            <tr className="bg-gray-800 text-white font-bold">
                                                <td className="py-3 px-3" colSpan={2}>الإجمالي</td>
                                                <td className="py-3 px-2">
                                                    {formatArabicNumber(totals.subTotalForeign.toFixed(0))}
                                                </td>
                                                <td className="py-3 px-2">
                                                    {formatArabicNumber(totals.subTotalLYD.toFixed(0))}
                                                </td>
                                                <td className="py-3 px-2 text-center">100%</td>
                                                <td className="py-3 px-2">
                                                    {formatArabicNumber(totals.expenseShare.toFixed(0))}
                                                </td>
                                                <td className="py-3 px-2">
                                                    {formatArabicNumber(totals.totalInLYD.toFixed(0))}
                                                </td>
                                                <td className="py-3 px-2">-</td>
                                                <td className="py-3 px-2">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                                        <p className="text-xs text-purple-700 mb-1">إجمالي ({selectedPurchase?.currency})</p>
                                        <p className="text-lg font-bold text-purple-900">
                                            {formatArabicNumber(totals.subTotalForeign.toFixed(0))}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                        <p className="text-xs text-blue-700 mb-1">إجمالي (د.ل)</p>
                                        <p className="text-lg font-bold text-blue-900">
                                            {formatArabicNumber(totals.subTotalLYD.toFixed(0))}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                                        <p className="text-xs text-orange-700 mb-1">المصروفات</p>
                                        <p className="text-lg font-bold text-orange-900">
                                            {formatArabicNumber(totals.expenseShare.toFixed(0))}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                        <p className="text-xs text-green-700 mb-1">الإجمالي النهائي</p>
                                        <p className="text-lg font-bold text-green-900">
                                            {formatArabicNumber(totals.totalInLYD.toFixed(0))}
                                        </p>
                                    </div>
                                </div>

                                {/* Formula Explanation */}
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                                        <TrendingUp className="w-4 h-4" />
                                        طريقة الحساب
                                    </h3>
                                    <div className="text-xs text-blue-800 space-y-0.5">
                                        <p>١. تحويل قيمة المنتج إلى دينار = قيمة المنتج ({selectedPurchase?.currency}) × سعر الصرف</p>
                                        <p>٢. حساب نسبة المنتج = (قيمة المنتج بالدينار ÷ إجمالي الفاتورة بالدينار) × ١٠٠</p>
                                        <p>٣. نصيب المنتج من المصروفات = (النسبة ÷ ١٠٠) × إجمالي المصروفات</p>
                                        <p>٤. الإجمالي النهائي = قيمة المنتج بالدينار + نصيب المصروفات</p>
                                        <p>٥. التكلفة للوحدة = الإجمالي النهائي ÷ الكمية</p>
                                        <p className="text-orange-700 font-medium mt-1">⚠️ ملاحظة: المنتج الأعلى قيمة يأخذ نسبة أكبر من المصروفات</p>
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

