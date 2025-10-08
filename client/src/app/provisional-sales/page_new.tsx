"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  useGetProvisionalSalesQuery, 
  useCreateProvisionalSaleMutation, 
  useDeleteProvisionalSaleMutation,
  useUpdateProvisionalSaleStatusMutation,
  useConvertProvisionalSaleToSaleMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  ProvisionalSale,
  Customer,
  CreateProvisionalSaleRequest,
  CreateCustomerRequest
} from '@/state/provisionalSalesApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { useToast } from '@/components/ui/Toast';

const ProvisionalSalesPage = () => {
  const { success, error, confirm } = useToast();
  
  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
  
  // استخدام البيانات من API إذا كانت متوفرة، وإلا من Redux
  const user = currentUserData?.data || currentUser;
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ProvisionalSale | null>(null);
  
  // Form states
  const [saleForm, setSaleForm] = useState<CreateProvisionalSaleRequest>({
    customerId: undefined,
    status: 'DRAFT',
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
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGetProvisionalSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    status: statusFilter as "DRAFT" | "PENDING" | "APPROVED" | "CONVERTED" | "CANCELLED" | undefined,
    companyId: selectedCompanyId || undefined
  });

  const { data: customersData, isLoading: customersLoading, error: customersError } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  
  // Auto-select company for non-system users
  useEffect(() => {
    if (user && !user.isSystemUser && user.companyId) {
      setSelectedCompanyId(user.companyId);
    }
  }, [user]);

  // جلب جميع الأصناف ثم الفلترة في الواجهة الأمامية حسب الشركة المختارة
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ 
    limit: 1000
  });
  
  const [createSale, { isLoading: isCreating }] = useCreateProvisionalSaleMutation();
  const [deleteSale, { isLoading: isDeleting }] = useDeleteProvisionalSaleMutation();
  const [updateStatus] = useUpdateProvisionalSaleStatusMutation();
  const [convertToSale] = useConvertProvisionalSaleToSaleMutation();
  const [createCustomer] = useCreateCustomerMutation();

  // Handle create sale
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تحديد الشركة المستهدفة
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      error(user?.isSystemUser ? 'يجب اختيار الشركة أولاً' : 'لا يمكن تحديد شركتك');
      return;
    }
    
    // التحقق من أن المستخدم العادي لا يمكنه إنشاء فاتورة لشركة أخرى
    if (!user?.isSystemUser && selectedCompanyId && selectedCompanyId !== user?.companyId) {
      error('لا يمكنك إنشاء فاتورة لشركة أخرى غير شركتك');
      return;
    }
    
    if (saleForm.lines.length === 0) {
      error('يجب إضافة بند واحد على الأقل');
      return;
    }

    // التحقق من أن جميع الأصناف في البنود تنتمي للشركة المستهدفة
    const invalidLines = saleForm.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      return !product || product.createdByCompanyId !== targetCompanyId;
    });

    if (invalidLines.length > 0) {
      error('بعض الأصناف المختارة لا تنتمي للشركة المستهدفة. يرجى التحقق من البنود.');
      return;
    }

    try {
      // إضافة companyId للطلب
      const saleRequest = {
        ...saleForm,
        companyId: targetCompanyId
      };
      
      await createSale(saleRequest).unwrap();
      success('تم إنشاء الفاتورة المبدئية بنجاح');
      setShowCreateModal(false);
      resetForm();
      // للمستخدمين العاديين: الاحتفاظ بالشركة، لمستخدمي النظام: إعادة تعيين
      if (user?.isSystemUser) {
        setSelectedCompanyId(null);
      }
      refetchSales();
    } catch (err: any) {
      error(err.data?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  const resetForm = () => {
    setSaleForm({
      customerId: undefined,
      status: 'DRAFT',
      lines: []
    });
    setProductSearchTerm('');
    setProductCodeSearch('');
  };

  // Handle delete sale
  const handleDeleteSale = async (sale: ProvisionalSale) => {
    const confirmed = await confirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف الفاتورة المبدئية رقم ${sale.invoiceNumber || sale.id}؟`,
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      try {
        await deleteSale(sale.id).unwrap();
        success('تم حذف الفاتورة المبدئية بنجاح');
        refetchSales();
      } catch (err: any) {
        error(err.data?.message || 'حدث خطأ أثناء حذف الفاتورة');
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
    // للمستخدمين العاديين: عرض أصناف شركتهم فقط
    // لمستخدمي النظام: عرض أصناف الشركة المختارة
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      return false; // لا تعرض أي أصناف إذا لم يتم تحديد الشركة
    }
    
    // التأكد من أن الصنف ينتمي للشركة المستهدفة فقط
    if (product.createdByCompanyId !== targetCompanyId) {
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
      // تحديد الشركة المستهدفة
      const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
      
      if (!productsData?.data?.products || !targetCompanyId) {
        if (code && !targetCompanyId) {
          error(user?.isSystemUser 
            ? 'يجب اختيار الشركة أولاً قبل البحث عن الأصناف'
            : 'لا يمكن تحديد شركتك للبحث عن الأصناف'
          );
        }
        return;
      }

      // البحث فقط في أصناف الشركة المستهدفة
      const exactMatch = productsData.data.products.find(
        product => product.sku.toLowerCase() === code.toLowerCase() 
          && product.createdByCompanyId === targetCompanyId
      );
      
      if (exactMatch) {
        // Auto-add the product to the sale lines
        addSaleLine();
        const newLineIndex = saleForm.lines.length;
        updateSaleLine(newLineIndex, 'productId', exactMatch.id);
        // Set the official price if available
        if (exactMatch.price?.sellPrice) {
          updateSaleLine(newLineIndex, 'unitPrice', Number(exactMatch.price.sellPrice));
        }
        setProductCodeSearch(''); // Clear search after selection
        success(`تم إضافة الصنف: ${exactMatch.name}`);
      } else {
        error(`الصنف بالكود "${code}" غير موجود في مخزن الشركة المختارة.`);
      }
      
      // إيقاف مؤشر البحث
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 800); // الانتظار 800ms
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'CONVERTED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'مسودة';
      case 'PENDING': return 'معلقة';
      case 'APPROVED': return 'معتمدة';
      case 'CONVERTED': return 'مرحلة';
      case 'CANCELLED': return 'ملغية';
      default: return status;
    }
  };

  if (salesLoading || userLoading) {
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
            <div className="w-8 h-8 text-purple-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">إدارة الفواتير المبدئية</h1>
              <p className="text-text-secondary">إدارة الفواتير المبدئية والعروض - لا يتم خصم من المخزون</p>
            </div>
          </div>
          <button
            onClick={() => {
              const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
              if (!targetCompanyId) {
                error(user?.isSystemUser ? 'يجب اختيار الشركة أولاً' : 'لا يمكن تحديد شركتك');
                return;
              }
              setShowCreateModal(true);
            }}
            disabled={user?.isSystemUser ? !selectedCompanyId : !user?.companyId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              (user?.isSystemUser ? selectedCompanyId : user?.companyId)
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg' 
                : 'bg-background-tertiary text-text-muted cursor-not-allowed'
            }`}
            title={(user?.isSystemUser ? !selectedCompanyId : !user?.companyId) ? 'يجب اختيار الشركة أولاً' : 'إنشاء فاتورة مبدئية جديدة'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة مبدئية جديدة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي الفواتير المبدئية</p>
              <p className="text-2xl font-bold text-text-primary">{formatArabicNumber(salesData?.pagination?.total || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">المسودات</p>
              <p className="text-2xl font-bold text-gray-600">{formatArabicNumber(salesData?.data?.filter((sale: any) => sale.status === 'DRAFT').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">المعتمدة</p>
              <p className="text-2xl font-bold text-green-600">{formatArabicNumber(salesData?.data?.filter((sale: any) => sale.status === 'APPROVED').length || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي القيمة</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(salesData?.data?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border-2 border-purple-200">
        <label className="block text-sm font-bold text-purple-900 mb-2">
          🏢 {user?.isSystemUser ? 'اختر الشركة للعمل عليها' : 'الشركة المحددة'} *
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
          disabled={false}
          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-lg font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- اختر الشركة أولاً --</option>
          {companiesLoading ? (
            <option disabled>جاري تحميل الشركات...</option>
          ) : companiesData?.data?.companies && companiesData.data.companies.length > 0 ? (
            // عرض الشركات حسب صلاحية المستخدم
            companiesData.data.companies
              .filter((company) => {
                // مستخدمو النظام يرون جميع الشركات
                if (user?.isSystemUser) {
                  return true;
                }
                // المستخدمون العاديون يرون شركتهم فقط
                return company.id === user?.companyId;
              })
              .map((company) => (
                <option 
                  key={company.id} 
                  value={company.id}
                >
                  {company.name} ({company.code})
                  {company.id === user?.companyId ? ' - شركتك' : ''}
                </option>
              ))
          ) : (
            <option disabled>
              {user?.isSystemUser 
                ? 'لا توجد شركات في النظام' 
                : 'لا يمكن العثور على شركتك'}
            </option>
          )}
        </select>
        {!selectedCompanyId && (
          <p className="text-sm text-purple-700 mt-2 font-medium">
            ⚠️ يجب اختيار الشركة أولاً لتتمكن من إنشاء فاتورة مبدئية جديدة
          </p>
        )}
        {selectedCompanyId && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-700 font-medium">
              ✅ تم اختيار الشركة - يمكنك الآن إنشاء فاتورة مبدئية جديدة
            </p>
            <p className="text-xs text-purple-600">
              💡 ملاحظة: الفواتير المبدئية لا تؤثر على المخزون - هي للعروض والتخطيط فقط
            </p>
          </div>
        )}
      </div>

      {/* Rest of the component will continue... */}
      <div className="text-center py-8">
        <p className="text-gray-500">باقي المكونات قيد التطوير...</p>
      </div>
    </div>
  );
};

export default ProvisionalSalesPage;
