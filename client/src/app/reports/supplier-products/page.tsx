'use client';

import React, { useState, useMemo } from 'react';
import { Search, Package, TrendingUp, TrendingDown, FileText, AlertCircle, Loader } from 'lucide-react';
import {
  useGetSuppliersWithPurchasesQuery,
  useGetSupplierReportQuery,
} from '@/state/supplierProductsReportApi';
import { formatArabicNumber } from '@/utils/formatArabicNumbers';

const SupplierProductsReportPage = () => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('LYD');
  const [searchTerm, setSearchTerm] = useState('');

  // جلب قائمة الموردين
  const { data: suppliers, isLoading: loadingSuppliers, error: suppliersError } = useGetSuppliersWithPurchasesQuery();

  // جلب تقرير المورد المحدد
  const { data: supplierReport, isLoading: loadingReport } = useGetSupplierReportQuery(
    selectedSupplierId!,
    {
      skip: !selectedSupplierId,
    }
  );

  // Log للتأكد من البيانات
  React.useEffect(() => {
    console.log('📊 Suppliers data:', suppliers);
    console.log('🔄 Loading:', loadingSuppliers);
    console.log('❌ Error:', suppliersError);
  }, [suppliers, loadingSuppliers, suppliersError]);

  // تصفية الموردين حسب البحث
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    if (!searchTerm) return suppliers;

    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  // العملات المتاحة للمورد المحدد
  const availableCurrencies = useMemo(() => {
    if (!supplierReport?.debts) return ['LYD', 'USD', 'EUR'];
    const currencies = supplierReport.debts.map(d => d.currency);
    return Array.from(new Set(['LYD', 'USD', 'EUR', ...currencies]));
  }, [supplierReport]);

  // المديونية حسب العملة المختارة
  const currentDebt = useMemo(() => {
    if (!supplierReport?.debts) return null;
    return supplierReport.debts.find(d => d.currency === selectedCurrency);
  }, [supplierReport, selectedCurrency]);

  // إحصائيات المنتجات
  const productStats = useMemo(() => {
    if (!supplierReport?.products) return { totalProducts: 0, lowStock: 0, totalPurchased: 0, totalInStock: 0 };

    const totalProducts = supplierReport.products.length;
    const lowStock = supplierReport.products.filter(p => {
      const soldPercentage = ((p.totalQuantityPurchased - p.currentStockQuantity) / p.totalQuantityPurchased) * 100;
      return soldPercentage < 30; // أقل من 30% تم بيعها يعتبر stock عالي
    }).length;
    const totalPurchased = supplierReport.products.reduce((sum, p) => sum + p.totalQuantityPurchased, 0);
    const totalInStock = supplierReport.products.reduce((sum, p) => sum + p.currentStockQuantity, 0);

    return { totalProducts, lowStock, totalPurchased, totalInStock };
  }, [supplierReport]);

  // حساب نسبة البيع لكل منتج
  const getProductSalesPercentage = (purchased: number, remaining: number) => {
    const sold = purchased - remaining;
    return (sold / purchased) * 100;
  };

  // تصنيف أداء المنتج
  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 70) return { label: 'ممتاز', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 50) return { label: 'جيد', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 30) return { label: 'متوسط', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { label: 'ضعيف', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  // دالة تنسيق الكميات
  const formatQuantity = (qty: number, unit: string, unitsPerBox: number | null) => {
    if (unit === 'صندوق' && unitsPerBox) {
      const boxes = Math.floor(qty);
      const meters = boxes * unitsPerBox;
      return (
        <div className="flex flex-col">
          <span className="font-semibold">{formatArabicNumber(boxes)} صندوق</span>
          <span className="text-xs text-blue-600">= {formatArabicNumber(meters.toFixed(2))} م²</span>
        </div>
      );
    }
    return <span className="font-semibold">{formatArabicNumber(qty)} {unit}</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">تقرير بضاعة الشركات</h1>
        </div>
        <p className="text-gray-600">تحليل أداء بضاعة الموردين ومدى بيع منتجاتهم</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* قائمة الموردين - Left Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">الموردين</h2>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن مورد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Suppliers List */}
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {loadingSuppliers ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : suppliersError ? (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
                  <p className="font-semibold">حدث خطأ في جلب البيانات</p>
                  <p className="text-xs mt-1">{(suppliersError as any)?.data?.error || 'خطأ غير معروف'}</p>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>لا توجد موردين</p>
                  {!searchTerm && (
                    <p className="text-xs mt-2">
                      لا توجد فواتير مشتريات معتمدة في النظام
                    </p>
                  )}
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setSelectedCurrency('LYD');
                    }}
                    className={`w-full text-right p-3 rounded-lg transition-all ${
                      selectedSupplierId === supplier.id
                        ? 'bg-blue-100 border-2 border-blue-500 shadow-md'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{supplier.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {supplier._count.purchases} فاتورة مشتريات
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* تفاصيل التقرير - Main Content */}
        <div className="col-span-12 lg:col-span-9">
          {!selectedSupplierId ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Package className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">اختر مورداً لعرض التقرير</h3>
              <p className="text-gray-500">اختر مورداً من القائمة على اليمين لعرض تفاصيل بضاعته</p>
            </div>
          ) : loadingReport ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل التقرير...</p>
            </div>
          ) : supplierReport ? (
            <div className="space-y-6">
              {/* معلومات المورد والمديونية */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{supplierReport.supplier.name}</h2>
                    {supplierReport.supplier.phone && (
                      <p className="text-gray-600 mt-1">{supplierReport.supplier.phone}</p>
                    )}
                    {supplierReport.supplier.address && (
                      <p className="text-gray-500 text-sm mt-1">{supplierReport.supplier.address}</p>
                    )}
                  </div>
                  
                  {/* اختيار العملة */}
                  <div className="flex gap-2">
                    {availableCurrencies.map((currency) => (
                      <button
                        key={currency}
                        onClick={() => setSelectedCurrency(currency)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedCurrency === currency
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {currency}
                      </button>
                    ))}
                  </div>
                </div>

                {/* المديونية */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700 font-medium">إجمالي المديونية بـ {selectedCurrency}:</span>
                    <span className="text-3xl font-bold text-orange-900">
                      {currentDebt ? formatArabicNumber(currentDebt.totalDebt.toFixed(2)) : '0.00'} {selectedCurrency}
                    </span>
                  </div>
                </div>
              </div>

              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">إجمالي الأصناف</p>
                      <p className="text-2xl font-bold text-blue-600">{formatArabicNumber(productStats.totalProducts)}</p>
                    </div>
                    <Package className="w-10 h-10 text-blue-600 opacity-50" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">إجمالي المشتريات</p>
                      <p className="text-2xl font-bold text-green-600">{formatArabicNumber(productStats.totalPurchased)}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-green-600 opacity-50" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">المتبقي في المخزن</p>
                      <p className="text-2xl font-bold text-orange-600">{formatArabicNumber(productStats.totalInStock)}</p>
                    </div>
                    <Package className="w-10 h-10 text-orange-600 opacity-50" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">بضاعة بطيئة الحركة</p>
                      <p className="text-2xl font-bold text-red-600">{formatArabicNumber(productStats.lowStock)}</p>
                    </div>
                    <TrendingDown className="w-10 h-10 text-red-600 opacity-50" />
                  </div>
                </div>
              </div>

              {/* جدول المنتجات */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">تفاصيل البضاعة</h3>
                </div>
                
                {supplierReport.products.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد بضاعة مشتراة من هذا المورد</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">الصنف</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">الكود</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">إجمالي المشتريات</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">المتبقي في المخزن</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">الكمية المباعة</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">نسبة البيع</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">الأداء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {supplierReport.products.map((product) => {
                          const salesPercentage = getProductSalesPercentage(
                            product.totalQuantityPurchased,
                            product.currentStockQuantity
                          );
                          const performance = getPerformanceLabel(salesPercentage);
                          const soldQty = product.totalQuantityPurchased - product.currentStockQuantity;

                          return (
                            <tr key={product.productId} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{product.productName}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {product.productSku || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {formatQuantity(product.totalQuantityPurchased, product.unit, product.unitsPerBox)}
                              </td>
                              <td className="px-4 py-3">
                                {formatQuantity(product.currentStockQuantity, product.unit, product.unitsPerBox)}
                              </td>
                              <td className="px-4 py-3">
                                {formatQuantity(soldQty, product.unit, product.unitsPerBox)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        salesPercentage >= 70
                                          ? 'bg-green-500'
                                          : salesPercentage >= 50
                                          ? 'bg-blue-500'
                                          : salesPercentage >= 30
                                          ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(salesPercentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700 min-w-[50px]">
                                    {formatArabicNumber(salesPercentage.toFixed(1))}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${performance.bgColor} ${performance.color}`}>
                                  {performance.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SupplierProductsReportPage;

