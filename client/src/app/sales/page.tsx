"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  useGetSalesQuery, 
  useCreateSaleMutation, 
  useDeleteSaleMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  Sale,
  Customer,
  CreateSaleRequest,
  CreateCustomerRequest
} from '@/state/salesApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import { PrintModal } from '@/components/sales/PrintModal';

const SalesPage = () => {
  const { success, error, warning, info, confirm } = useToast();
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [showCreateSaleModal, setShowCreateSaleModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  
  // Sale form states
  const [saleForm, setSaleForm] = useState<CreateSaleRequest>({
    customerId: undefined,
    saleType: 'CASH',
    paymentMethod: 'CASH', // للبيع النقدي افتراضياً
    lines: []
  });

  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // API calls
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGetSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });

  const { data: customersData, isLoading: customersLoading, error: customersError } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  // جلب جميع الأصناف ثم الفلترة في الواجهة الأمامية حسب الشركة المختارة
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ 
    limit: 1000
  });
  
  const [createSale, { isLoading: isCreating }] = useCreateSaleMutation();
  const [deleteSale, { isLoading: isDeleting }] = useDeleteSaleMutation();
  const [createCustomer] = useCreateCustomerMutation();

  // Handle create sale
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      error('خطأ', 'يجب اختيار الشركة أولاً');
      return;
    }
    
    if (!saleForm.customerId) {
      error('خطأ', 'يجب اختيار عميل للمتابعة');
      return;
    }
    
    if (saleForm.lines.length === 0) {
      error('خطأ', 'يجب إضافة بند واحد على الأقل');
      return;
    }

    // التحقق من أن جميع الأصناف في البنود تنتمي للشركة المختارة
    const invalidLines = saleForm.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      return !product || product.createdByCompanyId !== selectedCompanyId;
    });

    if (invalidLines.length > 0) {
      error('خطأ', 'بعض الأصناف المختارة لا تنتمي للشركة المختارة. يرجى التحقق من البنود.');
      return;
    }

    try {
      // إضافة companyId للطلب
      const saleRequest = {
        ...saleForm,
        companyId: selectedCompanyId
      };
      
      await createSale(saleRequest).unwrap();
      success('تم بنجاح', 'تم إنشاء فاتورة المبيعات بنجاح');
      setShowCreateSaleModal(false);
      setSaleForm({
        customerId: undefined,
        saleType: 'CASH',
        paymentMethod: 'CASH',
        lines: []
      });
      setProductSearchTerm('');
      setProductCodeSearch('');
      setSelectedCompanyId(null); // إعادة تعيين الشركة المختارة
      refetchSales();
    } catch (err: any) {
      error('خطأ', err.data?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  // Handle delete sale
  const handleDeleteSale = async (sale: Sale) => {
    const confirmed = await confirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف فاتورة رقم ${sale.invoiceNumber || sale.id}؟`
    );

    if (confirmed) {
      try {
        await deleteSale(sale.id).unwrap();
        success('تم بنجاح', 'تم حذف الفاتورة بنجاح');
        refetchSales();
      } catch (err: any) {
        error('خطأ', err.data?.message || 'حدث خطأ أثناء حذف الفاتورة');
      }
    }
  };

  // Add line to sale
  const addSaleLine = () => {
    setSaleForm(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: 0, qty: 1, unitPrice: 0 }]
    }));
  };

  // Remove line from sale
  const removeSaleLine = (index: number) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Update sale line
  const updateSaleLine = (index: number, field: string, value: any) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  // Filter products based on search and selected company
  const filteredProducts = productsData?.data?.products?.filter(product => {
    // فلترة صارمة: يجب أن تكون الشركة مختارة وأن يكون الصنف تابع لها
    if (!selectedCompanyId) {
      return false; // لا تعرض أي أصناف إذا لم يتم اختيار شركة
    }
    
    // التأكد من أن الصنف ينتمي للشركة المختارة فقط
    if (product.createdByCompanyId !== selectedCompanyId) {
      return false;
    }
    
    const matchesName = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesCode = product.sku.toLowerCase().includes(productCodeSearch.toLowerCase());
    
    if (productSearchTerm && productCodeSearch) {
      return matchesName && matchesCode;
    } else if (productSearchTerm) {
      return matchesName;
    } else if (productCodeSearch) {
      return matchesCode;
    }
    return true;
  }) || [];

  // Auto-select product when exact code match is found (with debounce)
  const handleProductCodeSearch = (code: string) => {
    setProductCodeSearch(code);
    
    // إلغاء أي timeout سابق
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // إذا كان الحقل فارغاً، لا نفعل شيء
    if (!code || code.trim() === '') {
      setIsSearching(false);
      return;
    }
    
    // تفعيل مؤشر البحث
    setIsSearching(true);
    
    // الانتظار 800ms بعد توقف المستخدم عن الكتابة
    searchTimeoutRef.current = setTimeout(() => {
      if (!productsData?.data?.products || !selectedCompanyId) {
        if (code && !selectedCompanyId) {
          error('خطأ', 'يجب اختيار الشركة أولاً قبل البحث عن الأصناف');
        }
        return;
      }

      // البحث فقط في أصناف الشركة المختارة
      const exactMatch = productsData.data.products.find(
        product => product.sku.toLowerCase() === code.toLowerCase() 
          && product.createdByCompanyId === selectedCompanyId
      );
      
      if (exactMatch) {
        // التحقق من أن العميل تم اختياره
        if (!saleForm.customerId) {
          warning('تنبيه', 'يجب اختيار العميل أولاً قبل إضافة البنود');
          return;
        }
        
        // Auto-add the product to the sale lines
        addSaleLine();
        const newLineIndex = saleForm.lines.length;
        updateSaleLine(newLineIndex, 'productId', exactMatch.id);
        // Set the official price if available
        if (exactMatch.price?.sellPrice) {
          updateSaleLine(newLineIndex, 'unitPrice', Number(exactMatch.price.sellPrice));
        }
        setProductCodeSearch(''); // Clear search after selection
        success('تم بنجاح', `تم إضافة الصنف: ${exactMatch.name}`);
      } else {
        // الصنف غير موجود في مخزن الشركة المختارة
        const productExistsInOtherCompany = productsData.data.products.find(
          product => product.sku.toLowerCase() === code.toLowerCase()
        );
        
        if (productExistsInOtherCompany) {
          const otherCompany = companiesData?.data?.companies?.find(
            c => c.id === productExistsInOtherCompany.createdByCompanyId
          );
          error(
            'الصنف غير متاح', 
            `الصنف "${code}" (${productExistsInOtherCompany.name}) غير موجود في مخزن الشركة المختارة.\n\n` +
            `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}\n\n` +
            `يرجى اختيار صنف من مخزن الشركة الحالية فقط.`
          );
        } else {
          warning('غير موجود', `الصنف بالكود "${code}" غير موجود في النظام.`);
        }
      }
      
      // إيقاف مؤشر البحث
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 800); // الانتظار 800ms
  };

  if (salesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المبيعات</h1>
              <p className="text-gray-600">إدارة فواتير المبيعات والعملاء</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!selectedCompanyId) {
                error('تنبيه', 'يجب اختيار الشركة أولاً');
                return;
              }
              setShowCreateSaleModal(true);
            }}
            disabled={!selectedCompanyId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedCompanyId 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!selectedCompanyId ? 'يجب اختيار الشركة أولاً' : 'إنشاء فاتورة جديدة'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(salesData?.data?.pagination?.total || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبيعات النقدية</p>
              <p className="text-2xl font-bold text-green-600">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.saleType === 'CASH').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">المبيعات الآجلة</p>
              <p className="text-2xl font-bold text-orange-600">{formatArabicNumber(salesData?.data?.sales?.filter((sale: any) => sale.saleType === 'CREDIT').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(salesData?.data?.sales?.reduce((sum: number, sale: any) => sum + sale.total, 0) || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
        <label className="block text-sm font-bold text-blue-900 mb-2">
          🏢 اختر الشركة للعمل عليها *
        </label>
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => {
            const newCompanyId = e.target.value ? Number(e.target.value) : null;
            setSelectedCompanyId(newCompanyId);
            // تنظيف البنود عند تغيير الشركة لضمان عدم بقاء أصناف من شركة أخرى
            setSaleForm(prev => ({
              ...prev,
              lines: []
            }));
            // تنظيف البحث
            setProductSearchTerm('');
            setProductCodeSearch('');
          }}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium"
        >
          <option value="">-- اختر الشركة أولاً --</option>
          {companiesLoading ? (
            <option disabled>جاري تحميل الشركات...</option>
          ) : (
            companiesData?.data?.companies?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))
          )}
        </select>
        {!selectedCompanyId && (
          <p className="text-sm text-blue-700 mt-2 font-medium">
            ⚠️ يجب اختيار الشركة أولاً لتتمكن من إنشاء فاتورة جديدة
          </p>
        )}
        {selectedCompanyId && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-700 font-medium">
              ✅ تم اختيار الشركة - يمكنك الآن إنشاء فاتورة جديدة
            </p>
            <p className="text-xs text-blue-600">
              💡 ملاحظة: سيتم عرض الأصناف الخاصة بهذه الشركة فقط، ولا يمكن إضافة أصناف من شركات أخرى
            </p>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="البحث في المبيعات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Add Customer */}
          <button 
            onClick={() => setShowCreateCustomerModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            عميل جديد
          </button>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع البيع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  طريقة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData?.data?.sales?.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.invoiceNumber || `#${sale.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-600">{sale.company?.name}</span>
                      <span className="text-xs text-gray-500">{sale.company?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer?.name || 'غير محدد'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-semibold text-green-600">
                      {formatArabicCurrency(sale.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.saleType === 'CASH' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.saleType === 'CASH' ? 'نقدي' : 'آجل'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.paymentMethod === 'CASH' ? 'كاش' : 
                     sale.paymentMethod === 'BANK' ? 'حوالة' : 
                     sale.paymentMethod === 'CARD' ? 'بطاقة' : 
                     <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSaleToPrint(sale);
                          setShowPrintModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="طباعة الفاتورة"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="حذف"
                        disabled={isDeleting}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {salesData?.data?.pagination && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= salesData.data.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض{' '}
                  <span className="font-medium">
                    {((currentPage - 1) * 10) + 1}
                  </span>{' '}
                  إلى{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, salesData.data.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{salesData.data.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: salesData.data.pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateSaleModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إنشاء فاتورة مبيعات جديدة</h3>
              
              {/* عرض الشركة المختارة */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">🏢 الشركة:</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                  <span className="text-xs text-blue-600">
                    ({companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.code})
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  💡 سيتم البيع من مخزون هذه الشركة فقط
                </p>
              </div>

              {/* تنبيه إذا لم تكن هناك أصناف */}
              {selectedCompanyId && filteredProducts.length === 0 && (
                <div className="mb-4 bg-red-50 p-4 rounded-lg border-2 border-red-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm text-red-800 font-bold mb-1">
                        لا توجد أصناف متاحة لهذه الشركة!
                      </p>
                      <p className="text-xs text-red-700">
                        لا يمكن إنشاء فاتورة بدون أصناف. يرجى إضافة أصناف أولاً من صفحة "الأصناف والمخزن" للشركة المختارة.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {productsLoading && (
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    ⏳ جاري تحميل الأصناف...
                  </p>
                </div>
              )}
              
              <form onSubmit={handleCreateSale} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العميل *
                    </label>
                    <select
                      value={saleForm.customerId || ''}
                      onChange={(e) => setSaleForm(prev => ({
                        ...prev,
                        customerId: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">اختر عميل</option>
                      {customersLoading ? (
                        <option disabled>جاري تحميل العملاء...</option>
                      ) : customersError ? (
                        <option disabled>خطأ في تحميل العملاء</option>
                      ) : customersData?.data?.customers?.length === 0 ? (
                        <option disabled>لا توجد عملاء</option>
                      ) : (
                        customersData?.data?.customers?.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      مطلوب - يجب اختيار عميل للمتابعة
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الفاتورة
                    </label>
                    <input
                      type="text"
                      value="سيتم توليده تلقائياً"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      سيتم توليد رقم الفاتورة تلقائياً عند الحفظ
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع البيع *
                    </label>
                    <select
                      value={saleForm.saleType}
                      onChange={(e) => {
                        const newSaleType = e.target.value as any;
                        setSaleForm(prev => ({ 
                          ...prev, 
                          saleType: newSaleType,
                          // عند اختيار آجل، نضع طريقة الدفع undefined ونقفل الحقل
                          paymentMethod: newSaleType === 'CREDIT' ? undefined : prev.paymentMethod
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="CASH">نقدي</option>
                      <option value="CREDIT">آجل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      طريقة الدفع {saleForm.saleType !== 'CREDIT' && '*'}
                    </label>
                    <select
                      value={saleForm.paymentMethod || ''}
                      onChange={(e) => setSaleForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        saleForm.saleType === 'CREDIT' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      required={saleForm.saleType !== 'CREDIT'}
                      disabled={saleForm.saleType === 'CREDIT'}
                    >
                      <option value="">اختر طريقة الدفع</option>
                      <option value="CASH">كاش</option>
                      <option value="BANK">حوالة مصرفية</option>
                      <option value="CARD">بطاقة</option>
                    </select>
                    {saleForm.saleType === 'CREDIT' && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 لا يلزم تحديد طريقة الدفع للبيع الآجل
                      </p>
                    )}
                  </div>
                </div>

                {/* Sale Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-base font-bold text-gray-800">
                      📋 بنود الفاتورة *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addSaleLine}
                        disabled={!saleForm.customerId || filteredProducts.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium ${
                          saleForm.customerId && filteredProducts.length > 0
                            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-lg">➕</span>
                        <span>إضافة بند</span>
                      </button>
                      {!saleForm.customerId ? (
                        <span className="text-xs text-red-600 font-medium">
                          اختر العميل أولاً
                        </span>
                      ) : filteredProducts.length === 0 ? (
                        <span className="text-xs text-red-600 font-medium">
                          لا توجد أصناف متاحة لهذه الشركة
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Product Search Filters */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔍</span>
                        <h4 className="text-sm font-bold text-gray-700">البحث عن المنتجات</h4>
                      </div>
                      {selectedCompanyId && (
                        <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded">
                          أصناف {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name} فقط
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
                          />
                          {isSearching && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-medium animate-pulse">
                              ⏳ جاري البحث...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 سيتم البحث تلقائياً بعد التوقف عن الكتابة (من مخزن الشركة فقط)
                        </p>
                      </div>
                    </div>
                    {(productSearchTerm || productCodeSearch) && (
                      <div className="mt-3 flex justify-between items-center p-2 bg-white rounded-md border border-blue-200">
                        <div className="text-xs font-medium text-gray-600">
                          📊 عرض {filteredProducts.length} منتج من أصل {productsData?.data?.products?.length || 0}
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
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {saleForm.lines.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="text-6xl mb-3">📝</div>
                        <p className="text-gray-600 font-medium mb-2">لا توجد بنود في الفاتورة</p>
                        <p className="text-sm text-gray-500">اضغط على "إضافة بند" لبدء إنشاء الفاتورة</p>
                      </div>
                    ) : (
                      saleForm.lines.map((line, index) => {
                      const selectedProduct = productsData?.data?.products?.find(p => p.id === line.productId);
                      // حساب إجمالي الأمتار/الوحدات: الكمية × الوحدات في الصندوق
                      const totalUnits = selectedProduct?.unitsPerBox && line.qty 
                        ? Number(line.qty) * Number(selectedProduct.unitsPerBox) 
                        : 0;
                      
                      return (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الصنف</label>
                            <select
                              value={line.productId}
                              onChange={(e) => {
                                const productId = Number(e.target.value);
                                const product = productsData?.data?.products?.find(p => p.id === productId);
                                
                                // التحقق من أن الصنف ينتمي للشركة المختارة
                                if (product && selectedCompanyId && product.createdByCompanyId !== selectedCompanyId) {
                                  const otherCompany = companiesData?.data?.companies?.find(
                                    c => c.id === product.createdByCompanyId
                                  );
                                  error(
                                    'خطأ في الاختيار',
                                    `الصنف "${product.name}" لا ينتمي للشركة المختارة.\n` +
                                    `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}`
                                  );
                                  return;
                                }
                                
                                updateSaleLine(index, 'productId', productId);
                                if (product?.price?.sellPrice) {
                                  updateSaleLine(index, 'unitPrice', Number(product.price.sellPrice));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value={0}>-- اختر الصنف --</option>
                              {filteredProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.sku} - {product.name}
                                </option>
                              ))}
                            </select>
                            {line.productId > 0 && selectedProduct && (
                              <div className="text-xs mt-1 space-y-0.5">
                                <div className="text-gray-600">
                                  📦 {selectedProduct.sku} | {selectedProduct.unit || 'وحدة'}
                                  {selectedProduct.unitsPerBox && ` | ${formatArabicNumber(selectedProduct.unitsPerBox)} ${selectedProduct.unit || 'وحدة'}/صندوق`}
                                </div>
                                {selectedProduct.stock && (
                                  <div className="text-green-600 font-medium">
                                    {selectedProduct.unit === 'صندوق' ? (
                                      <>✅ المخزون: {formatArabicQuantity(selectedProduct.stock.boxes)} صندوق</>
                                    ) : selectedProduct.unitsPerBox ? (
                                      <>✅ المخزون: {formatArabicQuantity(Number(selectedProduct.stock.boxes) * Number(selectedProduct.unitsPerBox))} {selectedProduct.unit || 'وحدة'}</>
                                    ) : (
                                      <>✅ المخزون: {formatArabicQuantity(selectedProduct.stock.boxes)} {selectedProduct.unit || 'وحدة'}</>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {selectedProduct?.unit === 'صندوق' ? 'الصناديق' : `الكمية (${selectedProduct?.unit || 'وحدة'})`}
                            </label>
                            <input
                              type="number"
                              value={line.qty || ''}
                              onChange={(e) => updateSaleLine(index, 'qty', Number(e.target.value) || 0)}
                              className={`w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                selectedProduct?.stock && line.qty > Number(selectedProduct.stock.boxes)
                                  ? 'border-red-300 bg-red-50' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="0"
                              min="1"
                              step="1"
                              required
                            />
                            {selectedProduct?.stock && line.qty > Number(selectedProduct.stock.boxes) && (
                              <div className="text-xs text-red-600 mt-1 font-medium">
                                ⚠️ الكمية أكبر من المخزون!
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {selectedProduct?.unit === 'متر' ? 'إجمالي م²' : 'الإجمالي'}
                            </label>
                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                              <span className="text-sm font-bold text-blue-700 block text-center">
                                {totalUnits > 0 ? formatArabicArea(totalUnits) : '0.00'}
                              </span>
                            </div>
                            {selectedProduct?.unitsPerBox && line.qty > 0 && (
                              <div className="text-xs text-blue-600 mt-1 font-medium">
                                📐 {formatArabicQuantity(line.qty)} × {formatArabicNumber(selectedProduct.unitsPerBox)} = {formatArabicArea(totalUnits)}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">السعر</label>
                            <input
                              type="number"
                              value={line.unitPrice || ''}
                              onChange={(e) => updateSaleLine(index, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              required
                            />
                            {selectedProduct?.price?.sellPrice && (
                              <div className="text-xs text-blue-600 mt-1 font-medium">
                                💰 {formatArabicCurrency(selectedProduct.price.sellPrice)}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">المجموع</label>
                            <div className="px-2 py-2 bg-green-50 border border-green-200 rounded-md">
                              <span className="text-sm font-bold text-green-700 block text-center">
                                {formatArabicCurrency(line.qty * line.unitPrice)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1 opacity-0">حذف</label>
                            <button
                              type="button"
                              onClick={() => removeSaleLine(index)}
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

                  {saleForm.lines.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-700">المجموع الإجمالي:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatArabicCurrency(saleForm.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateSaleModal(false);
                      setProductSearchTerm('');
                      setProductCodeSearch('');
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    <span>❌</span>
                    <span>إلغاء</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !saleForm.customerId}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-md transition-all duration-200 font-medium ${
                      !saleForm.customerId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg'
                    } ${isCreating ? 'opacity-50' : ''}`}
                  >
                    <span>{isCreating ? '⏳' : '💾'}</span>
                    <span>
                      {!saleForm.customerId 
                        ? 'اختر العميل أولاً' 
                        : isCreating ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة عميل جديد</h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customerData: CreateCustomerRequest = {
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string || undefined,
                  note: formData.get('note') as string || undefined,
                };

                try {
                  await createCustomer(customerData).unwrap();
                  success('تم بنجاح', 'تم إضافة العميل بنجاح');
                  setShowCreateCustomerModal(false);
                } catch (err: any) {
                  error('خطأ', err.data?.message || 'حدث خطأ أثناء إضافة العميل');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="note"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    إضافة العميل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                تفاصيل الفاتورة #{selectedSale.invoiceNumber || selectedSale.id}
              </h3>
              
              <div className="space-y-4">
                {/* معلومات الشركة */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-900">الشركة:</span>
                    <span className="text-sm font-semibold text-blue-700">{selectedSale.company?.name}</span>
                    <span className="text-xs text-blue-600">({selectedSale.company?.code})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">العميل:</span> {selectedSale.customer?.name || 'غير محدد'}
                  </div>
                  <div>
                    <span className="font-medium">التاريخ:</span> {new Date(selectedSale.createdAt).toLocaleDateString('en-US')}
                  </div>
                  <div>
                    <span className="font-medium">نوع البيع:</span> {selectedSale.saleType === 'CASH' ? 'نقدي' : 'آجل'}
                  </div>
                  <div>
                    <span className="font-medium">طريقة الدفع:</span> {
                      selectedSale.paymentMethod === 'CASH' ? 'كاش' : 
                      selectedSale.paymentMethod === 'BANK' ? 'حوالة' : 'بطاقة'
                    }
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">بنود الفاتورة:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">كود الصنف</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصناديق</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">إجمالي الوحدات</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الوحدة</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">المجموع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedSale.lines.map((line, index) => {
                          const totalUnits = line.product?.unitsPerBox ? line.qty * Number(line.product.unitsPerBox) : line.qty;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm font-mono text-gray-600">{line.product?.sku}</td>
                              <td className="px-4 py-2 text-sm">{line.product?.name}</td>
                              <td className="px-4 py-2 text-sm">{formatArabicQuantity(line.qty)} صندوق</td>
                              <td className="px-4 py-2 text-sm">
                                {formatArabicArea(totalUnits)} {line.product?.unit || 'وحدة'}
                              </td>
                              <td className="px-4 py-2 text-sm">{formatArabicCurrency(line.unitPrice)}</td>
                              <td className="px-4 py-2 text-sm font-medium">{formatArabicCurrency(line.subTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-right text-lg font-bold">
                    المجموع الإجمالي: {formatArabicCurrency(selectedSale.total)}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      <PrintModal
        sale={saleToPrint}
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setSaleToPrint(null);
        }}
      />
    </div>
  );
};

export default SalesPage;
