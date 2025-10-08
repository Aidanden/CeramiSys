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
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity } from '@/utils/formatArabicNumbers';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import useNotifications from '@/hooks/useNotifications';
import { useToast } from '@/components/ui/Toast';
import CreateProvisionalSaleModal from '@/components/provisional-sales/CreateProvisionalSaleModal';

const ProvisionalSalesPage = () => {
  const notifications = useNotifications();
  const { confirm } = useToast();
  
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
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API calls
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useGetProvisionalSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    status: statusFilter || undefined,
    companyId: selectedCompanyId || undefined
  });

  const { data: customersData, isLoading: customersLoading } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ limit: 1000 });
  
  const [createSale, { isLoading: isCreating }] = useCreateProvisionalSaleMutation();
  const [deleteSale, { isLoading: isDeleting }] = useDeleteProvisionalSaleMutation();
  const [updateStatus] = useUpdateProvisionalSaleStatusMutation();
  const [convertToSale] = useConvertProvisionalSaleToSaleMutation();
  const [createCustomer] = useCreateCustomerMutation();

  // Auto-select company for non-system users
  useEffect(() => {
    if (user && !user.isSystemUser && user.companyId) {
      setSelectedCompanyId(user.companyId);
    }
  }, [user]);

  // Handle create sale
  const handleCreateSale = async (data: CreateProvisionalSaleRequest) => {
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      notifications.custom.error('يرجى اختيار الشركة');
      return;
    }

    try {
      await createSale({
        ...data,
        companyId: targetCompanyId
      }).unwrap();
      
      notifications.custom.success('تم إنشاء الفاتورة المبدئية بنجاح');
      setShowCreateModal(false);
      refetchSales();
    } catch (error: any) {
      notifications.custom.error(error?.data?.message || 'حدث خطأ في إنشاء الفاتورة المبدئية');
    }
  };

  const resetForm = () => {
    setSaleForm({
      customerId: undefined,
      status: 'DRAFT',
      lines: []
    });
    setProductSearchTerm('');
  };

  // Handle status change
  const handleStatusChange = async (saleId: number, newStatus: string) => {
    try {
      await updateStatus({
        id: saleId,
        data: { status: newStatus as any }
      }).unwrap();
      
      notifications.success('تم تحديث حالة الفاتورة بنجاح');
      refetchSales();
    } catch (error: any) {
      notifications.error(error?.data?.message || 'حدث خطأ في تحديث الحالة');
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
        
        notifications.success('تم ترحيل الفاتورة المبدئية بنجاح');
        refetchSales();
      } catch (error: any) {
        notifications.error(error?.data?.message || 'حدث خطأ في ترحيل الفاتورة');
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
        notifications.success('تم حذف الفاتورة المبدئية بنجاح');
        refetchSales();
      } catch (error: any) {
        notifications.error(error?.data?.message || 'حدث خطأ في حذف الفاتورة');
      }
    }
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
  const filteredProducts = productsData?.data?.filter(product => 
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
                {companiesData?.data?.map((company) => (
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
              ) : salesData?.data?.length === 0 ? (
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
                      {formatArabicCurrency(sale.total)} ر.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(sale.status)}`}>
                        {getStatusText(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString('ar-SA')}
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
      {salesData?.pagination && salesData.pagination.totalPages > 1 && (
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
              صفحة {formatArabicNumber(currentPage)} من {formatArabicNumber(salesData.pagination.totalPages)}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, salesData.pagination.totalPages))}
              disabled={currentPage === salesData.pagination.totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateProvisionalSaleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSale}
        isLoading={isCreating}
        selectedCompanyId={selectedCompanyId}
        isSystemUser={user?.isSystemUser || false}
      />
    </div>
  );
};

export default ProvisionalSalesPage;
