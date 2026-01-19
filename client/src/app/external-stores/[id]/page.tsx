'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Users, Package, FileText, Phone, MapPin, RefreshCw, AlertCircle, Plus, Edit, Search, X, Trash2, Settings } from 'lucide-react';
import {
    useGetStoreByIdQuery,
    useUpdateStoreMutation,
    useCreateStoreUserMutation,
    useUpdateStoreUserMutation,
    useAssignProductsMutation,
} from '@/state/externalStoresApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetAllSettingsQuery } from '@/state/settingsApi';
import { useToast } from '@/components/ui/Toast';

export default function ExternalStoreDetailsPage() {
    const params = useParams<{ id: string }>();
    const storeId = Number(params?.id);

    const {
        data: store,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useGetStoreByIdQuery(storeId, {
        skip: !storeId,
    });

    const toast = useToast();

    const [storeForm, setStoreForm] = useState({
        name: '',
        ownerName: '',
        phone1: '',
        phone2: '',
        address: '',
        googleMapsUrl: '',
        isActive: true,
        showPrices: true,
    });
    const [newUserForm, setNewUserForm] = useState({ username: '', password: '' });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userEditForm, setUserEditForm] = useState({ username: '', password: '', isActive: true });

    // Product Management State
    const [activeProductTab, setActiveProductTab] = useState<'list' | 'manage'>('list');
    const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
    const [skuSearch, setSkuSearch] = useState('');
    const [nameSearch, setNameSearch] = useState('');

    const [updateStore, { isLoading: isUpdatingStore }] = useUpdateStoreMutation();
    const [createStoreUser, { isLoading: isCreatingUser }] = useCreateStoreUserMutation();
    const [updateStoreUser, { isLoading: isUpdatingUser }] = useUpdateStoreUserMutation();
    const [assignProducts, { isLoading: isAssigningProducts }] = useAssignProductsMutation();

    // Get company ID from settings for product filtering
    const { data: allSettings } = useGetAllSettingsQuery();
    const externalStoreCompanyId = useMemo(() => {
        const setting = allSettings?.find(s => s.key === 'EXTERNAL_STORE_COMPANY_ID');
        return setting ? parseInt(setting.value) : 1;
    }, [allSettings]);

    const { data: productsResponse, isLoading: isLoadingProducts } = useGetProductsQuery(
        {
            limit: 10000,
            page: 1,
            companyId: externalStoreCompanyId,
            strict: true
        },
        { skip: !storeId }
    );
    const availableProducts = productsResponse?.data?.products ?? [];

    useEffect(() => {
        if (store) {
            setStoreForm({
                name: store.name || '',
                ownerName: store.ownerName || '',
                phone1: store.phone1 || '',
                phone2: store.phone2 || '',
                address: store.address || '',
                googleMapsUrl: store.googleMapsUrl || '',
                isActive: !!store.isActive,
                showPrices: store.showPrices !== undefined ? store.showPrices : true,
            });
        }
    }, [store]);

    useEffect(() => {
        if (store?.productAssignments) {
            setSelectedProducts(store.productAssignments.map((assignment) => assignment.productId));
        } else {
            setSelectedProducts([]);
        }
    }, [store?.productAssignments]);

    const filteredProducts = useMemo(() => {
        let result = availableProducts;

        if (skuSearch.trim()) {
            const term = skuSearch.trim().toLowerCase();
            result = result.filter((product) => product.sku.toLowerCase() === term);
        }

        if (nameSearch.trim()) {
            const term = nameSearch.trim().toLowerCase();
            result = result.filter((product) => product.name.toLowerCase().includes(term));
        }

        return result;
    }, [availableProducts, skuSearch, nameSearch]);

    const handleStoreFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!storeId) return;

        try {
            await updateStore({
                id: storeId,
                data: {
                    name: storeForm.name,
                    ownerName: storeForm.ownerName,
                    phone1: storeForm.phone1,
                    phone2: storeForm.phone2 || undefined,
                    address: storeForm.address || undefined,
                    googleMapsUrl: storeForm.googleMapsUrl || undefined,
                    isActive: storeForm.isActive,
                    showPrices: storeForm.showPrices,
                },
            }).unwrap();

            toast.success('تم الحفظ', 'تم تحديث بيانات المحل بنجاح');
            // No manual refetch needed, tags handle it
        } catch (err: any) {
            toast.error('فشل التحديث', err?.data?.error || 'حدث خطأ أثناء تحديث بيانات المحل');
        }
    };

    const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!storeId || !newUserForm.username || !newUserForm.password) return;

        try {
            await createStoreUser({ storeId, data: newUserForm }).unwrap();
            toast.success('تمت الإضافة', 'تم إنشاء مستخدم جديد للمحل');
            setNewUserForm({ username: '', password: '' });
        } catch (err: any) {
            toast.error('تعذر إضافة المستخدم', err?.data?.error || 'حدث خطأ أثناء إنشاء المستخدم');
        }
    };

    const handleStartEditingUser = (user: { id: string; username: string; isActive: boolean }) => {
        setEditingUserId(user.id);
        setUserEditForm({ username: user.username, password: '', isActive: user.isActive });
    };

    const handleCancelEditUser = () => {
        setEditingUserId(null);
        setUserEditForm({ username: '', password: '', isActive: true });
    };

    const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!storeId || !editingUserId) return;

        const payload: any = {
            username: userEditForm.username,
            isActive: userEditForm.isActive,
        };

        if (!payload.username) {
            toast.warning('بيانات ناقصة', 'يجب إدخال اسم المستخدم');
            return;
        }

        if (userEditForm.password) {
            payload.password = userEditForm.password;
        }

        try {
            await updateStoreUser({ storeId, userId: editingUserId, data: payload }).unwrap();
            toast.success('تم التحديث', 'تم تعديل بيانات المستخدم بنجاح');
            handleCancelEditUser();
        } catch (err: any) {
            toast.error('فشل التعديل', err?.data?.error || 'حدث خطأ أثناء تعديل المستخدم');
        }
    };

    const handleToggleProduct = (productId: number) => {
        setSelectedProducts((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const handleAssignProducts = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!storeId) return;

        if (selectedProducts.length === 0) {
            toast.warning('حدد المنتجات', 'يجب اختيار منتج واحد على الأقل');
            return;
        }

        try {
            await assignProducts({ storeId, data: { productIds: selectedProducts } }).unwrap();
            toast.success('تم الحفظ', 'تم تحديث قائمة المنتجات بنجاح');
            setActiveProductTab('list'); // Switch back to list view after saving
        } catch (err: any) {
            toast.error('فشل حفظ المنتجات', err?.data?.error || 'حدث خطأ أثناء ربط المنتجات');
        }
    };

    const renderStatusBadge = () => (
        <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-colors ${store?.isActive
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                }`}
        >
            {store?.isActive ? 'نشط' : 'غير نشط'}
        </span>
    );

    const renderContent = () => {
        if (!storeId) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">رقم المحل غير صالح</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        تأكد من صحة الرابط أو عد إلى القائمة الرئيسية لاختيار محل آخر.
                    </p>
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                    </div>
                    <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
                        جاري تحميل البيانات...
                    </p>
                </div>
            );
        }

        if (error || !store) {
            return (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">تعذر تحميل البيانات</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-lg">
                        {(error as any)?.data?.error || 'حدث خطأ غير متوقع أثناء محاولة الوصول إلى بيانات المحل.'}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
                    >
                        <RefreshCw size={20} className={isFetching ? 'animate-spin' : ''} />
                        إعادة المحاولة
                    </button>
                </div>
            );
        }

        const users = store.users ?? [];
        const productAssignments = store.productAssignments ?? [];

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Section */}
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400" />
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Package size={200} />
                    </div>

                    <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                                    {store.name}
                                </h1>
                                {renderStatusBadge()}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-lg">
                                <Users size={18} />
                                <span>المالك: </span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{store.ownerName}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => refetch()}
                                className="group flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-gray-200 dark:border-gray-600"
                            >
                                <RefreshCw size={18} className={`transition-transform group-hover:rotate-180 ${isFetching ? 'animate-spin' : ''}`} />
                                <span>تحديث البيانات</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats in Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl text-blue-600 dark:text-blue-200">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">المستخدمين</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-200">
                                <Package size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">المنتجات</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{productAssignments.length}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 dark:bg-gray-900/10 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-200">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">الفواتير</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{store._count?.invoices ?? 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column: Forms */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Basic Info Form */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Edit className="text-blue-600" size={20} />
                                    تعديل البيانات الأساسية
                                </h2>
                            </div>
                            <div className="p-8">
                                <form onSubmit={handleStoreFormSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">اسم المحل</label>
                                            <input
                                                type="text"
                                                value={storeForm.name}
                                                onChange={(e) => setStoreForm((prev) => ({ ...prev, name: e.target.value }))}
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="أدخل اسم المحل"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">اسم المالك</label>
                                            <input
                                                type="text"
                                                value={storeForm.ownerName}
                                                onChange={(e) => setStoreForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="أدخل اسم المالك"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف الأول</label>
                                            <input
                                                type="tel"
                                                value={storeForm.phone1}
                                                onChange={(e) => setStoreForm((prev) => ({ ...prev, phone1: e.target.value }))}
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="09X XXXXXXX"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف الثاني (اختياري)</label>
                                            <input
                                                type="tel"
                                                value={storeForm.phone2}
                                                onChange={(e) => setStoreForm((prev) => ({ ...prev, phone2: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="09X XXXXXXX"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                                            <textarea
                                                value={storeForm.address}
                                                onChange={(e) => setStoreForm((prev) => ({ ...prev, address: e.target.value }))}
                                                rows={2}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                                placeholder="عنوان المحل بالتفصيل"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رابط خرائط جوجل</label>
                                            <div className="relative">
                                                <MapPin className="absolute right-4 top-3.5 text-gray-400" size={18} />
                                                <input
                                                    type="url"
                                                    value={storeForm.googleMapsUrl}
                                                    onChange={(e) => setStoreForm((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
                                                    className="w-full pr-12 pl-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    placeholder="https://maps.google.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <label className="inline-flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={storeForm.isActive}
                                                        onChange={(e) => setStoreForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                                                    تفعيل حساب المحل
                                                </span>
                                            </label>

                                            <label className="inline-flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={storeForm.showPrices}
                                                        onChange={(e) => setStoreForm((prev) => ({ ...prev, showPrices: e.target.checked }))}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 transition-colors">
                                                    إظهار الأسعار في البوابة
                                                </span>
                                            </label>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isUpdatingStore}
                                                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUpdatingStore ? (
                                                    <>
                                                        <RefreshCw size={18} className="animate-spin" />
                                                        جاري الحفظ...
                                                    </>
                                                ) : (
                                                    'حفظ التغييرات'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Users Section */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="text-blue-600" size={20} />
                                    إدارة المستخدمين
                                </h2>
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                                    {users.length} مستخدم
                                </span>
                            </div>

                            <div className="p-8">
                                {/* Add User Form */}
                                <div className="mb-8 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        إضافة مستخدم جديد
                                    </h3>
                                    <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
                                        <input
                                            type="text"
                                            placeholder="اسم المستخدم"
                                            value={newUserForm.username}
                                            onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))}
                                            required
                                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                        <input
                                            type="password"
                                            placeholder="كلمة المرور"
                                            value={newUserForm.password}
                                            onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                                            required
                                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isCreatingUser}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {isCreatingUser ? 'جاري الإضافة...' : 'إضافة'}
                                        </button>
                                    </form>
                                </div>

                                {/* Users List */}
                                {users.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900">
                                                <tr>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">المستخدم</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">آخر ظهور</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">تاريخ التسجيل</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">تحكم</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {users.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                            {user.username}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                                }`}>
                                                                {user.isActive ? 'نشط' : 'محظور'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-LY') : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(user.createdAt).toLocaleDateString('ar-LY')}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => handleStartEditingUser(user)}
                                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                            >
                                                                تعديل
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">لا يوجد مستخدمين لهذا المحل</p>
                                    </div>
                                )}

                                {/* Edit User Modal/Area */}
                                {editingUserId && (
                                    <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-blue-900 dark:text-blue-100">تعديل بيانات المستخدم</h3>
                                                <button onClick={handleCancelEditUser} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">إلغاء</button>
                                            </div>
                                            <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    value={userEditForm.username}
                                                    onChange={(e) => setUserEditForm((prev) => ({ ...prev, username: e.target.value }))}
                                                    className="px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800"
                                                    placeholder="اسم المستخدم"
                                                />
                                                <input
                                                    type="password"
                                                    value={userEditForm.password}
                                                    onChange={(e) => setUserEditForm((prev) => ({ ...prev, password: e.target.value }))}
                                                    className="px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800"
                                                    placeholder="كلمة المرور الجديدة (اختياري)"
                                                />
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={userEditForm.isActive}
                                                            onChange={(e) => setUserEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                                            className="form-checkbox text-blue-600 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">حساب نشط</span>
                                                    </label>
                                                </div>
                                                <button type="submit" className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                                    حفظ التعديلات
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contact & Products */}
                    <div className="space-y-8">
                        {/* Contact Info Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Phone className="text-blue-600" size={20} />
                                معلومات الاتصال
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm text-blue-500">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">الهاتف الرئيسي</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg font-mono">{store.phone1}</p>
                                    </div>
                                </div>
                                {store.phone2 && (
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm text-blue-500">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">الهاتف الثانوي</p>
                                            <p className="font-bold text-gray-900 dark:text-white text-lg font-mono">{store.phone2}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm text-blue-500">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">العنوان</p>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-relaxed">
                                            {store.address || 'لا يوجد عنوان مسجل'}
                                        </p>
                                        {store.googleMapsUrl && (
                                            <a
                                                href={store.googleMapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                عرض على الخريطة <ArrowRight size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Assignment Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[600px]">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Package className="text-blue-600" size={20} />
                                    المنتجات المتاحة
                                </h2>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setActiveProductTab('list')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeProductTab === 'list'
                                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                    >
                                        المنتجات الحالية
                                    </button>
                                    <button
                                        onClick={() => setActiveProductTab('manage')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeProductTab === 'manage'
                                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                            }`}
                                    >
                                        تعديل القائمة
                                    </button>
                                </div>
                            </div>

                            {activeProductTab === 'list' ? (
                                <div className="flex-1 overflow-y-auto p-4">
                                    {productAssignments.length > 0 ? (
                                        <div className="space-y-2">
                                            {productAssignments.map((assignment) => (
                                                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{assignment.product?.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono mt-1">{assignment.product?.sku}</p>
                                                    </div>
                                                    <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                                        {assignment.product?.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                            <Package size={48} className="mb-4 opacity-20" />
                                            <p>لا توجد منتجات مرتبطة بهذا المحل</p>
                                            <button
                                                onClick={() => setActiveProductTab('manage')}
                                                className="mt-4 text-blue-600 text-sm hover:underline"
                                            >
                                                إضافة منتجات الآن
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="بحث بالكود (مطابقة تامة)"
                                                value={skuSearch}
                                                onChange={(e) => setSkuSearch(e.target.value)}
                                                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                            />
                                            <div className="absolute right-3 top-2.5 text-gray-400">
                                                <Search size={18} />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="بحث بالاسم"
                                                value={nameSearch}
                                                onChange={(e) => setNameSearch(e.target.value)}
                                                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <div className="absolute right-3 top-2.5 text-gray-400">
                                                <Search size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {isLoadingProducts ? (
                                            <div className="flex justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : filteredProducts.length ? (
                                            filteredProducts.map((product) => (
                                                <label
                                                    key={product.id}
                                                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${selectedProducts.includes(product.id)
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.includes(product.id)}
                                                        onChange={() => handleToggleProduct(product.id)}
                                                        className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <div className="mr-3 flex-1">
                                                        <p className={`text-sm font-semibold ${selectedProducts.includes(product.id) ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                                                            {product.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{product.sku}</span>
                                                            <span className="text-xs text-gray-400">{product.unit}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 text-sm">
                                                لا توجد منتجات مطابقة
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <div className="flex items-center justify-between mb-3 text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">تم تحديد:</span>
                                            <span className="font-bold text-blue-600">{selectedProducts.length} منتج</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleAssignProducts(e as any)}
                                            disabled={isAssigningProducts}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                        >
                                            {isAssigningProducts ? 'جاري الحفظ...' : 'حفظ قائمة المنتجات'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 md:p-6 lg:p-8 font-sans" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Link
                        href="/external-stores"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-3"
                    >
                        <ArrowRight size={16} />
                        العودة لقائمة المحلات
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">إدارة المحلات الخارجية</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">عرض وتعديل تفاصيل المحل والمستخدمين والمنتجات</p>
                </div>

                {renderContent()}
            </div>
        </div>
    );
}
