'use client';

import { useGetAvailableProductsQuery, useGetCurrentUserQuery } from '@/state/storePortalApi';
import { Package, Search } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StoreProductsPage() {
    const [search, setSearch] = useState('');
    const { data: currentUser, refetch: refetchCurrentUser } = useGetCurrentUserQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const { data: products, isLoading, refetch } = useGetAvailableProductsQuery();

    // إعداد إظهار الأسعار
    const showPrices = currentUser?.store?.showPrices === true;

    // إعادة جلب بيانات المستخدم عند mount
    useEffect(() => {
        refetchCurrentUser();
    }, [refetchCurrentUser]);

    // إعادة جلب المنتجات عند تغيير المستخدم
    useEffect(() => {
        if (currentUser) {
            refetch();
        }
    }, [currentUser?.user?.storeId, refetch]);

    const filteredProducts = products?.filter((item: any) =>
        item.product.name.toLowerCase().includes(search.toLowerCase()) ||
        item.product.sku.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <Package className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">المنتجات المتاحة</h1>
                            <p className="text-slate-500 dark:text-slate-400">قائمة المنتجات المخصصة والمتاحة للطلب الفوري</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="البحث بالاسم أو الكود (SKU)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pr-10 pl-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="font-bold text-slate-400 animate-pulse">جاري تحميل المنتجات...</p>
                </div>
            ) : filteredProducts?.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">لا توجد منتجات مطابقة</h3>
                    <p className="text-slate-400 font-medium">حاول تغيير كلمة البحث أو فلاتر البحث</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredProducts?.map((item: any) => {
                        const product = item.product;

                        // استخراج السعر (TG أو TAQAZI)
                        const priceObj = product.prices?.find((p: any) =>
                            p.company?.code === 'TAQAZI' || p.company?.code === 'TG'
                        ) || product.prices?.[0];
                        const price = priceObj?.sellPrice || priceObj?.SellPrice || 0;

                        // استخراج الكمية (boxes أو qty)
                        const stockObj = product.stocks?.find((s: any) =>
                            s.company?.code === 'TAQAZI' || s.company?.code === 'TG'
                        ) || product.stocks?.[0];
                        const stock = stockObj?.qty || stockObj?.Qty ||
                            stockObj?.boxes || stockObj?.Boxes || 0;

                        const isLowStock = stock <= 10;

                        return (
                            <div
                                key={product.id}
                                className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden hover:shadow-md transition-all duration-300 group"
                            >
                                <div className="p-0">
                                    {/* Product Image Placeholder / Header */}
                                    <div className="bg-slate-100 dark:bg-gray-700 h-48 flex items-center justify-center relative relative group-hover:bg-blue-600 transition-colors duration-500">
                                        <Package className="text-slate-300 group-hover:text-blue-200 transition-colors" size={64} />
                                        <div className="absolute top-4 right-4">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${isLowStock
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                }`}>
                                                {isLowStock ? 'مخزون منخفض' : 'متوفر'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {product.name}
                                            </h3>
                                            <p className="text-xs text-blue-500 font-bold tracking-widest uppercase">
                                                {product.sku}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-gray-700/50 pt-5">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">الكمية المتاحة</p>
                                                <p className={`text-xl font-bold ${isLowStock ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>
                                                    {Number(stock).toLocaleString('en-US', { numberingSystem: 'latn' })}
                                                    <span className="text-xs mr-1 font-medium text-slate-400">{product.unit || 'صندوق'}</span>
                                                </p>
                                            </div>
                                            {showPrices && (
                                                <div className="text-left font-sans">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">سعر المبيع</p>
                                                    <p className="text-xl font-bold text-blue-600">
                                                        {Number(price).toLocaleString('en-US', { numberingSystem: 'latn' })}
                                                        <span className="text-[10px] mr-1">د.ل</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {product.unit === 'صندوق' && product.unitsPerBox && (
                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">معلومات الصندوق:</p>
                                                <p className="text-xs font-bold text-blue-800 dark:text-blue-200">
                                                    يحتوي الصندوق على {Number(product.unitsPerBox).toLocaleString('en-US', { numberingSystem: 'latn' })} م²
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
