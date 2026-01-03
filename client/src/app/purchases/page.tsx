"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
  useDeletePurchaseMutation,
  useGetSuppliersQuery,
  Purchase,
  CreatePurchaseRequest,
  UpdatePurchaseRequest,
  Supplier,
  useCreateSupplierMutation
} from '@/state/purchaseApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetProductsQuery } from '@/state/productsApi';
import {
  useGetExpenseCategoriesQuery,
  useApprovePurchaseMutation,
  useAddExpensesToApprovedPurchaseMutation,
  useGetPurchaseExpensesQuery,
  useDeletePurchaseExpenseMutation,
  CreatePurchaseExpenseDto
} from '@/state/api/purchaseExpenseApi';
import { useGetExchangeRatesQuery } from '@/state/settingsApi';
import { useAppSelector } from '@/app/redux';
import { useToast } from '@/components/ui/Toast';
import { formatArabicCurrency } from '@/utils/formatArabicNumbers';
import ExpenseCategorySelector from '@/components/purchases/ExpenseCategorySelector';
import SupplierSelector from '@/components/purchases/SupplierSelector';
import UnifiedSupplierModal from '@/components/shared/UnifiedSupplierModal';
import PurchaseLineItem from './PurchaseLineItem';
import PurchaseApprovalModal from '@/components/purchases/PurchaseApprovalModal';

const PurchasesPage = () => {
  const { success, error, warning, info, confirm } = useToast();
  const user = useAppSelector((state) => state.auth.user);

  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(user?.companyId || null);

  // Filter states
  const [filterSupplierName, setFilterSupplierName] = useState('');
  const [filterSupplierPhone, setFilterSupplierPhone] = useState('');
  const [filterInvoiceNumber, setFilterInvoiceNumber] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showCreatePurchaseModal, setShowCreatePurchaseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPurchaseDetailsModal, setShowPurchaseDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [purchaseToApprove, setPurchaseToApprove] = useState<Purchase | null>(null);
  const [showAddExpensesModal, setShowAddExpensesModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState<CreatePurchaseExpenseDto[]>([]);
  const [newExpense, setNewExpense] = useState<CreatePurchaseExpenseDto>({
    categoryId: 0,
    supplierId: undefined,
    amount: 0,
    currency: 'LYD',
    exchangeRate: 1,
    notes: '',
    isActualExpense: true // افتراضي: مصروف فعلي
  });
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const supplierSearchRef = useRef<HTMLDivElement>(null);

  // Purchase form states
  const [purchaseForm, setPurchaseForm] = useState<CreatePurchaseRequest>({
    companyId: user?.companyId || 0,
    supplierId: undefined,
    purchaseType: 'CASH',
    paymentMethod: 'CASH',
    currency: 'LYD',
    exchangeRate: 1,
    lines: []
  });

  // Product search states
  const [productNameSearch, setProductNameSearch] = useState(''); // البحث بالاسم (like)
  const [productCodeSearch, setProductCodeSearch] = useState(''); // البحث بالكود (=)
  const [isSearching, setIsSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // إغلاق قائمة الموردين عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierSearchRef.current && !supplierSearchRef.current.contains(event.target as Node)) {
        setShowSupplierSuggestions(false);
      }
    };

    if (showSupplierSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSupplierSuggestions]);

  // إغلاق القائمة المنسدلة للأصناف عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProductDropdown]);

  // API calls
  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useGetPurchasesQuery({
    page: currentPage,
    limit: 10,
    companyId: selectedCompanyId || undefined,
    supplierName: filterSupplierName || undefined,
    supplierPhone: filterSupplierPhone || undefined,
    invoiceNumber: filterInvoiceNumber || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  });

  const { data: suppliersData, isLoading: suppliersLoading, error: suppliersError, refetch: refetchSuppliers } = useGetSuppliersQuery({ limit: 1000 });
  const { data: companiesData, isLoading: companiesLoading } = useGetCompaniesQuery({ limit: 1000 });
  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
    limit: 10000  // زيادة الحد لجلب جميع الأصناف (754 + 1890 = 2644)
  });

  const [createPurchase, { isLoading: isCreating }] = useCreatePurchaseMutation();
  const [updatePurchase, { isLoading: isUpdating }] = useUpdatePurchaseMutation();
  const [deletePurchase, { isLoading: isDeleting }] = useDeletePurchaseMutation();
  const [createSupplier, { isLoading: isCreatingSupplier }] = useCreateSupplierMutation();
  const [approvePurchase, { isLoading: isApproving }] = useApprovePurchaseMutation();
  const [addExpensesToApprovedPurchase, { isLoading: isAddingExpenses }] = useAddExpensesToApprovedPurchaseMutation();
  const [deletePurchaseExpense] = useDeletePurchaseExpenseMutation();
  const { data: exchangeRates } = useGetExchangeRatesQuery();

  // Fetch expense categories
  const { data: expenseCategories = [], isLoading: isLoadingCategories, error: categoriesError } = useGetExpenseCategoriesQuery();

  // Debug logging للفئات (يمكن إزالته في الإنتاج)
  // console.log('🏷️ فئات المصروفات:', {
  //   categories: expenseCategories,
  //   isLoading: isLoadingCategories,
  //   error: categoriesError
  // });

  // جلب المصروفات الموجودة للفاتورة المختارة
  const { data: existingExpenses = [] } = useGetPurchaseExpensesQuery(
    selectedPurchase?.id || 0,
    { skip: !selectedPurchase?.id }
  );

  // تعيين الشركة الافتراضية عند تحميل الصفحة
  useEffect(() => {
    if (user?.companyId && !selectedCompanyId) {
      setSelectedCompanyId(user.companyId);
    }
  }, [user?.companyId]);

  // Filter products by selected company only
  // كل شركة تبحث عن أصنافها فقط
  const filteredProducts = productsData?.data?.products?.filter(product => {
    if (!selectedCompanyId) return false;
    return product.createdByCompanyId === selectedCompanyId;
  }) || [];

  // Filter products by search term (name: starts with, code: exact match =)
  const searchFilteredProducts = (() => {
    // إذا لم يكن هناك بحث، لا تعرض شيء
    if (!productNameSearch && !productCodeSearch) return [];

    const results = filteredProducts.filter((product: any) => {
      // البحث بالكود (مطابقة تامة =)
      if (productCodeSearch) {
        const match = product.sku.toLowerCase() === productCodeSearch.toLowerCase();
        return match;
      }
      // البحث بالاسم (يبدأ بـ)
      if (productNameSearch) {
        const match = product.name.toLowerCase().startsWith(productNameSearch.toLowerCase());
        return match;
      }
      return false;
    });

    // Debug
    if (productCodeSearch) {
      console.log('🔍 بحث بالكود:', productCodeSearch, '| النتائج:', results.length, '| الأكواد المتاحة:', filteredProducts.map((p: any) => p.sku).slice(0, 10));
    }
    if (productNameSearch) {
      console.log('🔍 بحث بالاسم:', productNameSearch, '| النتائج:', results.length);
    }

    return results;
  })();

  // دالة البحث بالكود
  const handleProductCodeSearch = (code: string) => {
    setProductCodeSearch(code);
    setShowProductDropdown(code.length > 0 || productNameSearch.length > 0);
  };

  // دالة البحث بالاسم
  const handleProductNameSearch = (name: string) => {
    setProductNameSearch(name);
    setShowProductDropdown(name.length > 0 || productCodeSearch.length > 0);
  };

  // دالة اختيار الصنف من القائمة المنسدلة
  const handleSelectProductFromDropdown = (product: any) => {

    // إضافة بند جديد
    const newLine = {
      productId: product.id,
      qty: 1,
      unitPrice: Number(product.latestPricing?.purchasePrice || 0)
    };

    setPurchaseForm(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));

    // إغلاق القائمة المنسدلة ومسح البحث
    setShowProductDropdown(false);
    setProductCodeSearch('');
    setProductNameSearch('');

    success('تم الإضافة', `تم إضافة ${product.name} إلى الفاتورة`);
  };

  // دالة فتح modal الاعتماد
  const handleOpenApprovalModal = (purchase: Purchase) => {
    setPurchaseToApprove(purchase);
    setShowApprovalModal(true);
  };

  // دالة إغلاق modal الاعتماد
  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setPurchaseToApprove(null);
  };

  // دالة نجاح الاعتماد
  const handleApprovalSuccess = () => {
    refetchPurchases(); // إعادة تحميل قائمة المشتريات
    handleCloseApprovalModal();
  };

  // دوال التحقق من إمكانية التعديل والحذف
  const canEditPurchase = (purchase: any) => {
    // يمكن التعديل إذا كانت الفاتورة غير معتمدة وإيصالات الدفع معلقة
    return !purchase.isApproved && (!purchase.paymentReceipts || purchase.paymentReceipts.every((receipt: any) => receipt.status === 'PENDING'));
  };

  const canDeletePurchase = (purchase: any) => {
    // يمكن الحذف إذا كانت الفاتورة غير معتمدة وإيصالات الدفع معلقة
    return !purchase.isApproved && (!purchase.paymentReceipts || purchase.paymentReceipts.every((receipt: any) => receipt.status === 'PENDING'));
  };

  // معالج تعديل الفاتورة
  const handleEditPurchase = (purchase: any) => {
    // تحديد الفاتورة المحددة للتعديل
    setSelectedPurchase(purchase);
    setIsEditMode(true);
    setEditingPurchaseId(purchase.id);
    // ملء النموذج بالبيانات الحالية
    setPurchaseForm({
      companyId: purchase.companyId,
      supplierId: purchase.supplierId,
      purchaseType: purchase.purchaseType,
      paymentMethod: purchase.paymentMethod,
      currency: purchase.currency,
      exchangeRate: purchase.exchangeRate,
      lines: purchase.lines || []
    });
    setSelectedSupplierName(purchase.supplier?.name || '');
    setShowCreatePurchaseModal(true);
  };

  // معالج إضافة مصروفات
  const handleAddExpenses = (purchase: any) => {
    setSelectedPurchase(purchase);
    setExpenseForm([]);
    setNewExpense({
      categoryId: 0,
      supplierId: undefined,
      amount: 0,
      currency: 'LYD',
      exchangeRate: 1.0,
      notes: '',
      isActualExpense: true
    });
    setShowAddExpensesModal(true);
  };

  // إضافة مصروف جديد للقائمة
  const handleAddExpenseToList = () => {
    // console.log('🔍 محاولة إضافة مصروف:', newExpense);

    if (newExpense.categoryId === 0 || newExpense.amount <= 0) {
      error('خطأ', 'يرجى اختيار فئة المصروف وإدخال مبلغ صحيح');
      return;
    }

    // المورد إجباري فقط للمصروفات الفعلية
    const isActual = newExpense.isActualExpense !== false;
    if (isActual && !newExpense.supplierId) {
      error('خطأ', 'يرجى اختيار المورد للمصروف الفعلي');
      return;
    }

    try {
      // تنظيف البيانات قبل الإضافة
      const cleanExpense = {
        categoryId: newExpense.categoryId,
        supplierId: isActual ? newExpense.supplierId : undefined, // المورد فقط للمصروفات الفعلية
        amount: newExpense.amount,
        currency: newExpense.currency || 'LYD',
        exchangeRate: newExpense.exchangeRate || 1.0,
        notes: newExpense.notes || undefined,
        isActualExpense: isActual
      };

      // console.log('✅ إضافة مصروف منظف:', cleanExpense);
      // console.log('📋 قائمة المصروفات الحالية:', expenseForm);

      setExpenseForm([...expenseForm, cleanExpense]);
      setNewExpense({
        categoryId: 0,
        supplierId: undefined,
        amount: 0,
        notes: '',
        isActualExpense: true
      });

      // console.log('🎉 تم إضافة المصروف بنجاح');
      success('تم بنجاح!', 'تم إضافة المصروف إلى القائمة');
    } catch (err) {
      error('خطأ', 'حدث خطأ في إضافة المصروف');
    }
  };

  // حذف مصروف من القائمة
  const handleRemoveExpenseFromList = (index: number) => {
    setExpenseForm(expenseForm.filter((_, i) => i !== index));
  };

  // حفظ المصروفات واعتماد الفاتورة
  const handleSaveExpenses = async () => {
    if (!selectedPurchase) return;

    // للفواتير المعتمدة: يجب إضافة مصروف واحد على الأقل
    if (selectedPurchase.isApproved && expenseForm.length === 0) {
      error('خطأ', 'يجب إضافة مصروف واحد على الأقل للفاتورة المعتمدة');
      return;
    }

    // للفواتير الجديدة: يمكن اعتماد الفاتورة بدون مصروفات
    if (!selectedPurchase.isApproved && expenseForm.length === 0) {
      const confirmed = window.confirm('لم تقم بإضافة أي مصروفات. هل تريد اعتماد الفاتورة فقط؟');
      if (!confirmed) return;
    }

    try {
      // تنظيف البيانات قبل الإرسال
      const cleanExpenses = expenseForm.map(expense => ({
        categoryId: expense.categoryId,
        supplierId: expense.isActualExpense !== false ? expense.supplierId : undefined, // المورد فقط للمصروفات الفعلية
        amount: expense.amount,
        currency: expense.currency || 'LYD',
        exchangeRate: expense.exchangeRate || 1.0,
        notes: expense.notes || undefined,
        isActualExpense: expense.isActualExpense !== false // افتراضي: فعلي
      }));

      // استخدام API مختلف حسب حالة الفاتورة
      let result;
      if (selectedPurchase.isApproved) {
        // للفواتير المعتمدة: استخدم API إضافة المصروفات
        result = await addExpensesToApprovedPurchase({
          purchaseId: selectedPurchase.id,
          expenses: cleanExpenses
        }).unwrap();
      } else {
        // للفواتير الجديدة: استخدم API الاعتماد
        result = await approvePurchase({
          purchaseId: selectedPurchase.id,
          expenses: cleanExpenses
        }).unwrap();
      }

      // رسالة نجاح مخصصة حسب حالة الفاتورة
      const successMessage = result.message || 'تم اعتماد الفاتورة وإضافة المصروفات بنجاح';
      success('تم بنجاح!', successMessage);
      setShowAddExpensesModal(false);
      setExpenseForm([]);
      setNewExpense({
        categoryId: 0,
        supplierId: undefined,
        amount: 0,
        notes: '',
        isActualExpense: true
      });
      refetchPurchases();
    } catch (err: any) {
      // تحديد رسالة الخطأ المناسبة بدون console.error
      let errorMessage = 'حدث خطأ في إضافة المصروفات';

      if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.status === 500) {
        errorMessage = 'خطأ في الخادم - يرجى المحاولة مرة أخرى';
      } else if (err?.status) {
        errorMessage = `خطأ في الاتصال (${err.status})`;
      }

      error('خطأ', errorMessage);
    }
  };

  // فلترة الموردين حسب فئة المصروف المختارة
  const getFilteredSuppliersForCategory = (categoryId: number) => {
    if (categoryId === 0) return [];

    const selectedCategory = expenseCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory || !selectedCategory.suppliers) return [];

    return selectedCategory.suppliers.map(categorySupplier => categorySupplier.supplier);
  };

  // حذف مصروف
  const handleDeleteExpense = async (expenseId: number) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم حذف إيصال الدفع المرتبط به إن وجد.');
    if (!confirmed) return;

    try {
      const result = await deletePurchaseExpense(expenseId).unwrap();
      success('تم الحذف', result.message || 'تم حذف المصروف بنجاح');

      // تحديث الفاتورة المعروضة فوراً
      if (selectedPurchase) {
        // تحديث المصروفات في الفاتورة المعروضة
        const updatedExpenses = (selectedPurchase as any).expenses?.filter(
          (exp: any) => exp.id !== expenseId
        ) || [];

        setSelectedPurchase({
          ...selectedPurchase,
          expenses: updatedExpenses,
        } as any);
      }

      // تحديث قائمة الفواتير
      refetchPurchases();
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'حدث خطأ أثناء حذف المصروف';
      error('خطأ', errorMessage);
    }
  };

  // معالج فتح مودال إنشاء فاتورة جديدة
  const handleOpenNewPurchaseModal = () => {
    // إعادة تعيين وضع الإنشاء
    setIsEditMode(false);
    setEditingPurchaseId(null);
    setSelectedPurchase(null);
    // إعادة تعيين النموذج
    setPurchaseForm({
      companyId: selectedCompanyId || 0,
      supplierId: undefined,
      purchaseType: 'CASH',
      paymentMethod: 'CASH',
      currency: 'LYD',
      exchangeRate: 1.0,
      lines: []
    });
    setSelectedSupplierName('');
    setShowCreatePurchaseModal(true);
  };

  // معالج إغلاق مودال إنشاء/تعديل الفاتورة
  const handleClosePurchaseModal = () => {
    setShowCreatePurchaseModal(false);
    // إعادة تعيين الحالة
    setIsEditMode(false);
    setEditingPurchaseId(null);
    setSelectedPurchase(null);
    setSelectedSupplierName('');
  };

  // معالج حذف الفاتورة مع التحقق
  const handleDeletePurchaseWithValidation = async (purchase: any) => {
    if (!canDeletePurchase(purchase)) {
      error('خطأ', 'لا يمكن حذف هذه الفاتورة. تأكد من أن إيصالات الدفع معلقة.');
      return;
    }

    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم حذف جميع إيصالات الدفع المرتبطة وتحديث حسابات الموردين.'
    );

    if (confirmed) {
      try {
        await deletePurchase(purchase.id).unwrap();
        success('نجح', 'تم حذف الفاتورة وإيصالات الدفع المرتبطة بها بنجاح');
        refetchPurchases();
      } catch (err) {
        error('خطأ', 'فشل في حذف الفاتورة');
      }
    }
  };

  // دالة طباعة الفاتورة
  const handlePrintInvoice = (purchase: Purchase) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      error('خطأ', 'لا يمكن فتح نافذة الطباعة. تأكد من السماح للنوافذ المنبثقة.');
      return;
    }

    const company = companiesData?.data?.companies?.find((c: any) => c.id === purchase.companyId);
    const supplier = suppliersData?.data?.suppliers?.find((s: any) => s.id === purchase.supplierId);

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة مشتريات - ${purchase.invoiceNumber || purchase.id}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 15px;
            background: white;
            color: #000;
            direction: rtl;
            font-size: 13px;
            line-height: 1.4;
          }
          .invoice-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 22px;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
          }
          .invoice-title {
            font-size: 18px;
            color: #000;
            margin: 8px 0;
            font-weight: bold;
          }
          .invoice-number {
            font-size: 14px;
            color: #000;
            margin-top: 5px;
          }
          .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-section {
            border: 2px solid #000;
            padding: 12px;
          }
          .info-title {
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            font-size: 14px;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          .info-item {
            margin: 5px 0;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
          }
          .info-label {
            font-weight: bold;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin: 20px 0 10px 0;
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border: 2px solid #000;
          }
          .items-table th {
            background: #f0f0f0;
            color: #000;
            padding: 10px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            border: 1px solid #000;
          }
          .items-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #000;
            font-size: 11px;
          }
          .items-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          .total-section {
            margin-top: 20px;
            border: 2px solid #000;
            padding: 15px;
          }
          .total-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 12px;
            padding: 3px 0;
          }
          .total-final {
            font-weight: bold;
            font-size: 14px;
            color: #000;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 10px;
            border-top: 1px solid #000;
            padding-top: 15px;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 10mm; 
              font-size: 12px;
            }
            @page { 
              size: A4; 
              margin: 15mm; 
            }
            .invoice-header { 
              page-break-inside: avoid;
            }
            .items-table th {
              font-size: 11px;
            }
            .items-table td {
              font-size: 10px;
            }
            .total-row {
              font-size: 11px;
            }
            .total-final {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-name">${company?.name || 'اسم الشركة'}</div>
          <div class="invoice-title">فاتورة مشتريات</div>
          <div class="invoice-number">رقم الفاتورة: ${purchase.invoiceNumber || purchase.id}</div>
        </div>

        <div class="invoice-info">
          <div class="info-section">
            <div class="info-title">معلومات المورد</div>
            <div class="info-item">
              <span class="info-label">الاسم:</span>
              <span>${supplier?.name || 'غير محدد'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الهاتف:</span>
              <span>${supplier?.phone || 'غير محدد'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">العنوان:</span>
              <span>${supplier?.address || 'غير محدد'}</span>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-title">معلومات الفاتورة</div>
            <div class="info-item">
              <span class="info-label">التاريخ:</span>
              <span>${new Date(purchase.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">الحالة:</span>
              <span>${(purchase as any).isApproved ? 'معتمدة' : 'غير معتمدة'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">العملة:</span>
              <span>${purchase.currency}</span>
            </div>
            ${purchase.currency !== 'LYD' ? `
            <div className="info-item">
              <span className="info-label">سعر الصرف:</span>
              <span>1 ${purchase.currency} = ${Number(purchase.exchangeRate).toFixed(4)} د.ل</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- جدول الأصناف -->
        <div class="section-title">الأصناف</div>
        <table class="items-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${purchase.lines?.map((line: any) => `
                <tr>
                  <td>${line.product?.name || 'صنف محذوف'}</td>
                  <td>${line.qty}</td>
                  <td>${Number(line.unitPrice).toFixed(2)} ${purchase.currency}</td>
                  <td>${(Number(line.qty) * Number(line.unitPrice)).toFixed(2)} ${purchase.currency}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">لا توجد أصناف</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- جدول المصروفات -->
        ${(purchase as any).expenses?.length > 0 ? `
        <div class="section-title">المصروفات</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>بند المصروف</th>
              <th>الشخص المتبع</th>
              <th>المبلغ بالعملة الأجنبية</th>
              <th>سعر الصرف</th>
              <th>المبلغ بالدينار</th>
            </tr>
          </thead>
          <tbody>
            ${(purchase as any).expenses?.map((expense: any) => `
              <tr>
                <td>
                  <div>${expense.category?.name || 'غير محدد'}</div>
                  ${expense.notes ? `<div style="font-size: 10px; color: #666;">${expense.notes}</div>` : ''}
                </td>
                <td>${expense.supplier?.name || 'غير محدد'}</td>
                <td>${expense.currency !== 'LYD' && expense.amountForeign ? `${Number(expense.amountForeign).toFixed(2)} ${expense.currency}` : '-'}</td>
                <td>${expense.currency !== 'LYD' ? Number(expense.exchangeRate).toFixed(2) : '-'}</td>
                <td style="font-weight: bold;">${Number(expense.amount).toFixed(2)} د.ل</td>
              </tr>
            `).join('') || '<tr><td colspan="5">لا توجد مصروفات</td></tr>'}
          </tbody>
        </table>
        ` : ''}

        <div class="total-section">
          <div class="total-title">ملخص الفاتورة</div>
          <div className="total-row">
            <span>مجموع الأصناف:</span>
            <span>
              ${purchase.currency === 'LYD'
        ? Number(purchase.total).toFixed(2)
        : Number(purchase.totalForeign || (Number(purchase.total) / Number(purchase.exchangeRate))).toFixed(2)
      } ${purchase.currency}
            </span>
          </div>
          ${purchase.currency !== 'LYD' ? `
          <div className="total-row">
            <span>ما يعادل بالدينار:</span>
            <span>${Number(purchase.total).toFixed(2)} د.ل</span>
          </div>
          ` : ''}
          <div className="total-row">
            <span>إجمالي المصروفات:</span>
            <span>${Number((purchase as any).totalExpenses || 0).toFixed(2)} د.ل</span>
          </div>
          <div className="total-row total-final">
            <span>الإجمالي النهائي (LYD):</span>
            <span>${Number((purchase as any).finalTotal || (Number(purchase.total) + Number((purchase as any).totalExpenses || 0))).toFixed(2)} د.ل</span>
          </div>
        </div>

        <div class="footer">
          <p>تم إنشاء هذه الفاتورة بواسطة نظام CeramiSys</p>
          <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // انتظار تحميل المحتوى ثم الطباعة
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    success('نجح', 'تم فتح نافذة الطباعة');
  };

  if (purchasesLoading) {
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
            <div className="w-8 h-8 text-blue-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة المشتريات</h1>
              <p className="text-gray-600">إدارة فواتير المشتريات والموردين</p>
            </div>
          </div>
          <button
            onClick={handleOpenNewPurchaseModal}
            disabled={!selectedCompanyId}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة مشتريات جديدة
          </button>
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200 relative z-40">
        <label className="block text-sm font-bold text-blue-900 mb-2">
          🏢 اختر الشركة للعمل عليها *
        </label>
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => {
            const newCompanyId = e.target.value ? Number(e.target.value) : null;
            setSelectedCompanyId(newCompanyId);
            setPurchaseForm({
              companyId: newCompanyId || 0,
              supplierId: undefined,
              purchaseType: 'CASH',
              paymentMethod: 'CASH',
              lines: []
            });
          }}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium relative z-50"
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col gap-4">
          {/* عنوان الفلاتر وزر المسح */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              فلترة المشتريات
            </h3>

            {/* زر مسح الفلاتر */}
            {(filterSupplierName || filterSupplierPhone || filterInvoiceNumber || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => {
                  setFilterSupplierName('');
                  setFilterSupplierPhone('');
                  setFilterInvoiceNumber('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                مسح جميع الفلاتر
              </button>
            )}
          </div>

          {/* حقول الفلترة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* اسم المورد */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم المورد
              </label>
              <input
                type="text"
                placeholder="ابحث باسم المورد..."
                value={filterSupplierName}
                onChange={(e) => {
                  setFilterSupplierName(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* رقم هاتف المورد */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم هاتف المورد
              </label>
              <input
                type="text"
                placeholder="ابحث برقم الهاتف..."
                value={filterSupplierPhone}
                onChange={(e) => {
                  setFilterSupplierPhone(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* رقم الفاتورة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الفاتورة
              </label>
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة..."
                value={filterInvoiceNumber}
                onChange={(e) => {
                  setFilterInvoiceNumber(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* تاريخ من */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* تاريخ إلى */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* معلومات الفلاتر النشطة */}
          {(filterSupplierName || filterSupplierPhone || filterInvoiceNumber || filterDateFrom || filterDateTo) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">الفلاتر النشطة:</p>
              <div className="flex flex-wrap gap-2">
                {filterSupplierName && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    المورد: {filterSupplierName}
                    <button onClick={() => setFilterSupplierName('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {filterSupplierPhone && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    الهاتف: {filterSupplierPhone}
                    <button onClick={() => setFilterSupplierPhone('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {filterInvoiceNumber && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    الفاتورة: {filterInvoiceNumber}
                    <button onClick={() => setFilterInvoiceNumber('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {filterDateFrom && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    من: {filterDateFrom}
                    <button onClick={() => setFilterDateFrom('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {filterDateTo && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    إلى: {filterDateTo}
                    <button onClick={() => setFilterDateTo('')} className="hover:text-blue-900">×</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchases Table */}
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
                  المورد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجمالي مع المصروفات
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
              {purchasesLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span>جاري تحميل المشتريات...</span>
                    </div>
                  </td>
                </tr>
              ) : purchasesData?.purchases?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    لا توجد فواتير مشتريات مطابقة للبحث
                  </td>
                </tr>
              ) : (
                purchasesData?.purchases?.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.invoiceNumber || `#${purchase.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-blue-600">{purchase.company?.name}</span>
                        <span className="text-xs text-gray-500">{purchase.company?.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.supplier?.name || 'غير محدد'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-green-600">
                          {purchase.currency === 'LYD'
                            ? formatArabicCurrency(purchase.total)
                            : `${Number(purchase.totalForeign || 0).toFixed(2)} ${purchase.currency}`
                          }
                        </span>
                        {purchase.currency !== 'LYD' && (
                          <span className="text-xs text-blue-600">
                            = {formatArabicCurrency(purchase.total)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-blue-600">
                          {formatArabicCurrency(purchase.finalTotal || (Number(purchase.total) + Number(purchase.totalExpenses || 0)))}
                        </span>
                        {Number(purchase.totalExpenses) > 0 && (
                          <span className="text-xs text-orange-500">
                            +{formatArabicCurrency(purchase.totalExpenses)} مصروفات
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(purchase.createdAt).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {/* زر الاعتماد - يظهر فقط للفواتير غير المعتمدة */}
                        {!(purchase as any).isApproved && (
                          <button
                            onClick={() => handleOpenApprovalModal(purchase)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="اعتماد الفاتورة"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {/* زر عرض التفاصيل */}
                        <button
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setShowPurchaseDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="عرض التفاصيل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* زر طباعة الفاتورة */}
                        <button
                          onClick={() => handlePrintInvoice(purchase)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="طباعة الفاتورة"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>

                        {/* زر تعديل الفاتورة - يظهر فقط إذا كانت إيصالات الدفع معلقة */}
                        {canEditPurchase(purchase) && (
                          <button
                            onClick={() => handleEditPurchase(purchase)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded"
                            title="تعديل الفاتورة"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {/* زر إضافة مصروفات */}
                        <button
                          onClick={() => handleAddExpenses(purchase)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="إضافة مصروفات"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>

                        {/* زر الحذف المحسن - يظهر فقط إذا كانت إيصالات الدفع معلقة */}
                        {canDeletePurchase(purchase) && (
                          <button
                            onClick={() => handleDeletePurchaseWithValidation(purchase)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="حذف الفاتورة"
                            disabled={isDeleting}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}

                        {/* إشارة الاعتماد */}
                        {(purchase as any).isApproved && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ معتمد
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {purchasesData?.pagination && (
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
                disabled={currentPage >= purchasesData.pagination.pages}
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
                    {Math.min(currentPage * 10, purchasesData.pagination.total)}
                  </span>{' '}
                  من{' '}
                  <span className="font-medium">{purchasesData.pagination.total}</span>{' '}
                  نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: purchasesData.pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i + 1
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

      {/* Create Purchase Modal */}
      {showCreatePurchaseModal && selectedCompanyId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white min-h-[90vh]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'تعديل فاتورة المشتريات' : 'فاتورة مشتريات جديدة'}
                </h2>
                <button
                  onClick={handleClosePurchaseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      الشركة المختارة: {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      💡 سيتم الشراء لمخزون هذه الشركة فقط
                    </p>
                  </div>
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

                <form onSubmit={async (e) => {
                  e.preventDefault();

                  if (!selectedCompanyId) {
                    error('خطأ', 'يجب اختيار الشركة أولاً');
                    return;
                  }

                  if (!purchaseForm.supplierId) {
                    error('خطأ', 'يجب اختيار مورد للمتابعة');
                    return;
                  }

                  if (purchaseForm.lines.length === 0) {
                    error('خطأ', 'يجب إضافة بند واحد على الأقل');
                    return;
                  }

                  try {
                    if (isEditMode && editingPurchaseId) {
                      // تعديل فاتورة موجودة
                      await updatePurchase({
                        id: editingPurchaseId,
                        data: {
                          supplierId: purchaseForm.supplierId,
                          purchaseType: purchaseForm.purchaseType,
                          paymentMethod: purchaseForm.paymentMethod,
                          currency: purchaseForm.currency,
                          exchangeRate: purchaseForm.exchangeRate,
                          lines: purchaseForm.lines.map(line => ({
                            ...(line.id && { id: line.id }),
                            productId: line.productId,
                            qty: line.qty,
                            unitPrice: line.unitPrice
                          }))
                        }
                      }).unwrap();

                      success('تم بنجاح!', 'تم تحديث فاتورة المشتريات بنجاح');
                    } else {
                      // إنشاء فاتورة جديدة
                      await createPurchase({
                        ...purchaseForm,
                        companyId: selectedCompanyId
                      }).unwrap();

                      success('تم بنجاح!', 'تم إنشاء فاتورة المشتريات بنجاح');
                    }

                    // Reset form and close modal
                    handleClosePurchaseModal();
                    refetchPurchases();

                  } catch (err: any) {
                    console.error('خطأ في حفظ فاتورة المشتريات:', err);
                    const errorMessage = isEditMode ? 'حدث خطأ في تحديث فاتورة المشتريات' : 'حدث خطأ في إنشاء فاتورة المشتريات';
                    error('خطأ', errorMessage);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="relative" ref={supplierSearchRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المورد *
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={selectedSupplierName || supplierSearchTerm}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSupplierSearchTerm(value);
                              setSelectedSupplierName('');
                              setPurchaseForm(prev => ({ ...prev, supplierId: undefined }));
                              setShowSupplierSuggestions(true);
                            }}
                            onFocus={() => setShowSupplierSuggestions(true)}
                            placeholder="ابحث عن المورد بالاسم أو الهاتف..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required={!purchaseForm.supplierId}
                          />
                          {suppliersLoading && (
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}

                          {/* Supplier Suggestions Dropdown */}
                          {showSupplierSuggestions && !suppliersLoading && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {suppliersData?.data?.suppliers
                                ?.filter((supplier) =>
                                  supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                  supplier.phone?.includes(supplierSearchTerm)
                                )
                                ?.map((supplier) => (
                                  <div
                                    key={supplier.id}
                                    onClick={() => {
                                      setPurchaseForm(prev => ({ ...prev, supplierId: supplier.id }));
                                      setSelectedSupplierName(supplier.name);
                                      setSupplierSearchTerm('');
                                      setShowSupplierSuggestions(false);
                                    }}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{supplier.name}</div>
                                    {supplier.phone && (
                                      <div className="text-xs text-gray-500">📱 {supplier.phone}</div>
                                    )}
                                    {supplier.address && (
                                      <div className="text-xs text-gray-400">📍 {supplier.address}</div>
                                    )}
                                  </div>
                                ))}
                              {suppliersData?.data?.suppliers
                                ?.filter((supplier) =>
                                  supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                  supplier.phone?.includes(supplierSearchTerm)
                                )?.length === 0 && (
                                  <div className="px-3 py-2 text-gray-500 text-sm">
                                    لا توجد نتائج
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCreateSupplierModal(true)}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-1 whitespace-nowrap"
                          title="إضافة مورد جديد"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="hidden sm:inline">مورد</span>
                        </button>
                      </div>
                      {purchaseForm.supplierId && selectedSupplierName && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          ✓ تم اختيار: {selectedSupplierName}
                        </p>
                      )}
                      {!purchaseForm.supplierId && (
                        <p className="text-xs text-gray-500 mt-1">
                          مطلوب - ابحث واختر مورد للمتابعة
                        </p>
                      )}
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

                    {/* Currency and Exchange Rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          العملة *
                        </label>
                        <select
                          value={purchaseForm.currency}
                          onChange={(e) => {
                            const curr = e.target.value as 'LYD' | 'USD' | 'EUR';
                            let rate = 1.0;
                            if (curr === 'USD') rate = exchangeRates?.USD_EXCHANGE_RATE || 4.80;
                            if (curr === 'EUR') rate = exchangeRates?.EUR_EXCHANGE_RATE || 5.20;

                            setPurchaseForm(prev => ({
                              ...prev,
                              currency: curr,
                              exchangeRate: curr === 'LYD' ? 1.0 : rate
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="LYD">دينار ليبي (LYD)</option>
                          <option value="USD">دولار أمريكي (USD)</option>
                          <option value="EUR">يورو (EUR)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          سعر الصرف *
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={purchaseForm.exchangeRate ?? 1}
                          onChange={(e) => setPurchaseForm(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) }))}
                          disabled={purchaseForm.currency === 'LYD'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Purchase Lines */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-base font-bold text-gray-800">
                        📋 بنود الفاتورة *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPurchaseForm(prev => ({
                            ...prev,
                            lines: [...prev.lines, {
                              productId: 0,
                              qty: 1,
                              unitPrice: 0
                            }]
                          }))}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-lg"
                        >
                          <span className="text-lg">➕</span>
                          <span>إضافة بند</span>
                        </button>
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
                            أصناف {companiesData?.data?.companies?.find(c => c.id === selectedCompanyId)?.name} ({filteredProducts.length} صنف)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative product-dropdown-container">
                        {/* البحث بالكود */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            🔢 البحث بالكود
                          </label>
                          <input
                            type="text"
                            value={productCodeSearch}
                            onChange={(e) => handleProductCodeSearch(e.target.value)}
                            onFocus={() => setShowProductDropdown(productCodeSearch.length > 0 || productNameSearch.length > 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (searchFilteredProducts.length > 0) {
                                  handleSelectProductFromDropdown(searchFilteredProducts[0]);
                                }
                              }
                            }}
                            placeholder="ابحث بالكود..."
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                          />
                        </div>
                        {/* البحث بالاسم */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            🔍 البحث بالاسم
                          </label>
                          <input
                            type="text"
                            value={productNameSearch}
                            onChange={(e) => handleProductNameSearch(e.target.value)}
                            onFocus={() => setShowProductDropdown(productNameSearch.length > 0 || productCodeSearch.length > 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (searchFilteredProducts.length > 0) {
                                  handleSelectProductFromDropdown(searchFilteredProducts[0]);
                                }
                              }
                            }}
                            placeholder="ابحث بجزء من الاسم..."
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>

                        {/* القائمة المنسدلة للأصناف - تظهر تحت كلا الخانتين */}
                        {showProductDropdown && (productNameSearch || productCodeSearch) && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {searchFilteredProducts.length > 0 ? (
                              searchFilteredProducts.slice(0, 10).map((product: any) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectProductFromDropdown(product)}
                                  className="w-full px-3 py-2 text-right focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50"
                                >
                                  <div className="flex justify-between items-center gap-3">
                                    <div className="text-sm flex-1">
                                      <div className="font-medium text-gray-900">
                                        {product.name}
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>كود: {product.sku}</span>
                                        {/* عرض الكمية في المخزون */}
                                        {product.stock && product.stock.length > 0 && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                                            📦 {(() => {
                                              const stock = product.stock.find((s: any) => s.companyId === selectedCompanyId);
                                              return stock?.boxes || 0;
                                            })()} {product.unit || 'وحدة'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs font-medium whitespace-nowrap text-blue-600">
                                      {product.latestPricing?.purchasePrice
                                        ? formatArabicCurrency(Number(product.latestPricing.purchasePrice))
                                        : 'غير محدد'}
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                لا توجد أصناف مطابقة
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {(productCodeSearch || productNameSearch) && (
                        <div className="mt-3 flex justify-between items-center p-2 bg-white rounded-md border border-blue-200">
                          <div className="text-xs font-medium text-gray-600">
                            📊 عرض {searchFilteredProducts.length} منتج من أصل {filteredProducts.length}
                            {productCodeSearch && <span className="text-blue-600 mr-2">| كود: {productCodeSearch}</span>}
                            {productNameSearch && <span className="text-green-600 mr-2">| اسم: {productNameSearch}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProductCodeSearch('');
                              setProductNameSearch('');
                              setShowProductDropdown(false);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                          >
                            ✖️ مسح البحث
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {purchaseForm.lines.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-6xl mb-3">📝</div>
                          <p className="text-gray-600 font-medium mb-2">لا توجد بنود في الفاتورة</p>
                          <p className="text-sm text-gray-500">اضغط على "إضافة بند" لبدء إنشاء الفاتورة</p>
                        </div>
                      ) : (
                        purchaseForm.lines.map((line, index) => (
                          <PurchaseLineItem
                            key={index}
                            line={line}
                            index={index}
                            products={filteredProducts}
                            currency={purchaseForm.currency}
                            onUpdate={(idx, field, value) => {
                              setPurchaseForm(prev => ({
                                ...prev,
                                lines: prev.lines.map((l, i) =>
                                  i === idx ? { ...l, [field]: value } : l
                                )
                              }));
                            }}
                            onRemove={(idx) => {
                              setPurchaseForm(prev => ({
                                ...prev,
                                lines: prev.lines.filter((_, i) => i !== idx)
                              }));
                            }}
                          />
                        ))
                      )}
                    </div>

                    {purchaseForm.lines.length > 0 && (
                      <>
                        {/* المجموع الإجمالي */}
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-700">المجموع الإجمالي ({purchaseForm.currency}):</span>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-green-600">
                                {Number(purchaseForm.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0)).toFixed(2)} {purchaseForm.currency}
                              </span>
                              {purchaseForm.currency !== 'LYD' && (
                                <div className="text-sm font-medium text-blue-600 mt-1">
                                  ما يعادل: {formatArabicCurrency(purchaseForm.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0) * (purchaseForm.exchangeRate || 1))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 pt-8 border-t-2 border-gray-200 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreatePurchaseModal(false);
                        setProductCodeSearch('');
                      }}
                      className="flex items-center gap-2 px-8 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium text-base"
                    >
                      <span>❌</span>
                      <span>إلغاء</span>
                    </button>
                    <button
                      type="submit"
                      disabled={(isCreating || isUpdating) || !purchaseForm.supplierId}
                      className={`flex items-center gap-2 px-8 py-3 rounded-lg shadow-md transition-all duration-200 font-medium text-base ${!purchaseForm.supplierId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg'
                        } ${(isCreating || isUpdating) ? 'opacity-50' : ''}`}
                    >
                      <span>{(isCreating || isUpdating) ? '⏳' : '💾'}</span>
                      <span>
                        {!purchaseForm.supplierId
                          ? 'اختر المورد أولاً'
                          : (isCreating || isUpdating)
                            ? (isEditMode ? 'جاري التحديث...' : 'جاري الحفظ...')
                            : (isEditMode ? 'تحديث الفاتورة' : 'حفظ الفاتورة')}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Purchase Details Modal */}
      {showPurchaseDetailsModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">تفاصيل فاتورة المشتريات</h2>
                <button
                  onClick={() => setShowPurchaseDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الفاتورة</label>
                    <p className="text-lg font-semibold">{selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المورد</label>
                    <p className="text-lg font-semibold">{selectedPurchase.supplier?.name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">مجموع الأصناف</label>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedPurchase.currency === 'LYD'
                        ? formatArabicCurrency(selectedPurchase.total)
                        : `${Number(selectedPurchase.totalForeign || (Number(selectedPurchase.total) / Number(selectedPurchase.exchangeRate))).toFixed(2)} ${selectedPurchase.currency}`
                      }
                      {selectedPurchase.currency !== 'LYD' && (
                        <span className="text-xs text-blue-600 block">
                          ما يعادل: {formatArabicCurrency(selectedPurchase.total)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">إجمالي المصروفات</label>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatArabicCurrency(selectedPurchase.totalExpenses)}
                    </p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700">الإجمالي النهائي</label>
                    <p className="text-2xl font-bold text-indigo-700">
                      {formatArabicCurrency(selectedPurchase.finalTotal || (Number(selectedPurchase.total) + Number(selectedPurchase.totalExpenses || 0)))}
                    </p>
                  </div>
                </div>

                {selectedPurchase.lines && selectedPurchase.lines.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">بنود الفاتورة</h3>
                    <div className="space-y-2">
                      {selectedPurchase.lines.map((line, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{line.product?.name || 'غير محدد'}</div>
                              <div className="text-gray-500 text-xs">{line.product?.sku || ''}</div>
                            </div>
                            <div className="text-left">
                              <div>{line.qty} {line.product?.unit || 'وحدة'}</div>
                              <div className="text-sm text-gray-600">
                                {Number(line.unitPrice).toFixed(2)} {selectedPurchase.currency} × {line.qty} = {(line.qty * line.unitPrice).toFixed(2)} {selectedPurchase.currency}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* قسم المصروفات */}
                {(selectedPurchase as any).expenses && (selectedPurchase as any).expenses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">مصروفات الفاتورة</h3>
                    <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-orange-100 border-b border-orange-200">
                          <tr>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">نوع المصروف</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">المورد</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">المبلغ بالعملة الأجنبية</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">سعر الصرف</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">المبلغ بالدينار</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-orange-700">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-100">
                          {(selectedPurchase as any).expenses.map((expense: any, index: number) => (
                            <tr key={index} className="hover:bg-orange-50/50">
                              <td className="px-3 py-2 text-gray-800">
                                <div className="font-medium text-orange-800">{expense.category?.name || 'مصروف عام'}</div>
                                {expense.notes && (
                                  <div className="text-orange-600 text-xs">{expense.notes}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600 text-xs">
                                {expense.supplier?.name || 'غير محدد'}
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {expense.currency !== 'LYD' && expense.amountForeign ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                    {Number(expense.amountForeign).toFixed(2)} {expense.currency}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {expense.currency !== 'LYD' ? (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                                    {Number(expense.exchangeRate).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-bold font-mono">
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                  {Number(expense.amount).toFixed(2)} د.ل
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-100 p-1.5 rounded transition-colors"
                                  title="حذف المصروف"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowPurchaseDetailsModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Unified Supplier Modal */}
      <UnifiedSupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={() => {
          // Refresh suppliers list automatically via RTK Query
        }}
        mode="create"
      />

      {/* Create Supplier Modal */}
      {
        showCreateSupplierModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">إضافة مورد جديد</h3>
                  <button
                    onClick={() => {
                      setShowCreateSupplierModal(false);
                      setNewSupplierForm({ name: '', phone: '', address: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();

                  if (!newSupplierForm.name.trim()) {
                    error('يجب إدخال اسم المورد');
                    return;
                  }

                  try {
                    const result = await createSupplier({
                      name: newSupplierForm.name.trim(),
                      phone: newSupplierForm.phone.trim() || undefined,
                      address: newSupplierForm.address.trim() || undefined
                    }).unwrap();

                    console.log('المورد الجديد:', result);

                    // الحصول على بيانات المورد من result.data
                    const supplier = (result as any).data;

                    // إغلاق modal الإضافة أولاً
                    setShowCreateSupplierModal(false);
                    setNewSupplierForm({ name: '', phone: '', address: '' });

                    // تحديث قائمة الموردين
                    await refetchSuppliers();

                    // انتظار قصير جداً للتأكد من تحديث الواجهة
                    setTimeout(() => {
                      // تعيين المورد الجديد في النموذج تلقائياً
                      setPurchaseForm(prev => ({
                        ...prev,
                        supplierId: supplier.id
                      }));
                      setSelectedSupplierName(supplier.name);
                      setSupplierSearchTerm('');

                      success('تم إضافة المورد بنجاح: ' + supplier.name);
                    }, 200);
                  } catch (err: any) {
                    console.error('خطأ في إضافة المورد:', err);
                    error(err?.data?.message || 'حدث خطأ أثناء إضافة المورد');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم المورد *
                    </label>
                    <input
                      type="text"
                      value={newSupplierForm.name}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="أدخل اسم المورد"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={newSupplierForm.phone}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="أدخل رقم الهاتف (اختياري)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      العنوان
                    </label>
                    <textarea
                      value={newSupplierForm.address}
                      onChange={(e) => setNewSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="أدخل العنوان (اختياري)"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSupplierModal(false);
                        setNewSupplierForm({ name: '', phone: '', address: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingSupplier}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isCreatingSupplier ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          حفظ المورد
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* مودال إضافة مصروفات */}
      {
        showAddExpensesModal && selectedPurchase && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">اعتماد الفاتورة وإضافة المصروفات</h3>
                  <button
                    onClick={() => setShowAddExpensesModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* معلومات الفاتورة */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">معلومات الفاتورة</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">رقم الفاتورة: </span>
                      <span className="font-medium">{selectedPurchase.invoiceNumber || selectedPurchase.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">المورد: </span>
                      <span className="font-medium">{(selectedPurchase as any).supplier?.name || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">إجمالي الفاتورة: </span>
                      <span className="font-medium text-green-600">{formatArabicCurrency(Number(selectedPurchase.total))}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">الحالة: </span>
                      <span className={`font-medium ${selectedPurchase.isApproved ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectedPurchase.isApproved ? 'معتمدة' : 'غير معتمدة'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* المصروفات الموجودة */}
                {existingExpenses.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-yellow-900 mb-4">المصروفات المضافة مسبقاً</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-yellow-200">
                        <thead className="bg-yellow-100">
                          <tr>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              نوع المصروف
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              فئة المصروف
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              المورد
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              المبلغ بالعملة الأجنبية
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              سعر الصرف
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              المبلغ بالدينار
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">
                              ملاحظات
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-yellow-50 divide-y divide-yellow-200">
                          {existingExpenses.map((expense) => (
                            <tr key={expense.id} className={(expense as any).isActualExpense === false ? 'bg-orange-100' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {(expense as any).isActualExpense !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    فعلي (دين)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-700">
                                    تقديري
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-900">
                                {expense.category?.name || 'غير محدد'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-900">
                                {(expense as any).isActualExpense !== false
                                  ? (expense.supplier?.name || 'غير محدد')
                                  : <span className="text-gray-400 italic">-</span>
                                }
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                {expense.currency !== 'LYD' && expense.amountForeign ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                    {Number(expense.amountForeign).toFixed(2)} {expense.currency}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                {expense.currency !== 'LYD' ? (
                                  <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded text-xs">
                                    {Number(expense.exchangeRate).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-bold font-mono">
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                  {Number(expense.amount).toFixed(2)} د.ل
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-yellow-600">
                                {expense.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 bg-yellow-100 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-yellow-800">إجمالي المصروفات الموجودة:</span>
                        <span className="text-lg font-bold text-yellow-700">
                          {formatArabicCurrency(existingExpenses.reduce((sum, exp) => sum + (Number(exp.amount) * Number(exp.exchangeRate)), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* نموذج إضافة مصروف جديد */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">إضافة مصروف جديد</h4>
                  
                  {/* نوع المصروف - بارز في الأعلى */}
                  <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">نوع المصروف *</label>
                    <div className="flex gap-4">
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        newExpense.isActualExpense !== false 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="expenseType"
                          checked={newExpense.isActualExpense !== false}
                          onChange={() => setNewExpense({ ...newExpense, isActualExpense: true })}
                          className="sr-only"
                        />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <span className="font-medium">مصروف فعلي (دين)</span>
                          <p className="text-xs opacity-75">يسجل كدين على المورد</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        newExpense.isActualExpense === false 
                          ? 'border-orange-500 bg-orange-50 text-orange-700' 
                          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                      }`}>
                        <input
                          type="radio"
                          name="expenseType"
                          checked={newExpense.isActualExpense === false}
                          onChange={() => setNewExpense({ ...newExpense, isActualExpense: false, supplierId: undefined })}
                          className="sr-only"
                        />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="font-medium">مصروف تقديري</span>
                          <p className="text-xs opacity-75">لتوزيع التكلفة فقط</p>
                        </div>
                      </label>
                    </div>
                    {newExpense.isActualExpense === false && (
                      <p className="mt-2 text-xs text-orange-600 bg-orange-100 p-2 rounded">
                        💡 المصروف التقديري يزيد تكلفة المنتجات لكن لا يُنشئ دين على أي مورد (مثل: مصاريف شحن تقديرية، هامش أمان)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">فئة المصروف *</label>
                      <ExpenseCategorySelector
                        categories={expenseCategories}
                        selectedCategoryId={newExpense.categoryId}
                        onCategorySelect={(categoryId) => {
                          setNewExpense({
                            ...newExpense,
                            categoryId,
                            supplierId: undefined // إعادة تعيين المورد عند تغيير الفئة
                          });
                        }}
                        placeholder="اختر فئة المصروف"
                        required={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المورد {newExpense.isActualExpense !== false && <span className="text-red-500">*</span>}
                      </label>
                      <SupplierSelector
                        suppliers={getFilteredSuppliersForCategory(newExpense.categoryId)}
                        selectedSupplierId={newExpense.supplierId}
                        onSupplierSelect={(supplierId) => setNewExpense({ ...newExpense, supplierId })}
                        placeholder={
                          newExpense.isActualExpense === false
                            ? 'غير مطلوب (مصروف تقديري)'
                            : newExpense.categoryId === 0
                              ? 'اختر فئة المصروف أولاً'
                              : 'اختر المورد (مطلوب)'
                        }
                        className={newExpense.isActualExpense === false || newExpense.categoryId === 0 ? 'opacity-50 pointer-events-none' : ''}
                        required={newExpense.isActualExpense !== false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={newExpense.amount ?? 0}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        <select
                          value={newExpense.currency}
                          onChange={(e) => {
                            const curr = e.target.value as 'LYD' | 'USD' | 'EUR';
                            let rate = 1.0;
                            if (curr === 'USD') rate = exchangeRates?.USD_EXCHANGE_RATE || 4.80;
                            if (curr === 'EUR') rate = exchangeRates?.EUR_EXCHANGE_RATE || 5.20;
                            setNewExpense({
                              ...newExpense,
                              currency: curr,
                              exchangeRate: curr === 'LYD' ? 1.0 : rate
                            });
                          }}
                          className="px-2 py-2 border border-gray-300 rounded-md bg-gray-50 text-xs"
                        >
                          <option value="LYD">LYD</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>
                    {newExpense.currency !== 'LYD' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">سعر الصرف *</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={newExpense.exchangeRate ?? 1}
                          onChange={(e) => setNewExpense({ ...newExpense, exchangeRate: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-blue-600 mt-1">= {(newExpense.amount * (newExpense.exchangeRate || 1)).toFixed(2)} د.ل</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                      <input
                        type="text"
                        value={newExpense.notes || ''}
                        onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ملاحظات اختيارية"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleAddExpenseToList}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      إضافة للقائمة
                    </button>
                  </div>
                </div>

                {/* قائمة المصروفات المضافة */}
                {expenseForm.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-4">المصروفات المضافة</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              نوع المصروف
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              فئة المصروف
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              المورد
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              المبلغ
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ملاحظات
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              إجراءات
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenseForm.map((expense, index) => (
                            <tr key={index} className={expense.isActualExpense === false ? 'bg-orange-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {expense.isActualExpense !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    فعلي (دين)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    تقديري
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {expenseCategories.find(cat => cat.id === expense.categoryId)?.name || 'غير محدد'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {expense.isActualExpense !== false
                                  ? (expense.supplierId
                                    ? getFilteredSuppliersForCategory(expense.categoryId).find(sup => sup.id === expense.supplierId)?.name || 'غير محدد'
                                    : 'غير محدد')
                                  : <span className="text-gray-400 italic">-</span>
                                }
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                                {expense.amount} {expense.currency}
                                {expense.currency !== 'LYD' && (
                                  <div className="text-[10px] text-blue-500">
                                    ({(Number(expense.amount) * Number(expense.exchangeRate)).toFixed(2)} د.ل)
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {expense.notes || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleRemoveExpenseFromList(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-gray-700">إجمالي المصروفات الجديدة (LYD):</span>
                        <span className="font-bold text-blue-600">
                          {formatArabicCurrency(expenseForm.reduce((sum, exp: any) => sum + (Number(exp.amount) * Number(exp.exchangeRate)), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2 border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">الإجمالي النهائي للفاتورة (LYD):</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatArabicCurrency(
                            (Number(selectedPurchase.total) || 0) +
                            existingExpenses.reduce((sum, exp) => sum + (Number(exp.amount) * Number(exp.exchangeRate)), 0) +
                            expenseForm.reduce((sum, exp: any) => sum + (Number(exp.amount) * Number(exp.exchangeRate)), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddExpensesModal(false)}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveExpenses}
                    disabled={isApproving}
                    className={`px-6 py-2 rounded-md flex items-center gap-2 ${isApproving
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isApproving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري الاعتماد...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        اعتماد الفاتورة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Purchase Approval Modal */}
      <PurchaseApprovalModal
        isOpen={showApprovalModal}
        onClose={handleCloseApprovalModal}
        onSuccess={handleApprovalSuccess}
        purchase={purchaseToApprove}
      />
    </div >
  );
};

export default PurchasesPage;
