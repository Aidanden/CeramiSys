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
    Package
} from 'lucide-react';

interface InvoiceLine {
    productId: string;
    productName: string;
    sku: string;
    qty: number;
    unitPrice: number; // السعر للوحدة (أو للمتر إذا كانت الوحدة صندوق)
    minPrice: number;
    subTotal: number;
    availableQty: number; // الكمية المتاحة في المخزن
    unit: string; // وحدة المنتج (صندوق، قطعة، كيس، لتر)
    unitsPerBox: number | null; // عدد الأمتار في الصندوق (للصناديق فقط)
}

export default function StoreInvoicesPage() {
    const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useGetInvoicesQuery();
    const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useGetAvailableProductsQuery();
    const { data: currentUser, refetch: refetchCurrentUser } = useGetCurrentUserQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });
    const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

    // إعداد إظهار الأسعار
    const showPrices = currentUser?.store?.showPrices === true;
    
    // Debug: طباعة القيمة للتأكد
    console.log('🔍 Store Portal - Current User:', currentUser);
    console.log('🔍 Store Portal - showPrices from store:', currentUser?.store?.showPrices);
    console.log('🔍 Store Portal - Final showPrices value:', showPrices);

    // إعادة جلب البيانات عند mount وعند تغيير المستخدم
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

    // Form State
    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [notes, setNotes] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Filtered Products for Dropdown
    const filteredProducts = productsData?.filter(p => {
        const matchesSku = skuSearch ? p.product.sku.toLowerCase() === skuSearch.toLowerCase() : true;
        const matchesName = nameSearch ? p.product.name.toLowerCase().includes(nameSearch.toLowerCase()) : true;

        // Show results only if at least one search term is entered
        if (!skuSearch && !nameSearch) return false;

        return matchesSku && matchesName;
    }) || [];

    // Add Product to Line
    const handleAddProduct = (productId: string) => {
        console.log('=== handleAddProduct called ===');
        console.log('Product ID:', productId);
        console.log('All Products Data:', productsData);

        const productData = productsData?.find(p => p.productId === productId);
        if (!productData) {
            console.error('❌ Product not found:', productId);
            alert('خطأ: لم يتم العثور على المنتج');
            return;
        }

        console.log('✅ Product Data Found:', productData);
        console.log('Product Object:', productData.product);
        console.log('Product Prices Array:', productData.product?.prices);
        console.log('Product Stocks Array:', productData.product?.stocks);

        // استخراج السعر من التقازي
        let taqaziPrice = 0;

        if (productData.product?.prices && Array.isArray(productData.product.prices)) {
            console.log('Prices is an array with length:', productData.product.prices.length);

            // محاولة إيجاد سعر التقازي (TG أو TAQAZI)
            const priceObj = productData.product.prices.find((p: any) => {
                console.log('Checking price object:', p);
                console.log('Company:', p.company);
                console.log('Company code:', p.company?.code);
                return p.company?.code === 'TAQAZI' || p.company?.code === 'TG';
            });

            if (priceObj) {
                console.log('✅ Found TAQAZI/TG price object:', priceObj);
                taqaziPrice = Number(priceObj.sellPrice) || Number(priceObj.SellPrice) || 0;
                console.log('Extracted price:', taqaziPrice);
            } else {
                console.log('⚠️ No TAQAZI/TG price found, using first available');
                if (productData.product.prices.length > 0) {
                    const firstPrice = productData.product.prices[0];
                    console.log('First price object:', firstPrice);
                    taqaziPrice = Number(firstPrice.sellPrice) || Number(firstPrice.SellPrice) || 0;
                    console.log('Using first price:', taqaziPrice);
                }
            }
        } else {
            console.error('❌ Prices is not an array or is undefined');
        }

        console.log('Final Taqazi Price:', taqaziPrice);

        // استخراج الكمية المتاحة من مخزن التقازي
        let availableQty = 0;

        if (productData.product?.stocks && Array.isArray(productData.product.stocks)) {
            console.log('Stocks is an array with length:', productData.product.stocks.length);

            const stockObj = productData.product.stocks.find((s: any) => {
                console.log('Checking stock object:', s);
                console.log('Company:', s.company);
                console.log('Company code:', s.company?.code);
                return s.company?.code === 'TAQAZI' || s.company?.code === 'TG';
            });

            if (stockObj) {
                console.log('✅ Found TAQAZI/TG stock object:', stockObj);
                // الحقل قد يكون qty أو boxes أو Qty أو Boxes
                availableQty = Number(stockObj.qty) || Number(stockObj.Qty) ||
                    Number(stockObj.boxes) || Number(stockObj.Boxes) || 0;
                console.log('Extracted quantity:', availableQty);
            } else {
                console.log('⚠️ No TAQAZI/TG stock found, using first available');
                if (productData.product.stocks.length > 0) {
                    const firstStock = productData.product.stocks[0];
                    console.log('First stock object:', firstStock);
                    availableQty = Number(firstStock.qty) || Number(firstStock.Qty) ||
                        Number(firstStock.boxes) || Number(firstStock.Boxes) || 0;
                    console.log('Using first stock:', availableQty);
                }
            }
        } else {
            console.error('❌ Stocks is not an array or is undefined');
        }

        console.log('Final Available Quantity:', availableQty);

        if (taqaziPrice === 0) {
            console.error('❌ Price is zero!');
            alert('تحذير: لم يتم العثور على سعر لهذا المنتج. يرجى التحقق من البيانات.');
            return;
        }

        if (availableQty === 0) {
            console.warn('⚠️ Stock is zero!');
            alert('تحذير: هذا المنتج غير متوفر في المخزن حالياً.');
            return;
        }

        // Check if already exists
        const existingLineIndex = lines.findIndex(l => l.productId === productId);

        if (existingLineIndex >= 0) {
            console.log('Product already in cart, updating quantity');
            const newLines = [...lines];
            const newQty = newLines[existingLineIndex].qty + 1;

            if (newQty > availableQty) {
                alert(`الكمية المطلوبة (${newQty}) أكبر من المتوفر في المخزن (${availableQty})`);
                return;
            }

            newLines[existingLineIndex].qty = newQty;
            // حساب الإجمالي بناءً على نوع الوحدة
            const line = newLines[existingLineIndex];
            if (line.unit === 'صندوق' && line.unitsPerBox) {
                // للصناديق: الكمية × عدد الأمتار × سعر المتر
                line.subTotal = line.qty * line.unitsPerBox * line.unitPrice;
            } else {
                line.subTotal = line.qty * line.unitPrice;
            }
            setLines(newLines);
            console.log('✅ Updated line:', newLines[existingLineIndex]);
        } else {
            console.log('Adding new line to cart');
            const unit = productData.product.unit || 'قطعة';
            const unitsPerBox = productData.product.unitsPerBox ? Number(productData.product.unitsPerBox) : null;

            // حساب الإجمالي بناءً على نوع الوحدة
            let subTotal = Number(taqaziPrice);
            if (unit === 'صندوق' && unitsPerBox) {
                // للصناديق: السعر × عدد الأمتار في الصندوق
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
            console.log('✅ New line:', newLine);
            setLines([...lines, newLine]);
        }


        setSelectedProduct('');
        setSkuSearch('');
        setNameSearch('');
        console.log('=== handleAddProduct completed ===');
    };

    // Update Line - حساب الإجمالي بناءً على نوع الوحدة
    const updateLine = (index: number, field: keyof InvoiceLine, value: number) => {
        const newLines = [...lines];
        const line = newLines[index];

        if (field === 'qty') {
            if (value > line.availableQty) {
                alert(`الكمية المطلوبة (${value}) أكبر من المتوفر في المخزن (${line.availableQty})`);
                return;
            }
            if (value < 1) {
                alert('الكمية يجب أن تكون 1 على الأقل');
                return;
            }
            line.qty = value;
            // حساب الإجمالي بناءً على نوع الوحدة
            if (line.unit === 'صندوق' && line.unitsPerBox) {
                // للصناديق: الكمية × عدد الأمتار × سعر المتر
                line.subTotal = line.qty * line.unitsPerBox * line.unitPrice;
            } else {
                line.subTotal = line.qty * line.unitPrice;
            }
        }
        // السعر مغلق - لا يمكن تعديله

        setLines(newLines);
    };

    // حساب إجمالي الأمتار لبند معين
    const calculateTotalMeters = (line: InvoiceLine): number => {
        if (line.unit === 'صندوق' && line.unitsPerBox) {
            return line.qty * line.unitsPerBox;
        }
        return 0;
    };

    // Remove Line
    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    // Calculate Total
    const totalAmount = lines.reduce((sum, line) => sum + line.subTotal, 0);

    // Submit Invoice
    const handleSubmit = async () => {
        setError(null);

        if (lines.length === 0) {
            setError('يجب إضافة منتج واحد على الأقل');
            return;
        }

        // التحقق من الكميات
        const invalidQtyLine = lines.find(l => l.qty > l.availableQty);
        if (invalidQtyLine) {
            setError(`الكمية المطلوبة للمنتج "${invalidQtyLine.productName}" (${invalidQtyLine.qty}) أكبر من المتوفر (${invalidQtyLine.availableQty})`);
            return;
        }

        try {
            // إرسال البيانات للـ API
            // ملاحظة: السعر يُرسل كما هو (سعر المتر للصناديق أو سعر الوحدة للباقي)
            await createInvoice({
                lines: lines.map(l => ({
                    productId: l.productId,
                    qty: l.qty,
                    unitPrice: l.unitPrice, // سعر المتر أو سعر الوحدة
                    // إرسال معلومات إضافية للـ backend
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فواتير المبيعات</h1>
                    <p className="text-gray-600 dark:text-gray-400">إدارة فواتير المبيعات الخاصة بالمحل</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>فاتورة جديدة</span>
                </button>
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {invoicesLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-500">جاري تحميل الفواتير...</p>
                    </div>
                ) : invoicesData?.invoices?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">رقم الفاتورة</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">التاريخ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">العميل</th>
                                    {showPrices && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">المبلغ</th>
                                    )}
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {invoicesData.invoices.map((invoice: any) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            #{invoice.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {invoice.customerName || 'عميل نقدي'}
                                        </td>
                                        {showPrices && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                {Number(invoice.total).toLocaleString('en-US')} د.ل
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${invoice.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                invoice.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                }`}>
                                                {invoice.status === 'APPROVED' ? 'معتمدة' :
                                                    invoice.status === 'REJECTED' ? 'مرفوضة' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <FileText className="mx-auto mb-4 opacity-50" size={48} />
                        <p>لا توجد فواتير حتى الآن</p>
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ShoppingCart className="text-blue-600" />
                                إنشاء فاتورة جديدة
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Product Search */}
                            <div className="relative z-50">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    إضافة منتج
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Search by Code (Exact Match) */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={skuSearch}
                                            onChange={(e) => setSkuSearch(e.target.value)}
                                            placeholder="بحث بالكود (مطابقة تامة)"
                                            className="block w-full pr-10 pl-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white font-mono"
                                        />
                                    </div>

                                    {/* Search by Name (Like Match) */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={nameSearch}
                                            onChange={(e) => setNameSearch(e.target.value)}
                                            placeholder="بحث بالاسم"
                                            className="block w-full pr-10 pl-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Dropdown Results */}
                                {(skuSearch || nameSearch) && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map((item: any) => (
                                                <button
                                                    key={item.productId}
                                                    onClick={() => handleAddProduct(item.productId)}
                                                    className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.product.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.product.sku}</div>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                            متوفر: {
                                                                (() => {
                                                                    const stockObj = item.product.stocks?.find((s: any) => s.company?.code === 'TAQAZI' || s.company?.code === 'TG') || item.product.stocks?.[0];
                                                                    return stockObj?.qty || stockObj?.Qty || stockObj?.boxes || stockObj?.Boxes || 0;
                                                                })()
                                                            }
                                                        </div>
                                                    </div>
                                                    {showPrices && (
                                                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            {Number(item.product.prices?.find((p: any) => p.company?.code === 'TAQAZI' || p.company?.code === 'TG')?.sellPrice || item.product.prices?.[0]?.sellPrice || 0).toLocaleString('en-US')} د.ل
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

                            {/* ملاحظة مهمة عن البيع بالمتر */}
                            {showPrices && (
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                                    <div className="flex items-start gap-3">
                                        <FileText className="text-blue-600 dark:text-blue-400 mt-0.5" size={24} />
                                        <div>
                                            <p className="text-sm text-blue-900 dark:text-blue-100 font-bold mb-1">
                                                ملاحظة مهمة: البيع بالمتر المربع
                                            </p>
                                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                                • للأصناف التي وحدتها "صندوق": السعر يكون <strong>بالمتر المربع</strong><br />
                                                • الإجمالي = عدد الصناديق × عدد الأمتار في الصندوق × سعر المتر<br />
                                                • <strong>السعر ثابت</strong> ولا يمكن تعديله
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lines Table */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المنتج</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-24">الكمية</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 w-28">الأمتار</th>
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
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{line.sku}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${line.unit === 'صندوق'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                }`}>
                                                                <Package size={10} className="ml-1" />
                                                                {line.unit}
                                                            </span>
                                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                                متوفر: {line.availableQty}
                                                            </span>
                                                            {line.qty > line.availableQty && (
                                                                <span className="text-red-500">⚠️</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={line.availableQty}
                                                            value={line.qty}
                                                            onChange={(e) => updateLine(index, 'qty', Number(e.target.value))}
                                                            className="w-full px-2 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-medium"
                                                        />
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                                                            {line.unit === 'صندوق' ? 'صندوق' : line.unit}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {line.unit === 'صندوق' && line.unitsPerBox ? (
                                                            <div className="bg-purple-100 dark:bg-purple-900/30 px-2 py-2 rounded-lg">
                                                                <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                                    {calculateTotalMeters(line).toFixed(2)}
                                                                </span>
                                                                <span className="text-xs text-purple-600 dark:text-purple-400 block">م²</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500">-</span>
                                                        )}
                                                    </td>
                                                    {showPrices && (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                {/* السعر مغلق - للعرض فقط */}
                                                                <div className="bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-lg text-center">
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                                        {line.unitPrice.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                                                        {line.unit === 'صندوق' ? 'د.ل/م²' : 'د.ل'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="bg-green-100 dark:bg-green-900/30 px-2 py-2 rounded-lg">
                                                                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                                                        {line.subTotal.toLocaleString('en-US')}
                                                                    </span>
                                                                    <span className="text-xs text-green-600 dark:text-green-400 block">د.ل</span>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeLine(index)}
                                                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    <ShoppingCart className="mx-auto mb-3 opacity-50" size={48} />
                                                    <p className="font-medium">لا توجد منتجات في الفاتورة</p>
                                                    <p className="text-sm mt-1">ابحث عن منتج وأضفه للفاتورة</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {lines.length > 0 && showPrices && (
                                        <tfoot className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-4 text-left">
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">الإجمالي الكلي:</span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
                                                        <span className="text-xl font-bold">
                                                            {totalAmount.toLocaleString('en-US')}
                                                        </span>
                                                        <span className="text-sm block">د.ل</span>
                                                    </div>
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            {/* Notes */}
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

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isCreating || lines.length === 0}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        <span>جاري الحفظ...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={20} />
                                        <span>حفظ الفاتورة</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
