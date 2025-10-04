"use client";

import React, { useState, useEffect } from 'react';
import {
  useCreateComplexInterCompanySaleMutation,
  useGetComplexInterCompanyStatsQuery,
  ComplexInterCompanySaleLine,
  CreateComplexInterCompanySaleRequest
} from '@/state/complexInterCompanySalesApi';
import { useGetProductsQuery, useGetParentCompanyProductsQuery } from '@/state/productsApi';
import { useGetCustomersQuery } from '@/state/salesApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Plus,
  X,
  Building2,
  Users
} from 'lucide-react';

const ComplexInterCompanySalesPage = () => {
  const { success, error, warning } = useToast();
  
  // States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<number | undefined>(undefined);
  const [selectedBranchCompany, setSelectedBranchCompany] = useState<number | undefined>(undefined); // الشركة الفرعية
  const [selectedParentCompany, setSelectedParentCompany] = useState<number | undefined>(undefined);
  const [profitMargin, setProfitMargin] = useState<number>(20); // 20% هامش ربح افتراضي
  const [customerSaleType, setCustomerSaleType] = useState<'CASH' | 'CREDIT'>('CASH'); // نوع الفاتورة
  const [customerPaymentMethod, setCustomerPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD'>('CASH'); // طريقة الدفع
  const [lines, setLines] = useState<ComplexInterCompanySaleLine[]>([]);
  
  // API calls
  const { data: statsData } = useGetComplexInterCompanyStatsQuery();
  const { data: productsData } = useGetProductsQuery({ limit: 1000 });
  const { data: parentProductsData, isLoading: isLoadingProducts, error: productsError } = useGetParentCompanyProductsQuery(
    { parentCompanyId: selectedParentCompany || 0 },
    { skip: !selectedParentCompany || selectedParentCompany === 0 }
  );
  const { data: customersData } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData } = useGetCompaniesQuery({ limit: 1000 });
  const [createSale, { isLoading: isCreating }] = useCreateComplexInterCompanySaleMutation();

  // Get current user company
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentCompanyId = currentUser?.companyId;

  // Filter companies
  const parentCompanies = companiesData?.data?.companies?.filter(company => 
    company.isParent === true
  ) || [];
  
  const branchCompanies = companiesData?.data?.companies?.filter(company => 
    company.isParent === false && company.parentId !== null
  ) || [];

  // Debug logging
  console.log('🔍 Debug Info:', {
    selectedParentCompany,
    parentProductsData,
    isLoadingProducts,
    productsError,
    hasData: !!parentProductsData?.data,
    dataLength: parentProductsData?.data?.length
  });

  // Add line to invoice
  const handleAddLine = () => {
    setLines([...lines, {
      productId: 0,
      qty: 1,
      parentUnitPrice: 0,
      branchUnitPrice: 0,
      subTotal: 0
    }]);
  };

  // Remove line from invoice
  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Update line
  const updateLine = (index: number, field: keyof ComplexInterCompanySaleLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // If product is selected, get its price from parent company products
    if (field === 'productId' && value > 0) {
      const selectedProduct = parentProductsData?.data?.find((p: any) => p.id === value);
      if (selectedProduct) {
        newLines[index].parentUnitPrice = selectedProduct.unitPrice;
        const branchPrice = selectedProduct.unitPrice * (1 + profitMargin / 100);
        newLines[index].branchUnitPrice = branchPrice;
        newLines[index].subTotal = newLines[index].qty * branchPrice;
      }
    }
    
    // Calculate branch unit price with profit margin
    if (field === 'parentUnitPrice' || field === 'qty' || field === 'branchUnitPrice') {
      const parentPrice = field === 'parentUnitPrice' ? value : newLines[index].parentUnitPrice;
      const qty = field === 'qty' ? value : newLines[index].qty;
      
      if (field === 'branchUnitPrice') {
        // User manually changed branch price
        newLines[index].subTotal = qty * value;
      } else {
        // Auto calculate branch price
        const branchPrice = parentPrice * (1 + profitMargin / 100);
        newLines[index].branchUnitPrice = branchPrice;
        newLines[index].subTotal = qty * branchPrice;
      }
    }
    
    setLines(newLines);
  };

  // Calculate totals
  const parentTotal = lines.reduce((sum, line) => sum + (line.qty * line.parentUnitPrice), 0);
  const branchTotal = lines.reduce((sum, line) => sum + line.subTotal, 0);
  const profitAmount = branchTotal - parentTotal;

  // Handle create sale
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      error('خطأ', 'يجب اختيار العميل');
      return;
    }
    
    if (!selectedParentCompany) {
      error('خطأ', 'يجب اختيار الشركة الأم');
      return;
    }
    
    if (!selectedBranchCompany) {
      error('خطأ', 'يجب اختيار الشركة الفرعية');
      return;
    }
    
    if (lines.length === 0) {
      error('خطأ', 'يجب إضافة بند واحد على الأقل');
      return;
    }

    // Validate lines
    const invalidLines = lines.filter(line => 
      line.productId === 0 || line.qty <= 0 || line.parentUnitPrice <= 0
    );

    if (invalidLines.length > 0) {
      error('خطأ', 'يجب ملء جميع بيانات البنود بشكل صحيح');
      return;
    }

    try {
      const requestData = {
        customerId: selectedCustomer,
        branchCompanyId: selectedBranchCompany,
        parentCompanyId: selectedParentCompany,
        lines: lines,
        profitMargin: profitMargin,
        customerSaleType: customerSaleType,
        customerPaymentMethod: customerPaymentMethod
      };
      
      console.log('📤 إرسال طلب إنشاء عملية بيع معقدة:', requestData);
      
      const result = await createSale(requestData).unwrap();

      console.log('✅ نجح إنشاء العملية:', result);
      success('تم بنجاح', 'تم إنشاء عملية البيع المعقدة بنجاح');
      setShowCreateModal(false);
      setLines([]);
      setSelectedCustomer(undefined);
      setSelectedBranchCompany(undefined);
      setSelectedParentCompany(undefined);
      
    } catch (err: any) {
      console.error('❌ خطأ في إنشاء العملية:', err);
      console.error('تفاصيل الخطأ:', {
        message: err.data?.message,
        errors: err.data?.errors,
        status: err.status,
        full: err
      });
      error('خطأ', err.data?.message || err.message || 'حدث خطأ في إنشاء العملية');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المبيعات المعقدة بين الشركات</h1>
          <p className="text-slate-600 mt-1">
            بيع أصناف من الشركة الأم للعميل عبر الشركة الفرعية مع هامش ربح
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          عملية بيع جديدة
        </button>
      </div>

      {/* Stats Cards */}
      {statsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">مبيعات العملاء</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatArabicNumber(statsData.data.customerSales.count)}
                </p>
                <p className="text-sm text-green-600">
                  {formatArabicCurrency(statsData.data.customerSales.total)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">مشتريات من الشركة الأم</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatArabicNumber(statsData.data.parentPurchases.count)}
                </p>
                <p className="text-sm text-blue-600">
                  {formatArabicCurrency(statsData.data.parentPurchases.total)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">مبيعات الشركة الأم</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatArabicNumber(statsData.data.parentSales.count)}
                </p>
                <p className="text-sm text-orange-600">
                  {formatArabicCurrency(statsData.data.parentSales.remaining)} متبقي
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">إنشاء عملية بيع معقدة</h2>
              <p className="text-sm text-slate-600 mt-1">
                بيع أصناف من الشركة الأم للعميل عبر الشركة الفرعية
              </p>
            </div>

            <form onSubmit={handleCreateSale} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    العميل *
                  </label>
                  <select
                    value={selectedCustomer || ''}
                    onChange={(e) => setSelectedCustomer(Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">اختر العميل</option>
                    {customersData?.data?.customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الشركة الفرعية (المستلمة) *
                  </label>
                  <select
                    value={selectedBranchCompany || ''}
                    onChange={(e) => setSelectedBranchCompany(Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">اختر الشركة الفرعية</option>
                    {branchCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الشركة الأم (المصدر) *
                  </label>
                  <select
                    value={selectedParentCompany || ''}
                    onChange={(e) => setSelectedParentCompany(Number(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">اختر الشركة الأم</option>
                    {parentCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    هامش الربح (%)
                  </label>
                  <input
                    type="number"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              {/* نوع الفاتورة وطريقة الدفع */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    نوع فاتورة العميل *
                  </label>
                  <select
                    value={customerSaleType}
                    onChange={(e) => setCustomerSaleType(e.target.value as 'CASH' | 'CREDIT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="CASH">نقدي</option>
                    <option value="CREDIT">آجل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    طريقة الدفع *
                  </label>
                  <select
                    value={customerPaymentMethod}
                    onChange={(e) => setCustomerPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'CARD')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="CASH">كاش</option>
                    <option value="BANK">حوالة مصرفية</option>
                    <option value="CARD">بطاقة مصرفية</option>
                  </select>
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">بنود الفاتورة</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة بند
                  </button>
                </div>

                <div className="space-y-4">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-slate-200 rounded-lg">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">المنتج</label>
                        <select
                          value={line.productId}
                          onChange={(e) => updateLine(index, 'productId', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={!selectedParentCompany}
                        >
                          {!selectedParentCompany ? (
                            <option value={0}>اختر الشركة الأم أولاً</option>
                          ) : isLoadingProducts ? (
                            <option value={0}>جاري تحميل الأصناف...</option>
                          ) : productsError ? (
                            <option value={0}>خطأ في تحميل الأصناف</option>
                          ) : !parentProductsData?.data || parentProductsData.data.length === 0 ? (
                            <option value={0}>لا توجد أصناف متاحة</option>
                          ) : (
                            <>
                              <option value={0}>اختر المنتج</option>
                              {parentProductsData.data.map((product: any) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku}) - المخزون: {product.currentStock}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">الكمية</label>
                        <input
                          type="number"
                          value={line.qty}
                          onChange={(e) => updateLine(index, 'qty', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1"
                          step="1"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">سعر التقازي</label>
                        <input
                          type="number"
                          value={line.parentUnitPrice}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">سعر الإمارات</label>
                        <input
                          type="number"
                          value={line.branchUnitPrice}
                          onChange={(e) => updateLine(index, 'branchUnitPrice', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="w-full bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              {lines.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-600">إجمالي التقازي</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatArabicCurrency(parentTotal)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">إجمالي الإمارات</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatArabicCurrency(branchTotal)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-600">هامش الربح</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatArabicCurrency(profitAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating || lines.length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      إنشاء العملية
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplexInterCompanySalesPage;
