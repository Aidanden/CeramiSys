'use client';

import { useState, useMemo } from 'react';
import {
    useGetInvoicesQuery,
    useApproveInvoiceMutation,
    useRejectInvoiceMutation,
    useUpdateInvoiceMutation,
    useGetInvoiceStatsQuery,
    ExternalStoreInvoice,
    ExternalStoreInvoiceLine,
    InvoiceStatus,
} from '@/state/externalStoreInvoicesApi';
import { X, Eye, TrendingUp, FileText, Bell, Edit, Check, Plus, Trash2, Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetAllSettingsQuery } from '@/state/settingsApi';
import { useToast } from '@/components/ui/Toast';

interface EditLine {
    productId: number;
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
    subTotal: number;
}

export default function ExternalStoreInvoicesPage() {
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
    const [selectedInvoice, setSelectedInvoice] = useState<ExternalStoreInvoice | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // States for Editing
    const [isEditing, setIsEditing] = useState(false);
    const [editLines, setEditLines] = useState<EditLine[]>([]);
    const [editNotes, setEditNotes] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { data, isLoading, refetch } = useGetInvoicesQuery({
        page,
        limit: 10,
        status: statusFilter || undefined,
    }, {
        pollingInterval: 10000,
        refetchOnFocus: true
    });

    const { data: stats } = useGetInvoiceStatsQuery(undefined, {
        pollingInterval: 10000,
        refetchOnFocus: true
    });

    const [approveInvoice] = useApproveInvoiceMutation();
    const [rejectInvoice] = useRejectInvoiceMutation();
    const [updateInvoice] = useUpdateInvoiceMutation();

    // Get company ID from settings for product search
    const { data: allSettings } = useGetAllSettingsQuery();
    const externalStoreCompanyId = useMemo(() => {
        const setting = allSettings?.find(s => s.key === 'EXTERNAL_STORE_COMPANY_ID');
        return setting ? parseInt(setting.value) : 1;
    }, [allSettings]);

    const { data: searchProducts, isLoading: isSearching } = useGetProductsQuery({
        search: productSearch,
        limit: 10,
        companyId: externalStoreCompanyId,
        strict: true
    }, { skip: !productSearch || !isEditing });

    const handleApprove = async (id: number) => {
        const confirmed = await toast.confirm(
            'تأكيد الموافقة',
            'هل أنت متأكد من الموافقة على هذه الفاتورة؟ سيتم إنشاء فاتورة مبيعات وأمر صرف تلقائياً.'
        );

        if (confirmed) {
            try {
                await approveInvoice(id).unwrap();
                refetch();
                setSelectedInvoice(null);
                toast.success('تمت الموافقة على الفاتورة بنجاح');
            } catch (err) {
                console.error('Failed to approve invoice:', err);
                toast.error('فشل في الموافقة على الفاتورة');
            }
        }
    };

    const handleReject = async (id: number) => {
        if (!rejectReason.trim()) {
            toast.error('خطأ', 'يرجى إدخال سبب الرفض');
            return;
        }

        try {
            await rejectInvoice({ id, reason: rejectReason }).unwrap();
            refetch();
            setSelectedInvoice(null);
            setRejectReason('');
            toast.success('تم رفض الفاتورة');
        } catch (err) {
            console.error('Failed to reject invoice:', err);
            toast.error('فشل في رفض الفاتورة');
        }
    };

    const startEditing = () => {
        if (!selectedInvoice) return;
        setEditLines(selectedInvoice.lines.map((line: ExternalStoreInvoiceLine) => ({
            productId: line.productId,
            name: line.product.name,
            sku: line.product.sku,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            subTotal: Number(line.subTotal)
        })));
        setEditNotes(selectedInvoice.notes || '');
        setIsEditing(true);
    };

    const updateLineEdit = (index: number, field: keyof EditLine, value: any) => {
        const newLines = [...editLines];
        const line = { ...newLines[index], [field]: value };

        if (field === 'qty' || field === 'unitPrice') {
            line.subTotal = Number(line.qty) * Number(line.unitPrice);
        }

        newLines[index] = line;
        setEditLines(newLines);
    };

    const removeLineEdit = async (index: number) => {
        const confirmed = await toast.confirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الصنف من الفاتورة؟');
        if (confirmed) {
            setEditLines(editLines.filter((_, i) => i !== index));
        }
    };

    const addProductToEdit = (product: { id: number; name: string; sku: string; price?: { sellPrice: number }; unit?: string }) => {
        const existing = editLines.find(l => l.productId === product.id);
        if (existing) {
            toast.warning('تنبيه', 'الصنف موجود بالفعل في الفاتورة');
            return;
        }

        const price = product.price?.sellPrice || 0;
        setEditLines([...editLines, {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            qty: 1,
            unitPrice: price,
            subTotal: price
        }]);
        setProductSearch('');
        setShowProductDropdown(false);
    };

    const handleSaveEdit = async () => {
        if (!selectedInvoice) return;
        if (editLines.length === 0) {
            toast.error('خطأ', 'يجب إضافة صنف واحد على الأقل');
            return;
        }

        setIsSaving(true);
        try {
            await updateInvoice({
                id: selectedInvoice.id,
                data: {
                    lines: editLines.map(l => ({
                        productId: l.productId,
                        qty: Number(l.qty),
                        unitPrice: Number(l.unitPrice)
                    })),
                    notes: editNotes
                }
            }).unwrap();

            toast.success('تم تحديث الفاتورة بنجاح');
            setIsEditing(false);
            refetch();
            setSelectedInvoice(null);
        } catch (err) {
            console.error('Save error:', err);
            toast.error('فشل الحفظ', 'حدث خطأ أثناء حفظ التعديلات');
        } finally {
            setIsSaving(false);
        }
    };

    const editTotal = useMemo(() => {
        return editLines.reduce((acc, line) => acc + Number(line.subTotal), 0);
    }, [editLines]);

    const getStatusBadge = (status: InvoiceStatus) => {
        const badges = {
            PENDING: { text: 'في انتظار المعالج', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
            APPROVED: { text: 'تم الاعتماد', class: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
            REJECTED: { text: 'مرفوضة', class: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
        };
        return (badges as any)[status];
    };

    const handlePrintIssueOrder = (invoice: ExternalStoreInvoice) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>أمر صرف مخزني - ${invoice.invoiceNumber || invoice.id}</title>
                <style>
                    body { font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; padding: 20px; direction: rtl; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th, td { border: 1px solid #000; padding: 12px; text-align: center; }
                    th { background-color: #f0f0f0; }
                    .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; }
                    .sig { width: 180px; border-top: 1px solid #000; margin-top: 40px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header"><h1>أمر صرف مخزني (فواتير خارجية)</h1></div>
                <div class="grid">
                    <div><strong>رقم الإذن:</strong> ${invoice.invoiceNumber || invoice.id}</div>
                    <div><strong>التاريخ:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-US')}</div>
                    <div><strong>المحل:</strong> ${invoice.store.name}</div>
                    <div><strong>الحالة:</strong> معتمدة</div>
                </div>
                <table>
                    <thead>
                        <tr><th>#</th><th>اسم الصنف</th><th>كود الصنف</th><th>الكمية</th></tr>
                    </thead>
                    <tbody>
                        ${invoice.lines.map((line: any, i: number) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${line.product.name}</td>
                                <td>${line.product.sku}</td>
                                <td><strong>${Number(line.qty)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <div>المستلم<div class="sig"></div></div>
                    <div>أمين المخزن<div class="sig"></div></div>
                    <div>المحاسبة<div class="sig"></div></div>
                </div>
                <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="p-6 min-h-screen" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            فواتير المحلات الخارجية
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 mt-1">
                            إدارة العمليات، المراجعة، والاعتماد المالي للمحلات
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationDropdown />
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700 hover:shadow-md transition-shadow p-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <FileText className="text-blue-600 dark:text-blue-400" size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">الإجمالي</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalInvoices}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border hover:shadow-md transition-shadow p-6 ${stats.pendingInvoices > 0 ? 'border-amber-400' : 'border-blue-100 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                    <AlertCircle className="text-amber-600 dark:text-amber-400" size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">معلق</p>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingInvoices}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700 hover:shadow-md transition-shadow p-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                                    <Check className="text-green-600 dark:text-green-400" size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">معتمد</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedInvoices}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700 hover:shadow-md transition-shadow p-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={28} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">إجمالي المبيعات</p>
                                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{Number(stats.totalAmount).toLocaleString('en-US')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-6 flex gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                        className="modal-select w-64 shadow-sm"
                    >
                        <option value="">جميع الحالات</option>
                        <option value="PENDING">معلق</option>
                        <option value="APPROVED">معتمد</option>
                        <option value="REJECTED">مرفوض</option>
                    </select>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700">
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">رقم الفاتورة</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">اسم المحل</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">إجمالي المبلغ</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">الحالة</th>
                                    <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">تاريخ الطلب</th>
                                    <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">التحكم</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <RefreshCw className="mx-auto animate-spin text-blue-600 mb-4" size={40} />
                                            <p className="font-bold text-slate-400">جاري مزامنة البيانات...</p>
                                        </td>
                                    </tr>
                                ) : data?.invoices.map((inv) => {
                                    const badge = getStatusBadge(inv.status);
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                                            <td className="px-8 py-6 font-bold text-slate-900 dark:text-white">
                                                {inv.invoiceNumber || `#INV-${inv.id}`}
                                            </td>
                                            <td className="px-8 py-6 text-sm">
                                                <div className="font-bold text-slate-800 dark:text-gray-200">{inv.store.name}</div>
                                                <div className="text-xs text-slate-400">بواسطة: {inv.store.ownerName}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                    {Number(inv.total).toLocaleString('en-US')}
                                                </span>
                                                <span className="text-[10px] mr-1 font-bold text-slate-500">د.ل</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${badge.class}`}>
                                                    {badge.text}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-medium text-slate-500">
                                                {new Date(inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' })}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-all rounded-lg">
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {data && data.pagination.totalPages > 1 && (
                    <div className="mt-8 flex justify-center items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 w-fit mx-auto">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-all font-bold"
                        >
                            السابق
                        </button>
                        <div className="h-10 w-px bg-gray-200" />
                        <span className="px-6 py-2 text-sm font-black text-blue-600">صفحة {page} من {data.pagination.totalPages}</span>
                        <div className="h-10 w-px bg-gray-200" />
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === data.pagination.totalPages}
                            className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-all font-bold"
                        >
                            التالي
                        </button>
                    </div>
                )}
            </div>

            {selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                        {isEditing ? 'محرر فاتورة المحل' : `عرض طلب التوريد`}
                                    </h2>
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">
                                        #{selectedInvoice.id}
                                    </span>
                                </div>
                                <p className="text-slate-400 font-medium text-sm">
                                    {isEditing ? 'تعديل بنود الفاتورة والأسعار قبل الاعتماد' : `التفاصيل الكاملة لطلب المبيعات المُرسل من: ${selectedInvoice.store.name}`}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedInvoice(null); setIsEditing(false); }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-8">
                            {!isEditing && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10 p-6 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border border-slate-100 dark:border-gray-600">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">الجهة الطالبة</h4>
                                        <p className="text-base font-bold text-gray-900 dark:text-white">{selectedInvoice.store.name}</p>
                                        <p className="text-xs font-medium text-gray-500 mt-0.5">{selectedInvoice.store.ownerName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">توقيت الإرسال</h4>
                                        <p className="text-base font-bold text-gray-900 dark:text-white">
                                            {new Date(selectedInvoice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' })}
                                        </p>
                                        <p className="text-xs font-medium text-gray-500 mt-0.5">{new Date(selectedInvoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' })}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">حالة المراجعة</h4>
                                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase ${getStatusBadge(selectedInvoice.status).class}`}>
                                            {getStatusBadge(selectedInvoice.status).text}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">الإجمالي الحالي</h4>
                                        <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                                            {Number(selectedInvoice.total).toLocaleString('en-US')} <small className="text-xs font-bold text-gray-400">د.ل</small>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="mb-10 relative">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                            <Search size={18} />
                                        </div>
                                        إدراج صنف جديد في الفاتورة
                                    </h3>
                                    <div className="relative group max-w-2xl">
                                        <input
                                            type="text"
                                            placeholder="اكتب اسم المنتج أو الباركود SKU للبحث..."
                                            value={productSearch}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setShowProductDropdown(true);
                                            }}
                                            onFocus={() => setShowProductDropdown(true)}
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />

                                        {showProductDropdown && (productSearch || isSearching) && (
                                            <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-[150] max-h-[30rem] overflow-y-auto p-2">
                                                {isSearching ? (
                                                    <div className="p-8 text-center"><RefreshCw className="mx-auto animate-spin text-blue-600" /></div>
                                                ) : searchProducts?.data?.products.length === 0 ? (
                                                    <div className="p-8 text-center font-bold text-gray-400">عذراً، لم نجد نتائج.</div>
                                                ) : (
                                                    searchProducts?.data?.products.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => addProductToEdit(p)}
                                                            className="w-full p-4 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 rounded-xl transition-all text-right mb-1 last:mb-0"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded-lg flex items-center justify-center font-bold text-slate-600 text-[10px] uppercase">
                                                                    {p.unit || 'PC'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{p.name}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold">SKU: {p.sku}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-base font-bold text-blue-600">{p.price?.sellPrice || 0} د.ل</p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {showProductDropdown && <div className="fixed inset-0 z-[140]" onClick={() => setShowProductDropdown(false)}></div>}
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">بنود الفاتورة التفصيلية</h3>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700">
                                                <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">الصنف / المنتج</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32">الكمية</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32">إجمالي العبوة</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40">سعر الوحدة</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40">الإجمالي</th>
                                                {isEditing && <th className="px-6 py-4 text-center w-16"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                            {(isEditing ? editLines : selectedInvoice.lines).map((line: any, idx: number) => {
                                                const unit = (isEditing ? line.unit : line.product?.unit) || 'قطعة';
                                                const unitsPerBox = isEditing ? line.unitsPerBox : line.product?.unitsPerBox;

                                                let totalPackage = '-';
                                                if (unit === 'صندوق' && unitsPerBox) {
                                                    totalPackage = `${(Number(line.qty) * Number(unitsPerBox)).toLocaleString('en-US', { minimumFractionDigits: 2 })} م²`;
                                                } else {
                                                    totalPackage = `${Number(line.qty).toLocaleString('en-US')} ${unit}`;
                                                }

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                                {isEditing ? line.name : line.product.name}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                                                                {isEditing ? line.sku : line.product.sku}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={line.qty}
                                                                    onChange={(e) => updateLineEdit(idx, 'qty', e.target.value)}
                                                                    className="w-20 px-2 py-1 text-center border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-bold text-slate-700 dark:text-gray-300">
                                                                    {Number(line.qty).toLocaleString('en-US')} {unit}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-bold text-blue-600">
                                                                {totalPackage}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={line.unitPrice}
                                                                    onChange={(e) => updateLineEdit(idx, 'unitPrice', e.target.value)}
                                                                    className="w-24 px-2 py-1 text-center border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            ) : (
                                                                <div className="font-bold text-slate-500 text-sm">
                                                                    {Number(line.unitPrice).toLocaleString('en-US')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                                {Number(line.subTotal).toLocaleString('en-US')}
                                                                <span className="text-[10px] mr-1 text-slate-400">د.ل</span>
                                                            </div>
                                                        </td>
                                                        {isEditing && (
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => removeLineEdit(idx)}
                                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-left font-bold text-slate-600 dark:text-slate-400 text-sm">المبلغ الإجمالي المستحق</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="font-bold text-blue-600 text-lg">
                                                        {(isEditing ? editTotal : Number(selectedInvoice.total)).toLocaleString('en-US')}
                                                        <span className="text-sm mr-1.5 text-slate-400">د.ل</span>
                                                    </div>
                                                </td>
                                                {isEditing && <td></td>}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <FileText size={20} className="text-slate-400" />
                                        التعليقات والملاحظات الإضافية
                                    </h3>
                                    {isEditing ? (
                                        <textarea
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            placeholder="اكتب هنا أي تعليمات إضافية للمخزن أو توضيحات مالية..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    ) : (
                                        <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 min-h-[100px] flex items-center justify-center">
                                            {selectedInvoice.notes ? (
                                                <p className="text-slate-700 dark:text-gray-300 font-medium italic text-sm">
                                                    {selectedInvoice.notes}
                                                </p>
                                            ) : (
                                                <p className="text-slate-400 font-medium italic text-sm opacity-50">لا توجد ملاحظات مرفقة بهذا الطلب.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {selectedInvoice.status === 'REJECTED' && selectedInvoice.rejectionReason && (
                                        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                            <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                                                <AlertCircle size={18} />
                                                سبب الرفض المالي
                                            </h3>
                                            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed font-bold">
                                                {selectedInvoice.rejectionReason}
                                            </p>
                                        </div>
                                    )}

                                    {selectedInvoice.status === 'APPROVED' && (
                                        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 space-y-3">
                                            <h3 className="text-sm font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                                                <TrendingUp size={18} />
                                                بيانات الاعتماد
                                            </h3>
                                            <div className="flex justify-between items-center text-sm border-b border-green-200/30 pb-2">
                                                <span className="text-green-600/70 font-bold">تاريخ المراجعة</span>
                                                <span className="font-bold text-green-800 dark:text-green-200">
                                                    {selectedInvoice.reviewedAt ? new Date(selectedInvoice.reviewedAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' }) : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-green-600/70 font-bold">المراجع المسؤول</span>
                                                <span className="font-bold text-green-800 dark:text-green-200 uppercase">{selectedInvoice.reviewedBy || 'النظام التلقائي'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700 flex flex-wrap gap-3 justify-end">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                                    >
                                        <X size={18} />
                                        تجاهل التغييرات
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                    >
                                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                        تثبيت وحفظ التعديلات
                                    </button>
                                </>
                            ) : (
                                <>
                                    {selectedInvoice.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const reason = prompt('يرجى ذكر سبب الرفض المالي للطلب:');
                                                    if (reason) {
                                                        setRejectReason(reason);
                                                        handleReject(selectedInvoice.id);
                                                    }
                                                }}
                                                className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                                            >
                                                <X size={18} />
                                                رفض نهائي
                                            </button>
                                            <button
                                                onClick={startEditing}
                                                className="px-6 py-2.5 bg-amber-50 text-amber-600 border border-amber-100 font-bold rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-2"
                                            >
                                                <Edit size={18} />
                                                مراجعة وتعديل
                                            </button>
                                            <button
                                                onClick={() => handleApprove(selectedInvoice.id)}
                                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                            >
                                                <TrendingUp size={18} />
                                                اعتماد وتحويل مبيعات
                                            </button>
                                        </>
                                    )}

                                    {selectedInvoice.status === 'APPROVED' && (
                                        <button
                                            onClick={() => handlePrintIssueOrder(selectedInvoice)}
                                            className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-2"
                                        >
                                            <svg className="group-hover:rotate-12 transition-transform" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                <rect x="6" y="14" width="12" height="8"></rect>
                                            </svg>
                                            طباعة إذن الصرف المخزني
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
