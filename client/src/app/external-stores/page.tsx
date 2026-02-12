'use client';

import { useState, useRef, useEffect } from 'react';
import { useGetStoresQuery, useCreateStoreMutation, useDeleteStoreMutation } from '@/state/externalStoresApi';
import { useGetCustomersQuery, useCreateCustomerMutation, Customer, CreateCustomerRequest } from '@/state/salesApi';
import { Plus, Search, Edit, Trash2, Users, Package, FileText, UserPlus, Check, X as CloseIcon, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function ExternalStoresPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Customer Selection State
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const customerSearchRef = useRef<HTMLDivElement>(null);

    // Debounced customer search term
    const [debouncedCustomerSearchTerm, setDebouncedCustomerSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCustomerSearchTerm(customerSearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearchTerm]);

    const { data, isLoading, refetch } = useGetStoresQuery({ page, limit: 12, search });
    const { data: customersData, isLoading: isLoadingCustomers } = useGetCustomersQuery({
        limit: 100,
        search: debouncedCustomerSearchTerm
    });
    const [createStore] = useCreateStoreMutation();
    const [deleteStore] = useDeleteStoreMutation();
    const [createCustomer] = useCreateCustomerMutation();

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
                setShowCustomerSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            customerId: selectedCustomerId || undefined,
        };

        try {
            await createStore(storeData).unwrap();
            alert('✅ تم إنشاء المحل بنجاح');
            setShowCreateModal(false);
            resetForm();
            refetch();
        } catch (error: any) {
            console.error('❌ Failed to create store:', error);
            const errorMessage = error?.data?.error || error?.data?.message || error?.message || 'فشل في إنشاء المحل';
            alert(`❌ خطأ: ${errorMessage}`);
        }
    };

    const resetForm = () => {
        setSelectedCustomerId(null);
        setSelectedCustomerName('');
        setCustomerSearchTerm('');
    };

    const handleCreateNewCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const customerData: CreateCustomerRequest = {
            name: formData.get('custName') as string,
            phone: (formData.get('custPhone') as string) || undefined,
            note: (formData.get('custNote') as string) || undefined,
        };

        try {
            const result = await createCustomer(customerData).unwrap();
            if (result.data) {
                setSelectedCustomerId(result.data.id);
                setSelectedCustomerName(result.data.name);
                setShowCreateCustomerModal(false);
            }
        } catch (error: any) {
            alert('❌ فشل إنشاء العميل: ' + (error?.data?.message || 'حدث خطأ'));
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
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        إدارة المحلات الخارجية
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        إدارة المحلات الخارجية التي تبيع منتجات التقازي وربطها بالعملاء
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 font-bold"
                >
                    <Plus size={20} />
                    إضافة محل جديد
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8 max-w-2xl">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="البحث عن اسم المحل أو صاحب المحل أو الهاتف..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
            </div>

            {/* Stores Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">جاري تحميل المحلات...</p>
                </div>
            ) : data?.stores.length === 0 ? (
                <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-bold text-gray-500 dark:text-gray-400">لا توجد محلات مسجلة</p>
                    <p className="text-gray-400 dark:text-gray-500 mt-2">ابدأ بإضافة أول محل للنظام</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {data?.stores.map((store) => (
                        <div
                            key={store.id}
                            className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                                        {store.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        صاحب المحل: {store.ownerName}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${store.isActive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                >
                                    {store.isActive ? 'نشط' : 'متوقف'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-blue-600">
                                        <Users size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">العميل المرتبط</span>
                                        <span className="font-medium truncate max-w-[150px]">
                                            {store.customer?.name || 'غير مربوط'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-1">
                                    <Package size={14} className="text-gray-400" />
                                    <span>المنتجات: {store._count?.productAssignments || 0}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href={`/external-stores/${store.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-md hover:shadow-blue-500/25"
                                >
                                    <Edit size={16} />
                                    تعديل
                                </Link>
                                <button
                                    onClick={() => handleDelete(store.id, store.name)}
                                    className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all border border-red-100 dark:border-red-900/30"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Store Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                        <Plus size={24} />
                                    </div>
                                    إضافة محل جديد
                                </h2>
                                <button
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateStore} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">اسم المحل *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="مثال: معرض الوفاء للسيراميك"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">صاحب المحل *</label>
                                        <input
                                            type="text"
                                            name="ownerName"
                                            placeholder="الاسم الكامل"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Customer Selection Logic */}
                                <div className="space-y-3 p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-blue-800 dark:text-blue-300">العميل المرتبط (اختياري)</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateCustomerModal(true)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <UserPlus size={14} />
                                            عميل جديد
                                        </button>
                                    </div>

                                    <div className="relative" ref={customerSearchRef}>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={selectedCustomerName || customerSearchTerm}
                                                placeholder="البحث عن عميل موجود..."
                                                onChange={(e) => {
                                                    setCustomerSearchTerm(e.target.value);
                                                    setSelectedCustomerName('');
                                                    setSelectedCustomerId(null);
                                                    setShowCustomerSuggestions(true);
                                                }}
                                                onFocus={() => setShowCustomerSuggestions(true)}
                                                className="w-full pr-10 pl-4 py-3 rounded-xl border border-blue-200 dark:border-blue-900/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                            />
                                            {selectedCustomerId && (
                                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500">
                                                    <Check size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {showCustomerSuggestions && customerSearchTerm && (
                                            <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-[250px] overflow-y-auto overflow-x-hidden">
                                                {isLoadingCustomers ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">جاري التحميل...</div>
                                                ) : (
                                                    <>
                                                        {customersData?.data?.customers
                                                            ?.map((customer: Customer) => (
                                                                <button
                                                                    key={customer.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedCustomerId(customer.id);
                                                                        setSelectedCustomerName(customer.name);
                                                                        setShowCustomerSuggestions(false);
                                                                        setCustomerSearchTerm('');
                                                                    }}
                                                                    className="w-full text-right px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                                >
                                                                    <div className="flex flex-col text-right">
                                                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{customer.name}</span>
                                                                        <span className="text-xs text-gray-400">{customer.phone || 'بدون هاتف'}</span>
                                                                    </div>
                                                                    {selectedCustomerId === customer.id && <Check size={16} className="text-green-500" />}
                                                                </button>
                                                            ))}
                                                        {customersData?.data?.customers?.length === 0 && (
                                                            <div className="p-4 text-center text-sm text-gray-500">لا توجد نتائج</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {selectedCustomerId === null && !customerSearchTerm && (
                                            <p className="mt-2 text-[10px] text-gray-400 px-1">💡 في حال عدم الربط، سيتم إنشاء حساب عميل جديد تلقائياً لهذا المحل.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">رقم الهاتف الأول *</label>
                                        <input type="tel" name="phone1" required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">رقم الهاتف الثاني</label>
                                        <input type="tel" name="phone2" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">العنوان</label>
                                    <textarea name="address" rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="العنوان بالتفصيل" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">رابط خرائط جوجل</label>
                                    <div className="relative">
                                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="url" name="googleMapsUrl" placeholder="https://maps.google.com/..." className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all font-bold shadow-lg hover:shadow-blue-500/25"
                                    >
                                        تأكيد الإضافة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateModal(false); resetForm(); }}
                                        className="px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl transition-all font-bold border border-gray-200 dark:border-gray-600"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Create Customer Modal */}
            {showCreateCustomerModal && (
                <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-10">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                    <UserPlus size={24} />
                                </div>
                                إضافة عميل جديد
                            </h3>
                            <form onSubmit={handleCreateNewCustomer} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">اسم العميل *</label>
                                    <input name="custName" required className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">رقم الهاتف</label>
                                    <input name="custPhone" type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 px-1">ملاحظات</label>
                                    <textarea name="custNote" rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl transition-all font-bold shadow-lg shadow-green-500/25">حفظ واختيار</button>
                                    <button type="button" onClick={() => setShowCreateCustomerModal(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-2xl transition-all font-bold">إلغاء</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
