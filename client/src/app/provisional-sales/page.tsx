"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  useGetProvisionalSalesQuery, 
  useCreateProvisionalSaleMutation, 
  useUpdateProvisionalSaleMutation,
  useDeleteProvisionalSaleMutation,
  useUpdateProvisionalSaleStatusMutation,
  useConvertProvisionalSaleToSaleMutation,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  ProvisionalSale,
  Customer,
  CreateProvisionalSaleRequest,
  CreateCustomerRequest,
  provisionalSalesApi
} from '@/state/provisionalSalesApi';
import { useGetProductsQuery, productsApi } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/app/redux';
import { useToast } from '@/components/ui/Toast';

const ProvisionalSalesPage = () => {
  const { success, error, confirm } = useToast();
  const dispatch = useDispatch();
  
  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: currentUserData, isLoading: userLoading } = useGetCurrentUserQuery();
  
  // استخدام البيانات من API إذا كانت متوفرة، وإلا من Redux
  const user = currentUserData?.data || currentUser;
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [customerPhoneFilter, setCustomerPhoneFilter] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ProvisionalSale | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saleToConvert, setSaleToConvert] = useState<ProvisionalSale | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<ProvisionalSale | null>(null);
  const [convertForm, setConvertForm] = useState<{
    saleType: 'CASH' | 'CREDIT';
    paymentMethod?: 'CASH' | 'BANK' | 'CARD';
  }>({
    saleType: 'CASH',
    paymentMethod: 'CASH'
  });
  
  // State لتتبع الفواتير المرحلة محلياً (للتحديث الفوري)
  const [convertedSaleIds, setConvertedSaleIds] = useState<Set<number>>(new Set());
  
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
  const { 
    data: salesData, 
    isLoading: salesLoading, 
    error: salesError,
    refetch: refetchSales 
  } = useGetProvisionalSalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm,
    status: statusFilter as "DRAFT" | "PENDING" | "APPROVED" | "CONVERTED" | "CANCELLED" | undefined,
    companyId: selectedCompanyId || undefined,
    todayOnly: true // عرض فواتير اليوم الحالي فقط
  }, {
    // إعادة جلب البيانات عند تغيير المعاملات
    refetchOnMountOrArgChange: true,
    // إعادة جلب البيانات عند العودة للصفحة
    refetchOnFocus: true,
    // إعادة جلب البيانات عند إعادة الاتصال
    refetchOnReconnect: true,
    // تخطي الاستعلام إذا لم يكن هناك مستخدم أو (للمستخدمين النظام: لا توجد شركة محددة)
    skip: !user || (user.isSystemUser && !selectedCompanyId)
  });

  const { data: customersData, isLoading: customersLoading, error: customersError } = useGetCustomersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  
  // Auto-select company for non-system users and set default for system users
  useEffect(() => {
    if (user && user.companyId && !selectedCompanyId) {
      // للمستخدمين العاديين: اختيار شركتهم تلقائياً
      // لمستخدمي النظام: اختيار شركتهم كخيار افتراضي إذا لم يتم اختيار شركة بعد
      setSelectedCompanyId(user.companyId);
    }
  }, [user, selectedCompanyId]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Provisional Sales Debug:', {
        user: user ? 'exists' : 'null',
        isSystemUser: user?.isSystemUser,
        userCompanyId: user?.companyId,
        selectedCompanyId,
        salesDataCount: salesData?.data?.provisionalSales?.length || 0,
        salesLoading,
        salesError: salesError ? 'exists' : 'null',
        querySkipped: !user || (!user.isSystemUser && !user.companyId)
      });
    }
  }, [user, selectedCompanyId, salesData, salesLoading, salesError]);

  // Debug: مراقبة تغييرات البنود
  useEffect(() => {
    console.log('🔧 تغيير في البنود:', {
      linesCount: saleForm.lines.length,
      lines: saleForm.lines,
      buttonShouldBeDisabled: saleForm.lines.length === 0
    });
  }, [saleForm.lines]);

  // جلب جميع الأصناف ثم الفلترة في الواجهة الأمامية حسب الشركة المختارة
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({ 
    limit: 1000
  });
  
  const [createSale, { isLoading: isCreating }] = useCreateProvisionalSaleMutation();
  const [updateSale, { isLoading: isUpdating }] = useUpdateProvisionalSaleMutation();
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

    // التحقق من توفر الكمية في المخزون
    const insufficientStockLines = saleForm.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      if (!product || !product.stock) return true; // لا يوجد مخزون
      
      const availableQty = Number(product.stock.boxes);
      return line.qty > availableQty;
    });

    if (insufficientStockLines.length > 0) {
      const errorMessages = insufficientStockLines.map(line => {
        const product = productsData?.data?.products?.find(p => p.id === line.productId);
        const availableQty = product?.stock ? Number(product.stock.boxes) : 0;
        return `• ${product?.name || 'صنف'}: مطلوب ${formatArabicQuantity(line.qty)} ${product?.unit || 'وحدة'} - متوفر ${formatArabicQuantity(availableQty)} ${product?.unit || 'وحدة'}`;
      }).join('\n');
      
      error(`الكمية المطلوبة غير متوفرة في المخزون:\n\n${errorMessages}`);
      return;
    }

    try {
      // إعداد البيانات - إزالة customerId إذا لم يكن محدداً
      const saleRequest: any = {
        status: saleForm.status,
        lines: saleForm.lines,
        companyId: targetCompanyId
      };
      
      // إضافة customerId فقط إذا كان محدداً
      if (saleForm.customerId) {
        saleRequest.customerId = saleForm.customerId;
      }
      
      const result = await createSale(saleRequest).unwrap();
      success('تم إنشاء الفاتورة المبدئية بنجاح');
      
      setShowCreateModal(false);
      resetForm();
      
      // إعادة جلب البيانات فوراً لتحديث الجدول
      await refetchSales();
      
      // تحديث الكاش للمنتجات
      dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
      // للمستخدمين العاديين: الاحتفاظ بالشركة
      // لمستخدمي النظام: الاحتفاظ بالشركة لعرض الفواتير الجديدة
      // if (user?.isSystemUser) {
      //   setSelectedCompanyId(null);
      // }
      
      console.log('✅ تم إنشاء الفاتورة المبدئية:', result);
    } catch (err: any) {
      console.error('❌ خطأ في إنشاء الفاتورة المبدئية:', err);
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

  // Handle update sale
  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!saleToEdit) return;
    
    // تحديد الشركة المستهدفة
    const targetCompanyId = user?.isSystemUser ? selectedCompanyId : user?.companyId;
    
    if (!targetCompanyId) {
      error(user?.isSystemUser ? 'يجب اختيار الشركة أولاً' : 'لا يمكن تحديد شركتك');
      return;
    }
    
    if (saleForm.lines.length === 0) {
      error('يجب إضافة بند واحد على الأقل');
      return;
    }

    // التحقق من توفر الكمية في المخزون
    const insufficientStockLines = saleForm.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      if (!product || !product.stock) return true; // لا يوجد مخزون
      
      const availableQty = Number(product.stock.boxes);
      return line.qty > availableQty;
    });

    if (insufficientStockLines.length > 0) {
      const errorMessages = insufficientStockLines.map(line => {
        const product = productsData?.data?.products?.find(p => p.id === line.productId);
        const availableQty = product?.stock ? Number(product.stock.boxes) : 0;
        return `• ${product?.name || 'صنف'}: مطلوب ${formatArabicQuantity(line.qty)} ${product?.unit || 'وحدة'} - متوفر ${formatArabicQuantity(availableQty)} ${product?.unit || 'وحدة'}`;
      }).join('\n');
      
      error(`الكمية المطلوبة غير متوفرة في المخزون:\n\n${errorMessages}`);
      return;
    }

    try {
      // إعداد البيانات - إزالة customerId إذا لم يكن محدداً
      const updateData: any = {
        status: saleForm.status,
        lines: saleForm.lines
      };
      
      // إضافة customerId فقط إذا كان محدداً
      if (saleForm.customerId) {
        updateData.customerId = saleForm.customerId;
      }
      
      console.log('🔧 بيانات التحديث:', {
        id: saleToEdit.id,
        updateData,
        customerId: saleForm.customerId,
        linesCount: saleForm.lines.length
      });
      
      const result = await updateSale({
        id: saleToEdit.id,
        data: updateData
      }).unwrap();
      
      console.log('✅ نجح التحديث:', result);
      
      success('تم تحديث الفاتورة المبدئية بنجاح');
      setShowEditModal(false);
      setSaleToEdit(null);
      resetForm();
      
      // إعادة جلب البيانات فوراً لتحديث الجدول
      await refetchSales();
      
      // تحديث الكاش للمنتجات
      dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
    } catch (err: any) {
      console.error('❌ خطأ في تحديث الفاتورة المبدئية:', {
        error: err,
        message: err?.message,
        data: err?.data,
        status: err?.status,
        originalStatus: err?.originalStatus
      });
      error(err?.data?.message || err?.message || 'حدث خطأ أثناء تحديث الفاتورة');
    }
  };

  // Handle delete sale
  const handleDeleteSale = async (sale: ProvisionalSale) => {
    const confirmed = await confirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف الفاتورة المبدئية رقم ${sale.invoiceNumber || sale.id}؟`
    );

    if (confirmed) {
      try {
        await deleteSale(sale.id).unwrap();
        success('تم حذف الفاتورة المبدئية بنجاح');
        
        // إعادة جلب البيانات فوراً لتحديث الجدول
        await refetchSales();
        
        // تحديث الكاش للمنتجات
        dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
      } catch (err: any) {
        error(err.data?.message || 'حدث خطأ أثناء حذف الفاتورة');
      }
    }
  };

  // Handle convert to sale - open modal
  const handleOpenConvertModal = async (sale: ProvisionalSale) => {
    // التحقق من توفر الكميات في المخزون
    const insufficientStockLines = sale.lines.filter(line => {
      const product = productsData?.data?.products?.find(p => p.id === line.productId);
      if (!product || !product.stock) return true; // لا يوجد مخزون
      
      const availableQty = Number(product.stock.boxes);
      return line.qty > availableQty;
    });

    if (insufficientStockLines.length > 0) {
      // عرض رسالة تفصيلية عن الأصناف غير المتوفرة
      const errorMessages = insufficientStockLines.map(line => {
        const product = productsData?.data?.products?.find(p => p.id === line.productId);
        const availableQty = product?.stock ? Number(product.stock.boxes) : 0;
        return `• ${product?.name || 'صنف'}: مطلوب ${formatArabicQuantity(line.qty)} ${product?.unit || 'وحدة'} - متوفر ${formatArabicQuantity(availableQty)} ${product?.unit || 'وحدة'}`;
      }).join('\n');
      
      const confirmed = await confirm(
        'الكميات غير متوفرة في المخزون',
        `الكميات التالية غير متوفرة:\n\n${errorMessages}\n\nهل تريد تعديل الفاتورة المبدئية؟`
      );

      if (confirmed) {
        // فتح نافذة التعديل
        setSaleToEdit(sale);
        setSelectedCompanyId(sale.companyId); // تعيين الشركة
        setSaleForm({
          customerId: sale.customerId,
          status: sale.status,
          lines: sale.lines.map(line => ({
            id: line.id, // إضافة id للسطر (مطلوب للتحديث)
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice
          }))
        });
        setShowEditModal(true);
      }
      return;
    }

    // إذا كانت الكميات متوفرة، فتح نافذة الترحيل
    setSaleToConvert(sale);
    setConvertForm({
      saleType: 'CASH',
      paymentMethod: 'CASH'
    });
    setShowConvertModal(true);
  };

  // Handle convert to sale - submit
  const handleConvertToSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!saleToConvert) return;

    try {
      // إضافة الفاتورة للقائمة المحلية فوراً (للتحديث الفوري)
      setConvertedSaleIds(prev => new Set(prev).add(saleToConvert.id));
      
      const result = await convertToSale({
        id: saleToConvert.id,
        data: {
          saleType: convertForm.saleType,
          paymentMethod: convertForm.paymentMethod
        }
      }).unwrap();
      
      success('تم ترحيل الفاتورة المبدئية بنجاح');
      setShowConvertModal(false);
      setSaleToConvert(null);
      
      // إعادة جلب البيانات فوراً لتحديث الجدول
      await refetchSales();
      
      // تحديث الكاش للمنتجات
      dispatch(productsApi.util.invalidateTags(['Products', 'Product', 'ProductStats']));
    } catch (err: any) {
      // في حالة الفشل، إزالة الفاتورة من القائمة المحلية
      setConvertedSaleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(saleToConvert.id);
        return newSet;
      });
      error(err.data?.message || 'حدث خطأ في ترحيل الفاتورة');
    }
  };

  // Handle print provisional sale
  const handlePrintProvisionalSale = (sale: ProvisionalSale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة مبدئية - ${sale.invoiceNumber || `PROV-${sale.id}`}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #8b5cf6;
            border-radius: 10px;
            overflow: hidden;
          }
          .invoice-header {
            background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .invoice-header h1 {
            font-size: 32px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .invoice-header p {
            font-size: 16px;
            opacity: 0.9;
            margin-top: 5px;
          }
          .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 30px;
            background: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
          }
          .info-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .info-section h3 {
            color: #8b5cf6;
            font-size: 14px;
            margin-bottom: 10px;
            border-bottom: 2px solid #8b5cf6;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 13px;
          }
          .info-label {
            color: #6b7280;
            font-weight: 500;
          }
          .info-value {
            color: #111827;
            font-weight: 600;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table thead {
            background: #8b5cf6;
            color: white;
          }
          .items-table th {
            padding: 12px;
            text-align: right;
            font-size: 13px;
            font-weight: 600;
          }
          .items-table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .items-table tbody tr:hover {
            background: #f9fafb;
          }
          .items-table tbody tr:last-child td {
            border-bottom: 2px solid #8b5cf6;
          }
          .total-section {
            padding: 20px 30px;
            background: #f9fafb;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 16px;
          }
          .total-row.grand-total {
            border-top: 2px solid #8b5cf6;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: bold;
            color: #8b5cf6;
          }
          .footer {
            padding: 20px 30px;
            text-align: center;
            background: #f9fafb;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-draft { background: #f3f4f6; color: #374151; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-converted { background: #dbeafe; color: #1e40af; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(139, 92, 246, 0.05);
            font-weight: bold;
            z-index: -1;
            white-space: nowrap;
          }
          @media print {
            body { padding: 0; }
            .invoice-container { border: none; }
            .watermark { color: rgba(139, 92, 246, 0.03); }
          }
        </style>
      </head>
      <body>
        <div class="watermark">فاتورة مبدئية</div>
        <div class="invoice-container">
          <div class="invoice-header">
            <h1>${sale.company?.name || 'الشركة'}</h1>
            <p>فاتورة مبدئية</p>
          </div>
          
          <div class="invoice-info">
            <div class="info-section">
              <h3>معلومات الفاتورة</h3>
              <div class="info-row">
                <span class="info-label">رقم الفاتورة:</span>
                <span class="info-value">${sale.invoiceNumber || `PROV-${sale.id}`}</span>
              </div>
              <div class="info-row">
                <span class="info-label">التاريخ:</span>
                <span class="info-value">${new Date(sale.createdAt).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            
            <div class="info-section">
              <h3>معلومات الشركة والعميل</h3>
              <div class="info-row">
                <span class="info-label">الشركة:</span>
                <span class="info-value">${sale.company?.name || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">كود الشركة:</span>
                <span class="info-value">${sale.company?.code || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">العميل:</span>
                <span class="info-value">${sale.customer?.name || 'عميل نقدي'}</span>
              </div>
              ${sale.customer?.phone ? `
              <div class="info-row">
                <span class="info-label">الهاتف:</span>
                <span class="info-value">${sale.customer.phone}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div style="padding: 0 30px;">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th style="width: 120px;">الكود</th>
                  <th>اسم الصنف</th>
                  <th style="width: 100px;">الكمية</th>
                  <th style="width: 120px;">السعر</th>
                  <th style="width: 120px;">المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${sale.lines.map((line, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td style="font-family: monospace; font-weight: 600;">${line.product?.sku || '-'}</td>
                    <td style="font-weight: 600;">${line.product?.name || '-'}</td>
                    <td>${formatArabicArea(line.qty)} ${line.product?.unit || 'وحدة'}</td>
                    <td>${formatArabicCurrency(line.unitPrice)}</td>
                    <td style="font-weight: 700; color: #8b5cf6;">${formatArabicCurrency(line.subTotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="total-section">
            <div class="total-row grand-total">
              <span>المجموع الإجمالي:</span>
              <span>${formatArabicCurrency(sale.total || 0)}</span>
            </div>
          </div>
          
          ${sale.notes ? `
          <div style="padding: 20px 30px; background: #fffbeb; border-top: 2px solid #fbbf24;">
            <h4 style="color: #92400e; margin-bottom: 10px; font-size: 14px;">ملاحظات:</h4>
            <p style="color: #78350f; font-size: 13px; line-height: 1.6;">${sale.notes}</p>
          </div>
          ` : ''}
          
          <div class="footer">
            <p style="margin-bottom: 5px;">⚠️ هذه فاتورة مبدئية - لا تعتبر فاتورة نهائية</p>
            <p>تم الطباعة في: ${new Date().toLocaleString('ar-LY')}</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Add line to sale
  const addSaleLine = () => {
    console.log('🔧 إضافة بند جديد - البنود الحالية:', saleForm.lines.length);
    setSaleForm(prev => {
      const newLines = [...prev.lines, { productId: 0, qty: 1, unitPrice: 0 }];
      console.log('🔧 البنود بعد الإضافة:', newLines.length);
      return {
        ...prev,
        lines: newLines
      };
    });
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
  const filteredProducts = React.useMemo(() => {
    const products = productsData?.data?.products?.filter(product => {
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
    
    return products;
  }, [productsData, productSearchTerm, productCodeSearch, selectedCompanyId, user]);

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

  // حساب عدد النتائج بعد الفلترة
  const filteredSalesCount = salesData?.data?.provisionalSales
    ?.filter((sale: ProvisionalSale) => {
      // فلترة بأسم الزبون
      if (customerNameFilter && sale.customer) {
        const customerName = sale.customer.name?.toLowerCase() || '';
        if (!customerName.includes(customerNameFilter.toLowerCase())) {
          return false;
        }
      }
      
      // فلترة برقم الهاتف
      if (customerPhoneFilter && sale.customer) {
        const customerPhone = sale.customer.phone || '';
        if (!customerPhone.includes(customerPhoneFilter)) {
          return false;
        }
      }
      
      return true;
    })?.length || 0;

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
              <p className="text-text-secondary">إدارة الفواتير المبدئية والعروض</p>
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
              <p className="text-2xl font-bold text-text-primary">{formatArabicNumber(salesData?.data?.pagination?.total || 0)}</p>
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
              <p className="text-2xl font-bold text-gray-600">{formatArabicNumber(salesData?.data?.provisionalSales?.filter((sale: any) => sale.status === 'DRAFT').length || 0)}</p>
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
              <p className="text-2xl font-bold text-green-600">{formatArabicNumber(salesData?.data?.provisionalSales?.filter((sale: any) => sale.status === 'APPROVED').length || 0)}</p>
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
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(salesData?.data?.provisionalSales?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0)}</p>
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
          disabled={!user?.isSystemUser}
          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-lg font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {user?.isSystemUser && <option value="">-- اختر الشركة أولاً --</option>}
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

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="البحث برقم الفاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Customer Name Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              placeholder="البحث بأسم الزبون..."
              value={customerNameFilter}
              onChange={(e) => setCustomerNameFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Customer Phone Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <input
              type="text"
              placeholder="البحث برقم الهاتف..."
              value={customerPhoneFilter}
              onChange={(e) => setCustomerPhoneFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">جميع الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="PENDING">معلقة</option>
            <option value="APPROVED">معتمدة</option>
            <option value="CONVERTED">مرحلة</option>
            <option value="CANCELLED">ملغية</option>
          </select>

          {/* Add Customer */}
          <button 
            onClick={() => setShowCreateCustomerModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            عميل جديد
          </button>

          {/* Clear Filters Button */}
          {(searchTerm || customerNameFilter || customerPhoneFilter || statusFilter) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setCustomerNameFilter('');
                setCustomerPhoneFilter('');
                setStatusFilter('');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              مسح الفلاتر
            </button>
          )}
        </div>
        
        {/* عرض عدد النتائج المفلترة */}
        {(customerNameFilter || customerPhoneFilter) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">النتائج المفلترة: {formatArabicNumber(filteredSalesCount)}</span>
                {' '}من أصل {formatArabicNumber(salesData?.data?.provisionalSales?.length || 0)} فاتورة
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {salesError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">خطأ في تحميل البيانات</h3>
              <p className="text-red-600 text-sm mt-1">
                {(salesError as any)?.data?.message || 'حدث خطأ أثناء تحميل الفواتير المبدئية'}
              </p>
              <button
                onClick={() => refetchSales()}
                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

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
                  الحالة
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
              {salesLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      جاري التحميل...
                    </div>
                  </td>
                </tr>
              ) : !salesData?.data?.provisionalSales || salesData?.data?.provisionalSales?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-center">
                        <p className="font-medium">لا توجد فواتير مبدئية</p>
                        {!selectedCompanyId && user?.isSystemUser && (
                          <p className="text-sm text-orange-600 mt-1">يرجى اختيار الشركة أولاً لعرض الفواتير</p>
                        )}
                        {selectedCompanyId && (
                          <p className="text-sm text-gray-500 mt-1">
                            {user?.isSystemUser 
                              ? `لا توجد فواتير مبدئية للشركة المختارة. ابدأ بإنشاء أول فاتورة مبدئية.`
                              : 'لا توجد فواتير مبدئية لشركتك. ابدأ بإنشاء أول فاتورة مبدئية.'
                            }
                          </p>
                        )}
                        {!selectedCompanyId && !user?.isSystemUser && user?.companyId && (
                          <p className="text-sm text-gray-500 mt-1">لا توجد فواتير مبدئية لشركتك. ابدأ بإنشاء أول فاتورة مبدئية.</p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                salesData?.data?.provisionalSales
                  ?.filter((sale: ProvisionalSale) => {
                    // فلترة بأسم الزبون
                    if (customerNameFilter && sale.customer) {
                      const customerName = sale.customer.name?.toLowerCase() || '';
                      if (!customerName.includes(customerNameFilter.toLowerCase())) {
                        return false;
                      }
                    }
                    
                    // فلترة برقم الهاتف
                    if (customerPhoneFilter && sale.customer) {
                      const customerPhone = sale.customer.phone || '';
                      if (!customerPhone.includes(customerPhoneFilter)) {
                        return false;
                      }
                    }
                    
                    return true;
                  })
                  ?.map((sale: ProvisionalSale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.invoiceNumber || `PROV-${formatArabicNumber(sale.id)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-purple-600">{sale.company?.name}</span>
                        <span className="text-xs text-gray-500">{sale.company?.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer?.name || 'عميل نقدي'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold text-purple-600">
                        {formatArabicCurrency(sale.total || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        convertedSaleIds.has(sale.id) ? 'bg-blue-100 text-blue-800' : getStatusBadgeColor(sale.status)
                      }`}>
                        {convertedSaleIds.has(sale.id) ? 'مرحلة' : getStatusText(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* زر الترحيل - يظهر لجميع الحالات ما عدا المرحلة والملغية */}
                        {!sale.isConverted && !convertedSaleIds.has(sale.id) && sale.status !== 'CANCELLED' && sale.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleOpenConvertModal(sale)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors shadow-sm"
                            title="ترحيل إلى فاتورة مبيعات"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            ترحيل
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintProvisionalSale(sale)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="طباعة الفاتورة"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {salesData?.data?.pagination && salesData.data.pagination.pages > 1 && (
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
                صفحة {formatArabicNumber(currentPage)} من {formatArabicNumber(salesData.data.pagination.pages)}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, salesData.data.pagination.pages))}
                disabled={currentPage === salesData.data.pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إنشاء فاتورة مبدئية جديدة</h3>
              
              {/* عرض الشركة المختارة */}
              <div className="mb-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-900">🏢 الشركة:</span>
                  <span className="text-sm font-semibold text-purple-700">
                    {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                  </span>
                  <span className="text-xs text-purple-600">
                    ({companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.code})
                  </span>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  💡 الفاتورة المبدئية لا تؤثر على المخزون - للعروض والتخطيط فقط
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        !saleForm.customerId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">-- يجب اختيار العميل أولاً --</option>
                      {customersLoading ? (
                        <option disabled>جاري تحميل العملاء...</option>
                      ) : customersError ? (
                        <option disabled>خطأ في تحميل العملاء</option>
                      ) : customersData?.data?.customers?.length === 0 ? (
                        <option disabled>لا توجد عملاء</option>
                      ) : (
                        customersData?.data?.customers
                          ?.filter((customer: Customer) => !customer.phone?.startsWith('BRANCH'))
                          ?.map((customer: Customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))
                      )}
                    </select>
                    {!saleForm.customerId && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ يجب اختيار العميل قبل إضافة البنود
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الحالة *
                    </label>
                    <select
                      value={saleForm.status}
                      onChange={(e) => setSaleForm(prev => ({ 
                        ...prev, 
                        status: e.target.value as any
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="DRAFT">مسودة</option>
                      <option value="PENDING">معلقة</option>
                      <option value="APPROVED">معتمدة</option>
                    </select>
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
                        className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white hover:shadow-lg"
                      >
                        <span className="text-lg">➕</span>
                        <span>إضافة بند</span>
                      </button>
                    </div>
                  </div>

                  {/* حقول البحث */}
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          البحث بالاسم
                        </label>
                        <input
                          type="text"
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          placeholder="ابحث بالاسم..."
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          />
                          {isSearching && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-500 font-medium animate-pulse">
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
                      <div className="mt-3 flex justify-between items-center p-2 bg-white rounded-md border border-purple-200">
                        <div className="text-xs font-medium text-gray-600">
                          📊 عرض {filteredProducts.length} منتج من أصل {productsData?.data?.products?.length || 0}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchTerm('');
                            setProductCodeSearch('');
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 hover:bg-purple-50 rounded transition-colors"
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
                      
                      return (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الصنف</label>
                            <select
                              value={line.productId}
                              onChange={(e) => {
                                const productId = Number(e.target.value);
                                const product = productsData?.data?.products?.find(p => p.id === productId);
                                
                                updateSaleLine(index, 'productId', productId);
                                if (product?.price?.sellPrice) {
                                  updateSaleLine(index, 'unitPrice', Number(product.price.sellPrice));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  📦 الكود: {selectedProduct.sku}
                                </div>
                                {selectedProduct.unitsPerBox && (
                                  <div className="text-blue-600 font-medium">
                                    📏 الصندوق به: {formatArabicNumber(selectedProduct.unitsPerBox)} متر
                                  </div>
                                )}
                                {selectedProduct.stock && (
                                  <div className="text-green-600 font-medium space-y-1">
                                    {selectedProduct.unitsPerBox ? (
                                      <>
                                        <div>✅ الكمية بالمخزن بالمتر: {formatArabicQuantity(Number(selectedProduct.stock.boxes) * Number(selectedProduct.unitsPerBox))} متر</div>
                                        <div className="text-xs text-gray-600">📦 عدد الصناديق بالمخزن: {formatArabicQuantity(selectedProduct.stock.boxes)} صندوق</div>
                                      </>
                                    ) : (
                                      <div>✅ الكمية بالمخزن: {formatArabicQuantity(selectedProduct.stock.boxes)} {selectedProduct.unit || 'وحدة'}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {
                                selectedProduct?.unit === 'صندوق'
                                  ? 'عدد الصناديق'
                                  : `الكمية (${selectedProduct?.unit || 'وحدة'})`
                              }
                            </label>
                            <input
                              type="number"
                              value={line.qty || ''}
                              onChange={(e) => updateSaleLine(index, 'qty', Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder={
                                selectedProduct?.unit === 'صندوق'
                                  ? 'أدخل عدد الصناديق'
                                  : `أدخل الكمية بـ${selectedProduct?.unit || 'الوحدة'}`
                              }
                              min="0.01"
                              step="0.01"
                              required
                            />
                            {selectedProduct?.stock && line.qty > Number(selectedProduct.stock.boxes) && (
                              <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
                                ⚠️ الكمية المطلوبة ({formatArabicQuantity(line.qty)} {selectedProduct?.unit || 'وحدة'}) أكبر من المخزون المتاح ({formatArabicQuantity(selectedProduct.stock.boxes)} {selectedProduct?.unit || 'وحدة'})
                              </div>
                            )}
                            {selectedProduct && !selectedProduct.stock && (
                              <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
                                ⚠️ لا يوجد مخزون لهذا الصنف
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {
                                selectedProduct?.unit === 'صندوق' 
                                  ? 'الكمية الإجمالية بالمتر'
                                  : selectedProduct?.unit === 'قطعة'
                                    ? 'إجمالي القطع'
                                    : 'الكمية الإجمالية'
                              }
                            </label>
                            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-md">
                              <span className="text-sm font-bold text-purple-700 block text-center">
                                {line.qty > 0 ? (
                                  selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox
                                    ? `${formatArabicArea(line.qty * Number(selectedProduct.unitsPerBox))} متر`
                                    : `${formatArabicArea(line.qty)} ${selectedProduct?.unit || 'وحدة'}`
                                ) : '0'}
                              </span>
                            </div>
                            {selectedProduct?.unit === 'صندوق' && selectedProduct?.unitsPerBox && line.qty > 0 && (
                              <div className="text-xs text-blue-600 mt-1 font-medium">
                                📊 {formatArabicQuantity(line.qty)} صندوق × {formatArabicNumber(selectedProduct.unitsPerBox)} متر/صندوق = {formatArabicArea(line.qty * Number(selectedProduct.unitsPerBox))} متر
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">السعر</label>
                            <input
                              type="number"
                              value={line.unitPrice || ''}
                              onChange={(e) => updateSaleLine(index, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              required
                            />
                            {selectedProduct?.price?.sellPrice && (
                              <div className="text-xs text-purple-600 mt-1 font-medium">
                                💰 {formatArabicCurrency(selectedProduct.price.sellPrice)}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">المجموع</label>
                            <div className="px-1 py-2 bg-green-50 border border-green-200 rounded-md overflow-hidden">
                              <span className="text-xs font-bold text-green-700 block text-center break-words leading-tight">
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
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-700">المجموع الإجمالي:</span>
                        <span className="text-2xl font-bold text-purple-600">
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
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    <span>❌</span>
                    <span>إلغاء</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !saleForm.customerId || saleForm.lines.length === 0}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-md transition-all duration-200 font-medium ${
                      !saleForm.customerId || saleForm.lines.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white hover:shadow-lg'
                    } ${isCreating ? 'opacity-50' : ''}`}
                    title={
                      !saleForm.customerId 
                        ? 'يجب اختيار العميل أولاً' 
                        : saleForm.lines.length === 0 
                          ? 'يجب إضافة بند واحد على الأقل' 
                          : ''
                    }
                  >
                    <span>{isCreating ? '⏳' : '💾'}</span>
                    <span>
                      {!saleForm.customerId
                        ? 'اختر العميل أولاً'
                        : saleForm.lines.length === 0
                          ? 'أضف بند واحد على الأقل'
                          : isCreating ? 'جاري الحفظ...' : 'حفظ الفاتورة المبدئية'}
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
                  success('تم إضافة العميل بنجاح');
                  setShowCreateCustomerModal(false);
                } catch (err: any) {
                  error(err.data?.message || 'حدث خطأ أثناء إضافة العميل');
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات
                  </label>
                  <textarea
                    name="note"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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
                تفاصيل الفاتورة المبدئية #{selectedSale.invoiceNumber || selectedSale.id}
              </h3>
              
              <div className="space-y-4">
                {/* معلومات الشركة */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-900">الشركة:</span>
                    <span className="text-sm font-semibold text-purple-700">{selectedSale.company?.name}</span>
                    <span className="text-xs text-purple-600">({selectedSale.company?.code})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">العميل:</span> {selectedSale.customer?.name || 'عميل نقدي'}
                  </div>
                  <div>
                    <span className="font-medium">التاريخ:</span> {new Date(selectedSale.createdAt).toLocaleDateString('ar-LY')}
                  </div>
                  <div>
                    <span className="font-medium">الحالة:</span> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedSale.status)}`}>
                      {getStatusText(selectedSale.status)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">مرحلة:</span> {selectedSale.isConverted ? 'نعم' : 'لا'}
                  </div>
                </div>

                {selectedSale.lines && selectedSale.lines.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">بنود الفاتورة:</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">كود الصنف</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الوحدة</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">المجموع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedSale.lines.map((line, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm font-mono text-gray-600">{line.product?.sku}</td>
                              <td className="px-4 py-2 text-sm">{line.product?.name}</td>
                              <td className="px-4 py-2 text-sm">
                                {formatArabicArea(line.qty)} {line.product?.unit || 'وحدة'}
                              </td>
                              <td className="px-4 py-2 text-sm">{formatArabicCurrency(line.unitPrice)}</td>
                              <td className="px-4 py-2 text-sm font-medium">{formatArabicCurrency(line.subTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-right text-lg font-bold">
                    المجموع الإجمالي: {formatArabicCurrency(selectedSale.total || 0)}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => handlePrintProvisionalSale(selectedSale)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    طباعة
                  </button>
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

      {/* Convert to Sale Modal */}
      {showConvertModal && saleToConvert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  ترحيل الفاتورة المبدئية إلى فاتورة مبيعات
                </h3>
                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    setSaleToConvert(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* معلومات الفاتورة المبدئية */}
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-bold text-blue-900 mb-3">معلومات الفاتورة المبدئية</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">رقم الفاتورة:</span>
                    <span className="mr-2 text-blue-900 font-semibold">
                      {saleToConvert.invoiceNumber || `PROV-${saleToConvert.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">الشركة:</span>
                    <span className="mr-2 text-blue-900 font-semibold">{saleToConvert.company?.name}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">العميل:</span>
                    <span className="mr-2 text-blue-900 font-semibold">
                      {saleToConvert.customer?.name || 'عميل نقدي'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">المجموع:</span>
                    <span className="mr-2 text-blue-900 font-bold">
                      {formatArabicCurrency(saleToConvert.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* تحذير */}
              <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-yellow-900 mb-1">تنبيه هام</p>
                    <p className="text-sm text-yellow-800">
                      سيتم ترحيل هذه الفاتورة المبدئية إلى فاتورة مبيعات نهائية وخصم الكميات من المخزون. 
                      هذا الإجراء لا يمكن التراجع عنه.
                    </p>
                    {saleToConvert.status !== 'APPROVED' && (
                      <p className="text-sm text-yellow-800 mt-2">
                        📝 ملاحظة: سيتم اعتماد الفاتورة تلقائياً عند الترحيل.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleConvertToSale} className="space-y-6">
                {/* نوع الفاتورة */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    نوع الفاتورة <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      convertForm.saleType === 'CASH' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="saleType"
                        value="CASH"
                        checked={convertForm.saleType === 'CASH'}
                        onChange={(e) => setConvertForm(prev => ({
                          ...prev,
                          saleType: e.target.value as 'CASH' | 'CREDIT'
                        }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="mr-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-bold text-gray-900">نقدي</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">الدفع فوري ومباشر</p>
                      </div>
                    </label>

                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      convertForm.saleType === 'CREDIT' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="saleType"
                        value="CREDIT"
                        checked={convertForm.saleType === 'CREDIT'}
                        onChange={(e) => setConvertForm(prev => ({
                          ...prev,
                          saleType: e.target.value as 'CASH' | 'CREDIT'
                        }))}
                        className="w-4 h-4 text-orange-600"
                      />
                      <div className="mr-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-bold text-gray-900">آجل</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">الدفع لاحقاً</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* طريقة الدفع - فقط للنقدي */}
                {convertForm.saleType === 'CASH' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      طريقة الدفع <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <label className={`relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        convertForm.paymentMethod === 'CASH' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="CASH"
                          checked={convertForm.paymentMethod === 'CASH'}
                          onChange={(e) => setConvertForm(prev => ({
                            ...prev,
                            paymentMethod: e.target.value as 'CASH' | 'BANK' | 'CARD'
                          }))}
                          className="sr-only"
                        />
                        <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-bold text-sm text-gray-900">نقداً</span>
                      </label>

                      <label className={`relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        convertForm.paymentMethod === 'BANK' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="BANK"
                          checked={convertForm.paymentMethod === 'BANK'}
                          onChange={(e) => setConvertForm(prev => ({
                            ...prev,
                            paymentMethod: e.target.value as 'CASH' | 'BANK' | 'CARD'
                          }))}
                          className="sr-only"
                        />
                        <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                        <span className="font-bold text-sm text-gray-900">بنك</span>
                      </label>

                      <label className={`relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        convertForm.paymentMethod === 'CARD' 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="CARD"
                          checked={convertForm.paymentMethod === 'CARD'}
                          onChange={(e) => setConvertForm(prev => ({
                            ...prev,
                            paymentMethod: e.target.value as 'CASH' | 'BANK' | 'CARD'
                          }))}
                          className="sr-only"
                        />
                        <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="font-bold text-sm text-gray-900">بطاقة</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* الأزرار */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false);
                      setSaleToConvert(null);
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    تأكيد الترحيل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && saleToEdit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">تعديل الفاتورة المبدئية</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSaleToEdit(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* عرض معلومات الفاتورة */}
              <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-orange-900">📝 تعديل الفاتورة رقم:</span>
                  <span className="text-sm font-semibold text-orange-700">
                    {saleToEdit.invoiceNumber || `PROV-${saleToEdit.id}`}
                  </span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  💡 يرجى تعديل الكميات لتتناسب مع المخزون المتاح
                </p>
              </div>
              
              <form onSubmit={handleUpdateSale} className="space-y-4">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">-- اختر العميل --</option>
                      {customersData?.data?.customers
                        ?.filter((customer: Customer) => !customer.phone?.startsWith('BRANCH'))
                        ?.map((customer: Customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الحالة *
                    </label>
                    <select
                      value={saleForm.status}
                      onChange={(e) => setSaleForm(prev => ({ 
                        ...prev, 
                        status: e.target.value as any
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="DRAFT">مسودة</option>
                      <option value="PENDING">معلقة</option>
                      <option value="APPROVED">معتمدة</option>
                    </select>
                  </div>
                </div>

                {/* Sale Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-base font-bold text-gray-800">
                      📋 بنود الفاتورة *
                    </label>
                    <button
                      type="button"
                      onClick={addSaleLine}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:shadow-lg"
                    >
                      <span className="text-lg">➕</span>
                      <span>إضافة بند</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {saleForm.lines.map((line, index) => {
                      const selectedProduct = productsData?.data?.products?.find(p => p.id === line.productId);
                      
                      return (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-white border-2 border-gray-200 rounded-lg">
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الصنف</label>
                            <select
                              value={line.productId}
                              onChange={(e) => {
                                const productId = Number(e.target.value);
                                const product = productsData?.data?.products?.find(p => p.id === productId);
                                
                                updateSaleLine(index, 'productId', productId);
                                if (product?.price?.sellPrice) {
                                  updateSaleLine(index, 'unitPrice', Number(product.price.sellPrice));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              required
                            >
                              <option value={0}>-- اختر الصنف --</option>
                              {filteredProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.sku} - {product.name}
                                </option>
                              ))}
                            </select>
                            {selectedProduct?.stock && (
                              <div className="text-xs text-green-600 mt-1">
                                ✅ متوفر: {formatArabicQuantity(selectedProduct.stock.boxes)} {selectedProduct.unit || 'وحدة'}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">الكمية</label>
                            <input
                              type="number"
                              value={line.qty || ''}
                              onChange={(e) => updateSaleLine(index, 'qty', Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              min="0.01"
                              step="0.01"
                              required
                            />
                            {selectedProduct?.stock && line.qty > Number(selectedProduct.stock.boxes) && (
                              <div className="text-xs text-red-600 mt-1 font-medium">
                                ⚠️ أكبر من المخزون
                              </div>
                            )}
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">السعر</label>
                            <input
                              type="number"
                              value={line.unitPrice || ''}
                              onChange={(e) => updateSaleLine(index, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">المجموع</label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                              <span className="text-sm font-bold text-gray-700">
                                {formatArabicCurrency((line.qty || 0) * (line.unitPrice || 0))}
                              </span>
                            </div>
                          </div>
                          
                          <div className="col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={() => removeSaleLine(index)}
                              className="w-full px-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                              title="حذف البند"
                            >
                              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* الأزرار */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSaleToEdit(null);
                      resetForm();
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || saleForm.lines.length === 0}
                    className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        حفظ التعديلات
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvisionalSalesPage;
