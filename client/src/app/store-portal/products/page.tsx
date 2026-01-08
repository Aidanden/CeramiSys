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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المنتجات المتاحة</h1>
                    <p className="text-gray-600 dark:text-gray-400">قائمة المنتجات المخصصة للمحل</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="بحث عن منتج..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredProducts?.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Package size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد منتجات متاحة</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                        return (
                            <div
                                key={product.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                {product.sku}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <Package className="text-blue-600 dark:text-blue-400" size={20} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {showPrices && (
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">السعر</span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {Number(price).toLocaleString('en-US')} د.ل
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400">الوحدة</span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {product.unit}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-gray-600 dark:text-gray-400">المخزون المتوفر</span>
                                            <span className={`font-bold ${stock > 0
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                {stock}
                                            </span>
                                        </div>
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
