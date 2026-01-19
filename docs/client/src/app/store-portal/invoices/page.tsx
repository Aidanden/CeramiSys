'use client';

import React, { useState, useEffect } from 'react';
import {
    useGetInvoicesQuery,
    useCreateInvoiceMutation,
    useGetAvailableProductsQuery,
    useGetCurrentUserQuery
} from '@/state/storePortalApi';
import {
    Plus,
    Search,
    FileText,
    Trash2,
    X,
    AlertCircle,
    ShoppingCart,
    Package,
    Eye,
    Check,
    RefreshCw,
    Printer
} from 'lucide-react';
import { StorePrintModal } from '@/components/store-portal/StorePrintModal';

interface InvoiceLine {
    productId: string;
    productName: string;
    sku: string;
    qty: number;
    unitPrice: number;
    minPrice: number;
    subTotal: number;
    availableQty: number;
    unit: string;
    unitsPerBox: number | null;
}

export default function StoreInvoicesPage() {
    const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useGetInvoicesQuery();
    const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetAvailableProductsQuery();
    const { data: currentUser, refetch: refetchCurrentUser } = useGetCurrentUserQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

    const showPrices = currentUser?.store?.showPrices === true;

    useEffect(() => {
        refetchCurrentUser();
    }, [refetchCurrentUser]);

    useEffect(() => {
        if (currentUser) {
            refetchInvoices();
            refetchProducts();
        }
    }, [currentUser?.user?.storeId, refetchInvoices, refetchProducts]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [skuSearch, setSkuSearch] = useState('');
    const [nameSearch, setNameSearch] = useState('');

    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState<any>(null);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printingInvoice, setPrintingInvoice] = useState<any>(null);

    const filteredProducts = productsData?.filter(p => {
        const matchesSku = skuSearch ? p.product.sku.toLowerCase() === skuSearch.toLowerCase() : true;
        const matchesName = nameSearch ? p.product.name.toLowerCase().includes(nameSearch.toLowerCase()) : true;
        if (!skuSearch && !nameSearch) return false;
        return matchesSku && matchesName;
    }) || [];

    const handleAddProduct = (productId: string) => {
        const productData = productsData?.find(p => p.productId === productId);
        if (!productData) {
            alert('خطأ: لم يتم العثور على المنتج');
            return;
        }

        let taqaziPrice = 0;
        if (productData.product?.prices && Array.isArray(productData.product.prices)) {
            const priceObj = productData.product.prices.find((p: any) => p.company?.code === 'TAQAZI' || p.company?.code === 'TG');
            if (priceObj) {
                taqaziPrice = Number(priceObj.sellPrice) || Number(priceObj.SellPrice) || 0;
            } else if (productData.product.prices.length > 0) {
                const firstPrice = productData.product.prices[0];
                taqaziPrice = Number(firstPrice.sellPrice) || Number(firstPrice.SellPrice) || 0;
            }
        }

        let availableQty = 0;
        if (productData.product?.stocks && Array.isArray(productData.product.stocks)) {
            const stockObj = productData.product.stocks.find((s: any) => s.company?.code === 'TAQAZI' || s.company?.code === 'TG');
            if (stockObj) {
                availableQty = Number(stockObj.qty) || Number(stockObj.Qty) || Number(stockObj.boxes) || Number(stockObj.Boxes) || 0;
            } else if (productData.product.stocks.length > 0) {
                const firstStock = productData.product.stocks[0];
                availableQty = Number(firstStock.qty) || Number(firstStock.Qty) || Number(firstStock.boxes) || Number(firstStock.Boxes) || 0;
            }
        }

        if (taqaziPrice === 0) {
            alert('تحذير: لم يتم العثور على سعر لهذا المنتج.');
            return;
        }

        if (availableQty === 0) {
            alert('تحذير: هذا المنتج غير متوفر في المخزن حالياً.');
            return;
        }

        const existingLineIndex = lines.findIndex(l => l.productId === productId);

        if (existingLineIndex >= 0) {
            const newLines = [...lines];
            const newQty = newLines[existingLineIndex].qty + 1;

            if (newQty > availableQty) {
                alert(`الكمية المطلوبة (${newQty}) أكبر من المتوفر (${availableQty})`);
                return;
            }

            newLines[existingLineIndex].qty = newQty;
            const line = newLines[existingLineIndex];
            if (line.unit === 'صندوق' && line.unitsPerBox) {
                line.subTotal = line.qty * line.unitsPerBox * line.unitPrice;
            } else {
                line.subTotal = line.qty * line.unitPrice;
            }
            setLines(newLines);
        } else {
            const unit = productData.product.unit || 'قطعة';
            const unitsPerBox = productData.product.unitsPerBox ? Number(productData.product.unitsPerBox) : null;
            let subTotal = Number(taqaziPrice);
            if (unit === 'صندوق' && unitsPerBox) {
                subTotal = Number(taqaziPrice) * unitsPerBox;
            }

            const newLine: InvoiceLine = {
                productId: productData.productId,
                productName: productData.product.name,
                sku: productData.product.sku,
                qty: 1,
                unitPrice: Number(taqaziPrice),
                minPrice: Number(taqaziPrice),
                subTotal: subTotal,
                availableQty: availableQty,
                unit: unit,
                unitsPerBox: unitsPerBox
            };
            setLines([...lines, newLine]);
        }

        setSkuSearch('');
        setNameSearch('');
    };

    const updateLine = (index: number, field: keyof InvoiceLine, value: number) => {
        const newLines = [...lines];
        const line = newLines[index];

        if (field === 'qty') {
            if (value > line.availableQty) {
                alert(`الكمية المطلوبة (${value}) أكبر من المتوفر (${line.availableQty})`);
                return;
            }
            if (value < 1) {
                alert('الكمية يجب أن تكون 1 على الأقل');
                return;
            }
            line.qty = value;
            if (line.unit === 'صندوق' && line.unitsPerBox) {
                line.subTotal = line.qty * line.unitsPerBox * line.unitPrice;
            } else {
                line.subTotal = line.qty * line.unitPrice;
            }
        }
        setLines(newLines);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const totalAmount = lines.reduce((sum, line) => sum + line.subTotal, 0);

    const handleSubmit = async () => {
        setError(null);
        if (lines.length === 0) {
            setError('يجب إضافة منتج واحد على الأقل');
            return;
        }

        const invalidQtyLine = lines.find(l => l.qty > l.availableQty);
        if (invalidQtyLine) {
            setError(`الكمية المطلوبة للمنتج "${invalidQtyLine.productName}" (${invalidQtyLine.qty}) أكبر من المتوفر (${invalidQtyLine.availableQty})`);
            return;
        }

        try {
            await createInvoice({
                lines: lines.map(l => ({
                    productId: l.productId,
                    qty: l.qty,
                    unitPrice: l.unitPrice,
                    unit: l.unit,
                    unitsPerBox: l.unitsPerBox,
                    totalMeters: l.unit === 'صندوق' && l.unitsPerBox ? l.qty * l.unitsPerBox : null,
                    subTotal: l.subTotal
                })),
                notes
            }).unwrap();

            setIsModalOpen(false);
            setLines([]);
            setNotes('');
            refetchInvoices();
        } catch (err: any) {
            setError(err.data?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
        }
    };

    const handleViewInvoice = (invoice: any) => {
        setViewingInvoice(invoice);
        setIsViewModalOpen(true);
    };

    const handlePrintInvoice = (invoice: any) => {
        setPrintingInvoice(invoice);
        setIsPrintModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">إدارة فواتير المبيعات</h1>
                            <p className="text-slate-500 dark:text-slate-400">سجل المبيعات وإصدار فواتير طلب التوريد للمحل</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg shadow-sm"
                    >
                        <Plus size={20} />
                        <span>إنشاء فاتورة جديدة</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" size={20} />
                        قائمة الفواتير
                    </h3>
                    <div className="px-3 py-1 bg-slate-100 rounded-full">
                        <span className="text-xs font-medium text-slate-500">إجمالي الفواتير: </span>
                        <span className="text-sm font-bold text-slate-800">{invoicesData?.invoices?.length || 0}</span>
                    </div>
                </div>
                {invoicesLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500 font-medium">جاري تحميل الفواتير...</p>
                    </div>
                ) : invoicesData?.invoices?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الفاتورة</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">العميل</th>
                                    {showPrices && (
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">المبلغ العام</th>
                                    )}
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">الحالة</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">التحكم</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoicesData.invoices.map((invoice: any) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-white">
                                            #{invoice.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white">
                                            {invoice.customerName || 'عميل نقدي'}
                                        </td>
                                        {showPrices && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">
                                                {Number(invoice.total).toLocaleString('en-US')} <span className="text-xs text-slate-400">د.ل</span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${invoice.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                invoice.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {invoice.status === 'APPROVED' ? 'معتمدة' :
                                                    invoice.status === 'REJECTED' ? 'مرفوضة' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleViewInvoice(invoice)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-bold text-xs"
                                            >
                                                <Eye size={16} />
                                                <span>عرض</span>
                                            </button>
                                            <button
                                                onClick={() => handlePrintInvoice(invoice)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs"
                                                title="طباعة"
                                            >
                                                <Printer size={16} />
                                                <span className="hidden sm:inline">طباعة</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400">
                        <FileText className="mx-auto mb-4 opacity-50" size={48} />
                        <p className="font-medium">لا توجد فواتير حتى الآن</p>
                    </div>
                )}
            </div>

            {isViewModalOpen && viewingInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col font-sans border border-slate-200 dark:border-gray-700 overflow-hidden max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileText className="text-blue-600" size={24} />
                                    تفاصيل الفاتورة #{viewingInvoice.invoiceNumber}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    تاريخ الطلب: {new Date(viewingInvoice.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-black rounded-full">
                                #{viewingInvoice.invoiceNumber}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">تاريخ الإنشاء</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {new Date(viewingInvoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' })} {new Date(viewingInvoice.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">الحالة</p>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${viewingInvoice.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                        viewingInvoice.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        }`}>
                                        {viewingInvoice.status === 'APPROVED' ? 'معتمدة' :
                                            viewingInvoice.status === 'REJECTED' ? 'مرفوضة' : 'قيد الانتظار'}
                                    </span>
                                </div>
                                {viewingInvoice.notes && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ملاحظات</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{viewingInvoice.notes}</p>
                                    </div>
                                )}
                            </div>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">الصنف</th>
                                            <th className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-center">الكمية</th>
                                            {showPrices && (
                                                <>
                                                    <th className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-center">السعر</th>
                                                    <th className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-center">المجموع</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {viewingInvoice.lines?.map((line: any, idx: number) => (
                                            <tr key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{line.product?.name || 'منتج غير معروف'}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{line.product?.sku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {Number(line.qty).toLocaleString('en-US')} {line.product?.unit || ''}
                                                </td>
                                                {showPrices && (
                                                    <>
                                                        <td className="px-4 py-3 text-center">
                                                            {Number(line.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold">
                                                            {Number(line.subTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    {showPrices && (
                                        <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white">الإجمالي:</td>
                                                <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
                                                    {Number(viewingInvoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                            <button
                                onClick={() => handlePrintInvoice(viewingInvoice)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2"
                            >
                                <Printer size={18} />
                                طباعة
                            </button>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col border border-slate-200 dark:border-gray-700 overflow-hidden max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <ShoppingCart className="text-blue-600" size={24} />
                                    إنشاء فاتورة مبيعات
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">قم بإضافة المنتجات وتحديد الكميات لإنشاء طلب توريد جديد</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="relative z-50">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    إضافة منتج
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={skuSearch}
                                            onChange={(e) => setSkuSearch(e.target.value)}
                                            placeholder="البحث بكود الصنف (EAN/SKU)..."
                                            className="w-full pr-10 pl-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                        />
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={nameSearch}
                                            onChange={(e) => setNameSearch(e.target.value)}
                                            placeholder="البحث باسم المنتج..."
                                            className="w-full pr-10 pl-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    </div>
                                </div>
                                {(skuSearch || nameSearch) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map((item: any) => (
                                                <button
                                                    key={item.productId}
                                                    onClick={() => handleAddProduct(item.productId)}
                                                    className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0 flex justify-between items-center"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.product.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.product.sku}</span>
                                                            {item.product.unitsPerBox && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold border border-blue-100">
                                                                    عبوة: {Number(item.product.unitsPerBox).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {showPrices && (
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                {Number(item.product.prices?.find((p: any) => p.company?.code === 'TAQAZI' || p.company?.code === 'TG')?.sellPrice || item.product.prices?.[0]?.sellPrice || 0).toLocaleString('en-US')} د.ل
                                                            </div>
                                                            {item.product.unit === 'صندوق' && (
                                                                <div className="text-[10px] text-slate-400 font-medium">(سعر المتر)</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                لا توجد نتائج
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المنتج</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-24">الكمية</th>
                                            {showPrices && (
                                                <>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-32">السعر</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-32">الإجمالي</th>
                                                </>
                                            )}
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {lines.length > 0 ? (
                                            lines.map((line, index) => (
                                                <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{line.productName}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{line.sku}</span>
                                                            {line.unitsPerBox && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold border border-blue-100">
                                                                    عبوة: {Number(line.unitsPerBox).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={line.qty}
                                                            onChange={(e) => updateLine(index, 'qty', parseInt(e.target.value))}
                                                            className="w-full px-2 py-1 text-center bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    {showPrices && (
                                                        <>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="text-gray-700 font-mono">{line.unitPrice.toLocaleString('en-US')}</div>
                                                                {line.unit === 'صندوق' && (
                                                                    <div className="text-[10px] text-slate-400 font-medium">(سعر المتر)</div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                                {line.subTotal.toLocaleString('en-US')}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeLine(index)}
                                                            className="text-red-500 hover:text-red-700 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={showPrices ? 5 : 3} className="px-4 py-8 text-center text-gray-500 text-sm">
                                                    لم يتم إضافة منتجات بعد
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {showPrices && lines.length > 0 && (
                                        <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-left">الإجمالي النهائي:</td>
                                                <td className="px-4 py-3 text-center text-blue-600">
                                                    {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ملاحظات
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="أي ملاحظات إضافية..."
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                disabled={isCreating}
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isCreating || lines.length === 0}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={18} />
                                        <span>جاري الحفظ...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        <span>حفظ الفاتورة</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StorePrintModal
                invoice={printingInvoice}
                storeInfo={currentUser?.store}
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
            />
        </div>
    );
}
