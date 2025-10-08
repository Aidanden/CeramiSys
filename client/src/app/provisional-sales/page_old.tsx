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

  // Handle status change
  const handleStatusChange = async (saleId: number, newStatus: string) => {
    try {
      await updateStatus({
        id: saleId,
        data: { status: newStatus as any }
      }).unwrap();
      
      success('تم تحديث حالة الفاتورة بنجاح');
      refetchSales();
    } catch (error: any) {
      error(error?.data?.message || 'حدث خطأ في تحديث الحالة');
    }
  };

  // Handle convert to sale
  const handleConvertToSale = async (saleId: number) => {
    const confirmed = await confirm({
      title: 'تأكيد الترحيل',
      message: 'هل أنت متأكد من ترحيل هذه الفاتورة المبدئية إلى فاتورة مبيعات؟ سيتم خصم الكميات من المخزون.',
      confirmText: 'ترحيل',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      try {
        await convertToSale({
          id: saleId,
          data: { saleType: 'CREDIT' }
        }).unwrap();
        
        success('تم ترحيل الفاتورة المبدئية بنجاح');
        refetchSales();
      } catch (error: any) {
        error(error?.data?.message || 'حدث خطأ في ترحيل الفاتورة');
      }
    }
  };

  // Handle delete
  const handleDelete = async (saleId: number) => {
    const confirmed = await confirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذه الفاتورة المبدئية؟',
      confirmText: 'حذف',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      try {
        await deleteSale(saleId).unwrap();
        success('تم حذف الفاتورة المبدئية بنجاح');
        refetchSales();
      } catch (error: any) {
        error(error?.data?.message || 'حدث خطأ في حذف الفاتورة');
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
        // الصنف غير موجود في مخزن الشركة المختارة
        const productExistsInOtherCompany = productsData.data.products.find(
          product => product.sku.toLowerCase() === code.toLowerCase()
        );
        
        if (productExistsInOtherCompany) {
          const otherCompany = companiesData?.data?.companies?.find(
            c => c.id === productExistsInOtherCompany.createdByCompanyId
          );
          const currentCompany = companiesData?.data?.companies?.find(
            c => c.id === targetCompanyId
          );
          
          if (user?.isSystemUser) {
            error(
              `الصنف "${code}" (${productExistsInOtherCompany.name}) غير موجود في مخزن الشركة المختارة.\n\n` +
              `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}\n` +
              `الشركة المختارة: ${currentCompany?.name || 'غير محددة'}\n\n` +
              `يرجى اختيار صنف من مخزن الشركة المختارة فقط.`
            );
          } else {
            error(
              `الصنف "${code}" (${productExistsInOtherCompany.name}) غير موجود في مخزن شركتك.\n\n` +
              `هذا الصنف تابع لـ: ${otherCompany?.name || 'شركة أخرى'}\n\n` +
              `يمكنك فقط بيع الأصناف التابعة لشركتك.`
            );
          }
        } else {
          error(`الصنف بالكود "${code}" غير موجود في النظام.`);
        }
      }
      
      // إيقاف مؤشر البحث
      setIsSearching(false);
      searchTimeoutRef.current = null;
    }, 800); // الانتظار 800ms
  };

  // Add product to form
  const addProductToForm = (productId: number, unitPrice: number = 0) => {
    const existingLineIndex = saleForm.lines.findIndex(line => line.productId === productId);
    
    if (existingLineIndex >= 0) {
      const updatedLines = [...saleForm.lines];
      updatedLines[existingLineIndex].qty += 1;
      setSaleForm(prev => ({ ...prev, lines: updatedLines }));
    } else {
      setSaleForm(prev => ({
        ...prev,
        lines: [...prev.lines, { productId, qty: 1, unitPrice }]
      }));
    }
    setProductSearchTerm('');
  };

  // Remove product from form
  const removeProductFromForm = (index: number) => {
    setSaleForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Update line quantity
  const updateLineQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeProductFromForm(index);
      return;
    }
    
    const updatedLines = [...saleForm.lines];
    updatedLines[index].qty = qty;
    setSaleForm(prev => ({ ...prev, lines: updatedLines }));
  };

  // Update line price
  const updateLinePrice = (index: number, unitPrice: number) => {
    const updatedLines = [...saleForm.lines];
    updatedLines[index].unitPrice = unitPrice;
    setSaleForm(prev => ({ ...prev, lines: updatedLines }));
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

  // Filter products based on search
  const filteredProducts = productsData?.data?.products?.filter(product => 
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">الفواتير المبدئية</h1>
        <p className="text-gray-600">إدارة الفواتير المبدئية وترحيلها إلى فواتير مبيعات</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث في الفواتير..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع الحالات</option>
              <option value="DRAFT">مسودة</option>
              <option value="PENDING">معلقة</option>
              <option value="APPROVED">معتمدة</option>
              <option value="CONVERTED">مرحلة</option>
              <option value="CANCELLED">ملغية</option>
            </select>
          </div>

          {user?.isSystemUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">جميع الشركات</option>
                {companiesData?.data?.companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              إضافة فاتورة مبدئية
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم الفاتورة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : !salesData?.data || salesData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    لا توجد فواتير مبدئية
                  </td>
                </tr>
              ) : (
                salesData?.data?.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.invoiceNumber || `PROV-${formatArabicNumber(sale.id)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer?.name || 'عميل نقدي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatArabicCurrency(sale.total || 0)} د.ل
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(sale.status)}`}>
                        {getStatusText(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        {sale.status === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusChange(sale.id, 'PENDING')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            إرسال للمراجعة
                          </button>
                        )}
                        
                        {sale.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(sale.id, 'APPROVED')}
                              className="text-green-600 hover:text-green-900"
                            >
                              اعتماد
                            </button>
                            <button
                              onClick={() => handleStatusChange(sale.id, 'CANCELLED')}
                              className="text-red-600 hover:text-red-900"
                            >
                              إلغاء
                            </button>
                          </>
                        )}
                        
                        {sale.status === 'APPROVED' && !sale.isConverted && (
                          <button
                            onClick={() => handleConvertToSale(sale.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ترحيل
                          </button>
                        )}
                        
                        {!sale.isConverted && sale.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {salesData?.pagination && salesData.pagination.pages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              صفحة {formatArabicNumber(currentPage)} من {formatArabicNumber(salesData.pagination.pages)}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, salesData.pagination.pages))}
              disabled={currentPage === salesData.pagination.pages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">إضافة فاتورة مبدئية جديدة</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (saleForm.lines.length === 0) {
                error('يرجى إضافة منتج واحد على الأقل');
                return;
              }
              handleCreateSale(saleForm);
            }}>
              {/* Customer Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                <select
                  value={saleForm.customerId || ''}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, customerId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">عميل نقدي</option>
                  {customersData?.data?.customers?.map((customer: Customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone || 'لا يوجد هاتف'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select
                  value={saleForm.status}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">مسودة</option>
                  <option value="PENDING">معلقة</option>
                  <option value="APPROVED">معتمدة</option>
                </select>
              </div>

              {/* Product Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث عن منتج</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="ابحث عن منتج بالاسم أو الرمز..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {productSearchTerm && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <div
                          key={product.id}
                          onClick={() => addProductToForm(product.id, product.price?.sellPrice || 0)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">الرمز: {product.sku}</div>
                              <div className="text-sm text-gray-500">
                                المخزون: {(product.stock?.boxes || 0).toLocaleString('ar-LY')} {product.unit || 'وحدة'}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {formatArabicCurrency(product.price?.sellPrice || 0)} د.ل
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Products */}
              {saleForm.lines.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">المنتجات المحددة</h3>
                  <div className="space-y-2">
                    {saleForm.lines.map((line, index) => {
                      const product = productsData?.data?.products?.find(p => p.id === line.productId);
                      const lineTotal = line.qty * line.unitPrice;
                      
                      return (
                        <div key={index} className="flex items-center space-x-2 space-x-reverse p-3 border border-gray-200 rounded-md">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{product?.name}</div>
                            <div className="text-sm text-gray-500">الرمز: {product?.sku}</div>
                          </div>
                          
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="text-sm text-gray-500">الكمية:</div>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={line.qty}
                              onChange={(e) => updateLineQuantity(index, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="text-sm text-gray-500">السعر:</div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLinePrice(index, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                          
                          <div className="text-sm font-medium text-green-600">
                            {formatArabicCurrency(lineTotal)} د.ل
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeProductFromForm(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Total */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">المجموع الإجمالي:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatArabicCurrency(saleForm.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0))} د.ل
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 space-x-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating || saleForm.lines.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvisionalSalesPage;
