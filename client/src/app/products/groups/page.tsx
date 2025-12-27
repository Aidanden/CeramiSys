"use client";

import React, { useState, useMemo } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Shield,
    Percent,
    Package,
    Search,
    Check,
    X,
    Loader2
} from 'lucide-react';
import {
    useGetProductGroupsQuery,
    useCreateProductGroupMutation,
    useUpdateProductGroupMutation,
    useDeleteProductGroupMutation,
    useGetProductsWithGroupStatusQuery,
    useAssignProductsToGroupMutation,
    ProductGroup,
    ProductWithGroupStatus
} from '@/state/productGroupsApi';
import useNotifications from '@/hooks/useNotifications';
import { formatArabicNumber } from '@/utils/formatArabicNumbers';

const ProductGroupsPage = () => {
    const notifications = useNotifications();
    const { data: groupsResponse, isLoading, refetch } = useGetProductGroupsQuery();
    const [createGroup] = useCreateProductGroupMutation();
    const [updateGroup] = useUpdateProductGroupMutation();
    const [deleteGroup] = useDeleteProductGroupMutation();
    const [assignProducts, { isLoading: isAssigning }] = useAssignProductsToGroupMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);

    // حالات نافذة إضافة الأصناف
    const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
    const [selectedGroupForProducts, setSelectedGroupForProducts] = useState<ProductGroup | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [skuSearchTerm, setSkuSearchTerm] = useState('');
    const [nameSearchTerm, setNameSearchTerm] = useState('');

    const groups = groupsResponse?.data || [];

    // جلب الأصناف عند فتح نافذة إضافة الأصناف
    const { data: productsResponse, isLoading: isLoadingProducts } = useGetProductsWithGroupStatusQuery(
        selectedGroupForProducts?.id,
        { skip: !isProductsModalOpen }
    );

    const products = productsResponse?.data || [];

    // تصفية الأصناف حسب البحث
    // الكود: مطابقة تامة (=)
    // الاسم: مطابقة جزئية (like)
    const filteredProducts = useMemo(() => {
        let result = products;
        
        // البحث بالكود - مطابقة تامة
        if (skuSearchTerm.trim()) {
            result = result.filter(p => p.sku === skuSearchTerm.trim());
        }
        
        // البحث بالاسم - مطابقة جزئية (like)
        if (nameSearchTerm.trim()) {
            const term = nameSearchTerm.toLowerCase().trim();
            result = result.filter(p => p.name.toLowerCase().includes(term));
        }
        
        return result;
    }, [products, skuSearchTerm, nameSearchTerm]);

    const handleOpenModal = (group: ProductGroup | null = null) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingGroup(null);
        setIsModalOpen(false);
    };

    const handleOpenProductsModal = (group: ProductGroup) => {
        setSelectedGroupForProducts(group);
        setSelectedProductIds([]);
        setSkuSearchTerm('');
        setNameSearchTerm('');
        setIsProductsModalOpen(true);
    };

    const handleCloseProductsModal = () => {
        setSelectedGroupForProducts(null);
        setSelectedProductIds([]);
        setSkuSearchTerm('');
        setNameSearchTerm('');
        setIsProductsModalOpen(false);
    };

    const handleToggleProduct = (productId: number) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        const unassignedProducts = filteredProducts.filter(p => !p.isInGroup && p.groupId !== selectedGroupForProducts?.id);
        if (selectedProductIds.length === unassignedProducts.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(unassignedProducts.map(p => p.id));
        }
    };

    const handleAssignProducts = async () => {
        if (!selectedGroupForProducts || selectedProductIds.length === 0) return;

        try {
            await assignProducts({
                groupId: selectedGroupForProducts.id,
                productIds: selectedProductIds
            }).unwrap();

            notifications.custom.success(`تم إضافة ${selectedProductIds.length} صنف إلى المجموعة بنجاح`);
            handleCloseProductsModal();
            refetch();
        } catch (error: any) {
            notifications.custom.error(error.data?.message || 'حدث خطأ أثناء إضافة الأصناف');
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name') as string,
            maxDiscountPercentage: Number(formData.get('maxDiscountPercentage')),
        };

        try {
            if (editingGroup) {
                await updateGroup({ id: editingGroup.id, data }).unwrap();
                notifications.custom.success('تم تحديث المجموعة بنجاح');
            } else {
                await createGroup(data).unwrap();
                notifications.custom.success('تم إضافة المجموعة بنجاح');
            }
            handleCloseModal();
            refetch();
        } catch (error: any) {
            notifications.custom.error(error.data?.message || 'حدث خطأ ما');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
            try {
                await deleteGroup(id).unwrap();
                notifications.custom.success('تم حذف المجموعة بنجاح');
                refetch();
            } catch (error: any) {
                notifications.custom.error(error.data?.message || 'حدث خطأ ما');
            }
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">مجموعات الأصناف</h1>
                    <p className="text-slate-500 mt-1">إدارة مجموعات الأصناف والحدود القصوى للخصومات</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة مجموعة</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">اسم المجموعة</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">أقصى خصم (%)</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">عدد الأصناف</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-2/3"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                </tr>
                            ))
                        ) : groups.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    لا توجد مجموعات مضافة حالياً
                                </td>
                            </tr>
                        ) : (
                            groups.map((group) => (
                                <tr key={group.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-slate-700">{group.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                            {formatArabicNumber(group.maxDiscountPercentage)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">
                                        {formatArabicNumber(group._count?.products || 0)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenProductsModal(group)}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                                title="إضافة أصناف"
                                            >
                                                <Package className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(group)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(group.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* نافذة إضافة/تعديل المجموعة */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingGroup ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المجموعة *</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingGroup?.name}
                                    required
                                    placeholder="مثال: أصناف الفئة الأولى"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">الحد الأقصى للخصم (%) *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="maxDiscountPercentage"
                                        defaultValue={editingGroup?.maxDiscountPercentage}
                                        required
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none pr-10"
                                        placeholder="0.0"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center shadow-none pointer-events-none">
                                        <Percent className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    <span>سيتم منع أي موظف من تجاوز هذه النسبة عند البيع</span>
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    {editingGroup ? 'حفظ التغييرات' : 'إضافة المجموعة'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* نافذة إضافة الأصناف للمجموعة */}
            {isProductsModalOpen && selectedGroupForProducts && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* رأس النافذة */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    إضافة أصناف إلى المجموعة
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    المجموعة: <span className="font-semibold text-blue-600">{selectedGroupForProducts.name}</span>
                                </p>
                            </div>
                            <button onClick={handleCloseProductsModal} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl">&times;</button>
                        </div>

                        {/* شريط البحث */}
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <div className="grid grid-cols-2 gap-3">
                                {/* البحث بالكود - مطابقة تامة */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">كود الصنف (مطابقة تامة)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={skuSearchTerm}
                                            onChange={(e) => setSkuSearchTerm(e.target.value)}
                                            placeholder="أدخل كود الصنف بالضبط..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                
                                {/* البحث بالاسم - مطابقة جزئية */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">اسم الصنف (بحث جزئي)</label>
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={nameSearchTerm}
                                            onChange={(e) => setNameSearchTerm(e.target.value)}
                                            placeholder="ابحث في اسم الصنف..."
                                            className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {selectedProductIds.length === filteredProducts.filter(p => !p.isInGroup && p.groupId !== selectedGroupForProducts?.id).length
                                        ? 'إلغاء تحديد الكل'
                                        : 'تحديد الكل'}
                                </button>
                                <span className="text-sm text-slate-500">
                                    {selectedProductIds.length > 0 && (
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                                            تم تحديد {formatArabicNumber(selectedProductIds.length)} صنف
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* قائمة الأصناف */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                    <span className="mr-3 text-slate-600">جاري تحميل الأصناف...</span>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    لا توجد أصناف متطابقة مع البحث
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredProducts.map((product) => {
                                        const isAlreadyInThisGroup = product.groupId === selectedGroupForProducts.id;
                                        const isInAnotherGroup = product.groupId !== null && !isAlreadyInThisGroup;
                                        const isSelected = selectedProductIds.includes(product.id);

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => !isAlreadyInThisGroup && handleToggleProduct(product.id)}
                                                className={`
                                                    flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer
                                                    ${isAlreadyInThisGroup
                                                        ? 'bg-emerald-50 border-emerald-200 cursor-not-allowed opacity-70'
                                                        : isSelected
                                                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                    }
                                                `}
                                            >
                                                {/* مربع التحديد */}
                                                <div className={`
                                                    w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                                                    ${isAlreadyInThisGroup
                                                        ? 'bg-emerald-500 border-emerald-500'
                                                        : isSelected
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'border-slate-300'
                                                    }
                                                `}>
                                                    {(isAlreadyInThisGroup || isSelected) && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>

                                                {/* معلومات الصنف */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-800 truncate">{product.name}</span>
                                                        {isAlreadyInThisGroup && (
                                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                                                مضاف مسبقاً
                                                            </span>
                                                        )}
                                                        {isInAnotherGroup && (
                                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                                في مجموعة أخرى
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{product.sku}</span>
                                                        <span>{product.companyName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* أزرار الإجراءات */}
                        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={handleAssignProducts}
                                disabled={selectedProductIds.length === 0 || isAssigning}
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>جاري الإضافة...</span>
                                    </>
                                ) : (
                                    <>
                                        <Package className="w-5 h-5" />
                                        <span>إضافة {selectedProductIds.length > 0 ? `(${formatArabicNumber(selectedProductIds.length)})` : ''} للمجموعة</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseProductsModal}
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductGroupsPage;
