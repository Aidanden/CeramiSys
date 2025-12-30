"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { formatArabicNumber, formatArabicCurrency, formatArabicArea } from '@/utils/formatArabicNumbers';
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
  
  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

// Alias for consistency
const formatArabicQuantity = formatArabicArea;
  
  // API calls
  const { data: statsData } = useGetComplexInterCompanyStatsQuery();
  const { data: productsData } = useGetProductsQuery({ limit: 1000 });
  const { data: parentProductsData, isLoading: isLoadingProducts, error: productsError } = useGetParentCompanyProductsQuery(
    { parentCompanyId: selectedParentCompany || 0 },
    { skip: !selectedParentCompany || selectedParentCompany === 0 }
  );
  const { data: customersData } = useGetCustomersQuery({ limit: 50000 });
  const { data: companiesData } = useGetCompaniesQuery({ limit: 1000 });
  const [createSale, { isLoading: isCreating }] = useCreateComplexInterCompanySaleMutation();

  // Get current user company
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentCompanyId = currentUser?.companyId;

  // عرض جميع الشركات في القوائم
  const parentCompanies = companiesData?.data?.companies?.filter(company => 
    company.isParent === true
  ) || [];
  
  const branchCompanies = companiesData?.data?.companies?.filter(company => 
    company.isParent === false && company.parentId !== null
  ) || [];

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    const products = parentProductsData?.data || [];
    return products.filter((product: any) => {
      const matchesName = !productSearchTerm || product.name?.toLowerCase().includes(productSearchTerm.toLowerCase());
      const matchesCode = !productCodeSearch || product.sku?.toLowerCase().includes(productCodeSearch.toLowerCase());
      return matchesName && matchesCode;
    });
  }, [parentProductsData, productSearchTerm, productCodeSearch]);
  
  // Auto-select product when exact code match is found (with debounce)
  const handleProductCodeSearch = (code: string) => {
    setProductCodeSearch(code);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (!code || code.trim() === '') {
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    searchTimeoutRef.current = setTimeout(() => {
      if (!parentProductsData?.data || !selectedParentCompany) {
        setIsSearching(false);
        if (code && !selectedParentCompany) {
          error('خطأ', 'يجب اختيار الشركة الأم أولاً');
        }
        return;
      }

      const exactMatch = parentProductsData.data.find(
        (product: any) => product.sku.toLowerCase() === code.toLowerCase()
      );
      
      if (exactMatch) {
        handleAddLine();
        const newLineIndex = lines.length;
        setTimeout(() => {
          updateLine(newLineIndex, 'productId', exactMatch.id);
        }, 100);
        setProductCodeSearch('');
        success('تم بنجاح', `تم إضافة الصنف: ${exactMatch.name}`);
      } else {
        error('غير موجود', `الصنف بالكود "${code}" غير موجود`);
      }
      
      setIsSearching(false);
    }, 800);
  };
  
  // Calculate total area in square meters
  const calculateTotalArea = () => {
    return lines.reduce((total, line) => {
      const product = parentProductsData?.data?.find((p: any) => p.id === line.productId);
      if (product?.unit === 'm²' || product?.unit === 'متر مربع') {
        return total + line.qty;
      }
      return total;
    }, 0);
  };

  // Auto-select company for non-system users
  useEffect(() => {
    if (currentUser && !currentUser.isSystemUser && currentCompanyId) {
      // إذا كان المستخدم عادي، اختر شركته تلقائياً
      if (companiesData?.data?.companies) {
        const userCompany = companiesData.data.companies.find(c => c.id === currentCompanyId);
        if (userCompany) {
          if (userCompany.isParent) {
            setSelectedParentCompany(currentCompanyId);
          } else {
            setSelectedBranchCompany(currentCompanyId);
          }
        }
      }
    }
  }, [currentUser, currentCompanyId, companiesData]);


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
    
    // التحقق من أن المستخدم العادي لا يمكنه إنشاء فاتورة لشركة أخرى
    if (!currentUser?.isSystemUser) {
      if (selectedParentCompany && selectedParentCompany !== currentCompanyId) {
        error('خطأ', 'لا يمكنك إنشاء فاتورة لشركة أخرى غير شركتك');
        return;
      }
      if (selectedBranchCompany && selectedBranchCompany !== currentCompanyId) {
        error('خطأ', 'لا يمكنك إنشاء فاتورة لشركة أخرى غير شركتك');
        return;
      }
    }
    
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
                    {customersData?.data?.customers
                      ?.filter((customer) => !customer.phone?.startsWith('BRANCH'))
                      ?.map((customer) => (
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
                    disabled={false}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">اختر الشركة الفرعية</option>
                    {branchCompanies.map((company) => {
                      const isUserCompany = company.id === currentCompanyId;
                      const isSystemUser = currentUser?.isSystemUser;
                      const isAvailable = isSystemUser || isUserCompany;
                      
                      return (
                        <option 
                          key={company.id} 
                          value={company.id}
                          disabled={!isAvailable}
                        >
                          {company.name}
                          {!isAvailable ? ' - غير متاح' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الشركة الأم (المصدر) *
                  </label>
                  <select
                    value={selectedParentCompany || ''}
                    onChange={(e) => setSelectedParentCompany(Number(e.target.value) || undefined)}
                    disabled={false}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">اختر الشركة الأم</option>
                    {parentCompanies.map((company) => {
                      const isUserCompany = company.id === currentCompanyId;
                      const isSystemUser = currentUser?.isSystemUser;
                      const isAvailable = isSystemUser || isUserCompany;
                      
                      return (
                        <option 
                          key={company.id} 
                          value={company.id}
                          disabled={!isAvailable}
                        >
                          {company.name}
                          {!isAvailable ? ' - غير متاح' : ''}
                        </option>
                      );
                    })}
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
                    onChange={(e) => {
                      const newSaleType = e.target.value as 'CASH' | 'CREDIT';
                      setCustomerSaleType(newSaleType);
                      // عند اختيار آجل، نضع طريقة الدفع undefined
                      if (newSaleType === 'CREDIT') {
                        setCustomerPaymentMethod('CASH'); // قيمة افتراضية لكن سيتم تعطيلها
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="CASH">نقدي</option>
                    <option value="CREDIT">آجل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    طريقة الدفع {customerSaleType !== 'CREDIT' && '*'}
                  </label>
                  <select
                    value={customerPaymentMethod}
                    onChange={(e) => setCustomerPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'CARD')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      customerSaleType === 'CREDIT' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    required={customerSaleType !== 'CREDIT'}
                    disabled={customerSaleType === 'CREDIT'}
                  >
                    <option value="">اختر طريقة الدفع</option>
                    <option value="CASH">كاش</option>
                    <option value="BANK">حوالة مصرفية</option>
                    <option value="CARD">بطاقة مصرفية</option>
                  </select>
                  {customerSaleType === 'CREDIT' && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 لا يلزم تحديد طريقة الدفع للبيع الآجل
                    </p>
                  )}
                </div>
              </div>

              {/* Product Search Filters */}
              <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    <h4 className="text-sm font-bold text-gray-700">البحث عن المنتجات</h4>
                  </div>
                  {selectedParentCompany && (
                    <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded">
                      أصناف {companiesData?.data?.companies?.find(c => c.id === selectedParentCompany)?.name} فقط
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      البحث بالاسم
                    </label>
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="ابحث بالاسم..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      disabled={!selectedParentCompany}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      البحث بالكود
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productCodeSearch}
                        onChange={(e) => handleProductCodeSearch(e.target.value)}
                        placeholder="أدخل كود الصنف للإضافة التلقائية..."
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        disabled={!selectedParentCompany}
                      />
                      {isSearching && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-medium animate-pulse">
                          ⏳ جاري البحث...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 سيتم البحث تلقائياً بعد التوقف عن الكتابة
                    </p>
                  </div>
                </div>
                {(productSearchTerm || productCodeSearch) && selectedParentCompany && (
                  <div className="mt-3 flex justify-between items-center p-2 bg-white rounded-md border border-blue-200">
                    <div className="text-xs font-medium text-gray-600">
                      📊 عرض {filteredProducts.length} منتج من أصل {parentProductsData?.data?.length || 0}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearchTerm('');
                        setProductCodeSearch('');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      ✖️ مسح البحث
                    </button>
                  </div>
                )}
                {!selectedParentCompany && (
                  <div className="mt-3 p-2 bg-orange-50 rounded-md border border-orange-200">
                    <p className="text-xs text-orange-700 font-medium">
                      ⚠️ اختر الشركة الأم أولاً لعرض الأصناف
                    </p>
                  </div>
                )}
              </div>

              {/* Sale Lines */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-base font-bold text-gray-800">
                    📋 بنود الفاتورة *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    disabled={!selectedParentCompany || filteredProducts.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium ${
                      selectedParentCompany && filteredProducts.length > 0
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-lg">➕</span>
                    <span>إضافة بند</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {lines.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-6xl mb-3">📝</div>
                      <p className="text-gray-600 font-medium mb-2">لا توجد بنود في الفاتورة</p>
                      <p className="text-sm text-gray-500">اضغط على "إضافة بند" لبدء إنشاء الفاتورة</p>
                    </div>
                  ) : (
                    lines.map((line, index) => {
                      const selectedProduct = parentProductsData?.data?.find((p: any) => p.id === line.productId);
                      const totalUnits = selectedProduct?.unitsPerBox && line.qty 
                        ? Number(line.qty) * Number(selectedProduct.unitsPerBox) 
                        : 0;
                      
                      const lineProfit = line.subTotal - (line.qty * line.parentUnitPrice);
                      const lineProfitMargin = line.subTotal > 0 ? ((lineProfit / line.subTotal) * 100) : 0;
                      
                      return (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الصنف</label>
                            <select
                              value={line.productId}
                              onChange={(e) => updateLine(index, 'productId', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value={0}>-- اختر الصنف --</option>
                              {filteredProducts.map((product: any) => (
                                <option key={product.id} value={product.id}>
                                  {product.sku} - {product.name}
                                </option>
                              ))}
                            </select>
                            {line.productId > 0 && selectedProduct && (
                              <div className="text-xs mt-1 space-y-0.5">
                                <div className="text-gray-600">
                                  📦 الكود: {selectedProduct.sku}
                                </div>
                                {selectedProduct.unitsPerBox && (
                                  <div className="text-blue-600 font-medium">
                                    📏 الصندوق به: {formatArabicNumber(selectedProduct.unitsPerBox)} متر
                                  </div>
                                )}
                                {selectedProduct.currentStock !== undefined && (
                                  <div className="text-green-600 font-medium space-y-1">
                                    {selectedProduct.unitsPerBox ? (
                                      <>
                                        <div>✅ المخزن: {formatArabicArea(Number(selectedProduct.currentStock) * Number(selectedProduct.unitsPerBox))} متر</div>
                                        <div className="text-xs text-gray-600">📦 الصناديق: {formatArabicArea(selectedProduct.currentStock)}</div>
                                      </>
                                    ) : (
                                      <div>✅ المخزن: {formatArabicArea(selectedProduct.currentStock)} {selectedProduct.unit || 'وحدة'}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {selectedProduct?.unit === 'صندوق' ? 'الصناديق' : `الكمية`}
                            </label>
                            <input
                              type="number"
                              value={line.qty || ''}
                              onChange={(e) => updateLine(index, 'qty', Number(e.target.value) || 0)}
                              className={`w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                selectedProduct?.currentStock && line.qty > Number(selectedProduct.currentStock)
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="0"
                              min="0.01"
                              step="0.01"
                              required
                            />
                            {selectedProduct?.unit === 'صندوق' && selectedProduct?.currentStock && line.qty > Number(selectedProduct.currentStock) && (
                              <div className="text-xs text-red-600 mt-1 font-medium">
                                ⚠️ أكبر من المخزون
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {selectedProduct?.unit === 'صندوق' ? 'إجمالي المتر' : 'الإجمالي'}
                            </label>
                            <div className="px-2 py-2 bg-purple-50 border border-purple-200 rounded-md">
                              <span className="text-xs font-bold text-purple-700 block text-center">
                                {line.qty > 0 ? (
                                  selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox
                                    ? `${formatArabicArea(line.qty * Number(selectedProduct.unitsPerBox))}`
                                    : `${formatArabicArea(line.qty)}`
                                ) : '0'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">💰 سعر الأم</label>
                            <input
                              type="number"
                              value={line.parentUnitPrice || ''}
                              readOnly
                              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm font-medium bg-gray-50 text-gray-600"
                              placeholder="0"
                            />
                            <div className="text-xs text-gray-500 mt-0.5">
                              تكلفة: {formatArabicCurrency(line.qty * line.parentUnitPrice)}
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">💵 سعر الفرع</label>
                            <input
                              type="number"
                              value={line.branchUnitPrice || ''}
                              onChange={(e) => updateLine(index, 'branchUnitPrice', Number(e.target.value) || 0)}
                              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              required
                            />
                            <div className="text-xs text-green-600 mt-0.5 font-medium">
                              إيراد: {formatArabicCurrency(line.subTotal)}
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">📈 الربح</label>
                            <div className="px-2 py-2 bg-orange-50 border border-orange-200 rounded-md">
                              <span className="text-sm font-bold text-orange-700 block text-center">
                                {formatArabicCurrency(lineProfit)}
                              </span>
                            </div>
                            <div className="text-xs text-blue-600 mt-0.5 font-medium text-center">
                              هامش: {formatArabicNumber(lineProfitMargin.toFixed(1))}%
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1 opacity-0">حذف</label>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="w-full h-[42px] flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 rounded-md transition-all duration-200 font-medium"
                              title="حذف البند"
                            >
                              <span className="text-lg">🗑️</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {lines.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                        <div className="text-xs text-blue-700 font-medium mb-1">💰 تكلفة الشركة الأم</div>
                        <div className="text-xl font-bold text-blue-700">
                          {formatArabicCurrency(parentTotal)}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                        <div className="text-xs text-green-700 font-medium mb-1">💵 إيرادات الفرع</div>
                        <div className="text-xl font-bold text-green-700">
                          {formatArabicCurrency(branchTotal)}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
                        <div className="text-xs text-orange-700 font-medium mb-1">📈 صافي الربح</div>
                        <div className="text-xl font-bold text-orange-700">
                          {formatArabicCurrency(profitAmount)}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                        <div className="text-xs text-purple-700 font-medium mb-1">📊 هامش الربح</div>
                        <div className="text-xl font-bold text-purple-700">
                          {formatArabicNumber(branchTotal > 0 ? ((profitAmount / branchTotal) * 100).toFixed(1) : 0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
