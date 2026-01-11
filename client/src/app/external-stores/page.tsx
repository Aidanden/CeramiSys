'use client';

import { useState } from 'react';
import { useGetStoresQuery, useCreateStoreMutation, useDeleteStoreMutation } from '@/state/externalStoresApi';
import { Plus, Search, Edit, Trash2, Users, Package, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ExternalStoresPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data, isLoading, refetch } = useGetStoresQuery({ page, limit: 10, search });
    const [createStore] = useCreateStoreMutation();
    const [deleteStore] = useDeleteStoreMutation();

    const handleCreateStore = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const storeData = {
            name: formData.get('name') as string,
            ownerName: formData.get('ownerName') as string,
            phone1: formData.get('phone1') as string,
            phone2: (formData.get('phone2') as string) || undefined,
            address: (formData.get('address') as string) || undefined,
            googleMapsUrl: (formData.get('googleMapsUrl') as string) || undefined,
        };

        console.log('📝 Creating store with data:', storeData);

        try {
            const result = await createStore(storeData).unwrap();
            console.log('✅ Store created successfully:', result);
            alert('✅ تم إنشاء المحل بنجاح');
            setShowCreateModal(false);
            refetch();
        } catch (error: any) {
            console.error('❌ Failed to create store:', error);
            console.error('❌ Error details:', {
                status: error?.status,
                data: error?.data,
                message: error?.message,
            });
            
            const errorMessage = error?.data?.error || error?.data?.message || error?.message || 'فشل في إنشاء المحل';
            alert(`❌ خطأ: ${errorMessage}`);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (confirm(`هل أنت متأكد من حذف المحل: ${name}?`)) {
            try {
                await deleteStore(id).unwrap();
                refetch();
            } catch (error) {
                console.error('Failed to delete store:', error);
                alert('فشل في حذف المحل');
            }
        }
    };

    return (
        <div className="p-6" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    إدارة المحلات الخارجية
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    إدارة المحلات الخارجية التي تبيع منتجات التقازي
                </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="البحث عن محل..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    إضافة محل جديد
                </button>
            </div>

            {/* Stores Grid */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
                </div>
            ) : data?.stores.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Package size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد محلات</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.stores.map((store) => (
                        <div
                            key={store.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                        {store.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {store.ownerName}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${store.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}
                                >
                                    {store.isActive ? 'نشط' : 'غير نشط'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">الهاتف:</span>
                                    <span>{store.phone1}</span>
                                </div>
                                {store.address && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">العنوان:</span>
                                        <span className="truncate">{store.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-center">
                                    <Users size={16} className="mx-auto text-gray-400 mb-1" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">مستخدمين</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {store._count?.users || 0}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <Package size={16} className="mx-auto text-gray-400 mb-1" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">منتجات</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {store._count?.productAssignments || 0}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <FileText size={16} className="mx-auto text-gray-400 mb-1" />
                                    <p className="text-xs text-gray-600 dark:text-gray-400">فواتير</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {store._count?.invoices || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href={`/external-stores/${store.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Edit size={16} />
                                    تفاصيل
                                </Link>
                                <button
                                    onClick={() => handleDelete(store.id, store.name)}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        السابق
                    </button>
                    <span className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                        {page} / {data.pagination.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.pagination.totalPages}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        التالي
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                إضافة محل جديد
                            </h2>

                            <form onSubmit={handleCreateStore} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        اسم المحل *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        اسم صاحب المحل *
                                    </label>
                                    <input
                                        type="text"
                                        name="ownerName"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            رقم الهاتف الأول *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone1"
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            رقم الهاتف الثاني
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone2"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        العنوان
                                    </label>
                                    <textarea
                                        name="address"
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        رابط خرائط جوجل
                                    </label>
                                    <input
                                        type="url"
                                        name="googleMapsUrl"
                                        placeholder="https://maps.google.com/..."
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        حفظ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
