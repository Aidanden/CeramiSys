"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ShoppingBag,
  DollarSign,
  Filter,
  Eye,
  Shield
} from 'lucide-react';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateStockMutation,
  useUpdatePriceMutation,
  Product,
  CreateProductRequest,
  UpdateProductRequest
} from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetProductGroupsQuery } from '@/state/productGroupsApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';
import useNotifications from '@/hooks/useNotifications';

const ProductsPage = () => {
  const router = useRouter();
  const notifications = useNotifications();

  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State للتصفية والبحث
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSKU, setSearchSKU] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'available'>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [stockFromQty, setStockFromQty] = useState<string>('');
  const [stockToQty, setStockToQty] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<number | undefined>(undefined);

  // State للمودالز
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);

  // وحدة القياس في نماذج الإضافة والتعديل
  const [createUnit, setCreateUnit] = useState<'صندوق' | 'قطعة' | 'كيس' | 'لتر'>('صندوق');
  const [editUnit, setEditUnit] = useState<'صندوق' | 'قطعة' | 'كيس' | 'لتر'>('صندوق');

  // تحميل حد المخزون من localStorage
  useEffect(() => {
    const savedThreshold = localStorage.getItem('lowStockThreshold');
    if (savedThreshold) {
      setLowStockThreshold(parseInt(savedThreshold));
    }
  }, []);

  // مزامنة قيمة الوحدة في نموذج التعديل عند فتح المودال
  useEffect(() => {
    if (isEditModalOpen && selectedProduct) {
      const unit = (selectedProduct.unit as 'صندوق' | 'قطعة' | 'كيس' | 'لتر' | undefined) || 'صندوق';
      setEditUnit(unit);
    }
  }, [isEditModalOpen, selectedProduct]);

  // إعادة تعيين الصفحة إلى الأولى عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchSKU, selectedCompany, selectedUnit, selectedGroup, stockFilter, stockFromQty, stockToQty]);

  // تحديد ما إذا كان هناك أي فلاتر نشطة
  const hasActiveFilters = searchTerm || searchSKU || selectedCompany || selectedUnit || selectedGroup || stockFilter !== 'all' || stockFromQty || stockToQty;
  const hasStockRangeFilter = stockFromQty || stockToQty;
  const hasSearchFilters = searchTerm || searchSKU;

  // RTK Query hooks - نرسل جميع الفلاتر المدعومة في الـ API
  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch } = useGetProductsQuery({
    page: currentPage,
    limit: 12,
    search: searchTerm || undefined,
    sku: searchSKU || undefined,
    unit: selectedUnit || undefined,
    companyId: selectedCompany ? Number(selectedCompany) : undefined,
    groupId: selectedGroup ? (selectedGroup === '0' ? 0 : Number(selectedGroup)) : undefined,
  }, {
    pollingInterval, // إعادة جلب تلقائية كل X ميلي ثانية
  });

  // استعلام للحصول على جميع الأصناف للإحصائيات
  const { data: allProductsData } = useGetProductsQuery({
    page: 1,
    limit: 10000,
  });

  const { data: companiesData, isLoading: isLoadingCompanies } = useGetCompaniesQuery({ limit: 100 });
  const { data: groupsData } = useGetProductGroupsQuery();

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateStock] = useUpdateStockMutation();
  const [updatePrice] = useUpdatePriceMutation();

  // بيانات الأصناف
  const pagination = productsData?.data?.pagination;
  let products = productsData?.data?.products || [];
  const allProducts = allProductsData?.data?.products || [];

  // تطبيق فلاتر المخزون على الـ client-side (لأنها غير مدعومة في الـ API)
  if (stockFilter !== 'all') {
    products = products.filter(product => {
      const stockBoxes = (product.stock as any)?.[0]?.boxes || 0;

      if (stockFilter === 'out') {
        return stockBoxes === 0;
      }
      if (stockFilter === 'low') {
        return stockBoxes > 0 && stockBoxes <= lowStockThreshold;
      }
      if (stockFilter === 'available') {
        return stockBoxes > 0;
      }

      return true;
    });
  }

  // تطبيق فلتر نطاق الكمية (من - إلى)
  if (stockFromQty || stockToQty) {
    products = products.filter(product => {
      const stockBoxes = Number((product.stock as any)?.[0]?.boxes || 0);
      const fromQty = stockFromQty ? Number(stockFromQty) : null;
      const toQty = stockToQty ? Number(stockToQty) : null;

      // إذا تم تحديد "من" فقط: الكمية >= من
      if (fromQty !== null && toQty === null) {
        return stockBoxes >= fromQty;
      }
      // إذا تم تحديد "إلى" فقط: الكمية <= إلى
      if (fromQty === null && toQty !== null) {
        return stockBoxes <= toQty;
      }
      // إذا تم تحديد كلاهما: من <= الكمية <= إلى
      if (fromQty !== null && toQty !== null) {
        return stockBoxes >= fromQty && stockBoxes <= toQty;
      }

      return true;
    });
  }

  // إحصائيات المخزون من جميع الأصناف
  const totalCount = allProducts.length;
  const outOfStockCount = allProducts.filter((p: any) => (p.stock?.[0]?.boxes || 0) === 0).length;
  const lowStockCount = allProducts.filter((p: any) => {
    const boxes = p.stock?.[0]?.boxes || 0;
    return boxes > 0 && boxes <= lowStockThreshold;
  }).length;
  const availableCount = allProducts.filter((p: any) => (p.stock?.[0]?.boxes || 0) > 0).length;

  // معالجة إنشاء صنف
  const handleCreateProduct = async (productData: CreateProductRequest) => {
    try {
      const result = await createProduct(productData).unwrap();
      if (result.success) {
        notifications.products.createSuccess(productData.name);
        setIsCreateModalOpen(false);

        // إعادة تعيين النموذج
        const form = document.querySelector('#create-product-form') as HTMLFormElement;
        if (form) form.reset();
        setCreateUnit('صندوق');

        // مسح جميع الفلاتر لضمان ظهور الصنف الجديد
        setSearchTerm('');
        setSearchSKU('');
        setSelectedCompany('');
        setSelectedUnit('');
        setStockFilter('all');
        setStockFromQty('');
        setStockToQty('');

        // الانتقال للصفحة الأولى
        setCurrentPage(1);

        // تفعيل polling لمدة 10 ثواني لضمان التحديث
        setPollingInterval(500); // كل نصف ثانية

        // إعادة جلب فورية
        setTimeout(() => {
          refetch();
        }, 100);

        // إيقاف polling بعد 10 ثواني
        setTimeout(() => {
          setPollingInterval(undefined);
        }, 10000);
      }
    } catch (error: any) {
      notifications.products.createError(error?.data?.message);
    }
  };

  // معالجة تحديث صنف
  const handleUpdateProduct = async (productData: UpdateProductRequest) => {
    if (!selectedProduct) return;

    try {
      const result = await updateProduct({
        id: selectedProduct.id,
        productData
      }).unwrap();

      if (result.success) {
        notifications.products.updateSuccess(selectedProduct.name);
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        // RTK Query invalidatesTags سيحدث البيانات تلقائياً
      }
    } catch (error: any) {
      notifications.products.updateError(error?.data?.message);
    }
  };

  // معالجة حذف صنف
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      const result = await deleteProduct(selectedProduct.id).unwrap();
      if (result.success) {
        notifications.products.deleteSuccess(selectedProduct.name);
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      }
    } catch (error: any) {
      notifications.products.deleteError(error?.data?.message);
    }
  };

  // معالجة تحديث المخزون
  const handleUpdateStock = async (boxes: number) => {
    if (!selectedProduct || !currentUser?.companyId) return;

    try {
      await updateStock({
        companyId: currentUser.companyId,
        productId: selectedProduct.id,
        quantity: boxes
      }).unwrap();
      notifications.products.stockUpdateSuccess(selectedProduct.name, boxes);
      setIsStockModalOpen(false);
      setSelectedProduct(null);
      // RTK Query invalidatesTags سيحدث البيانات تلقائياً
    } catch (error: any) {
      notifications.products.stockUpdateError(error?.data?.message);
    }
  };

  // معالجة تحديث السعر
  const handleUpdatePrice = async (sellPrice: number) => {
    if (!selectedProduct || !currentUser?.companyId) return;

    try {
      await updatePrice({
        companyId: currentUser.companyId,
        productId: selectedProduct.id,
        sellPrice
      }).unwrap();
      notifications.products.priceUpdateSuccess(selectedProduct.name, sellPrice);
      setIsPriceModalOpen(false);
      setSelectedProduct(null);
      // RTK Query invalidatesTags سيحدث البيانات تلقائياً
    } catch (error: any) {
      notifications.products.priceUpdateError(error?.data?.message);
    }
  };

  // عرض QR Code المحفوظ للصنف
  const handleGenerateQR = (product: Product) => {
    if (product.qrCode) {
      setQrCodeUrl(product.qrCode);
      setSelectedProduct(product);
      setIsQRModalOpen(true);
    } else {
      notifications.custom.error('خطأ', 'QR Code غير متوفر لهذا الصنف');
    }
  };

  // طباعة QR Code مباشرة بدون فتح modal
  const handlePrintQRDirect = (product: Product) => {
    if (!product.qrCode) {
      notifications.custom.error('خطأ', 'QR Code غير متوفر لهذا الصنف');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>QR Code - ${product.name}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #333;
              padding: 30px;
              border-radius: 10px;
              background: white;
            }
            .product-info {
              margin-bottom: 20px;
            }
            .product-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .product-sku {
              font-size: 18px;
              color: #666;
              margin-bottom: 5px;
            }
            .product-details {
              font-size: 14px;
              color: #888;
              margin-top: 10px;
            }
            img {
              max-width: 300px;
              height: auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                border: 1px solid #333;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="product-info">
              <div class="product-name">${product.name}</div>
              <div class="product-sku">الكود: ${product.sku}</div>
              ${product.unit ? `<div class="product-details">الوحدة: ${product.unit}</div>` : ''}
              ${product.unitsPerBox ? `<div class="product-details">عدد الوحدات في الصندوق: ${product.unitsPerBox} م²</div>` : ''}
              ${product.price?.sellPrice ? `<div class="product-details">السعر: ${product.price.sellPrice} د.ل/م²</div>` : ''}
            </div>
            <img src="${product.qrCode}" alt="QR Code" />
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // طباعة QR Code
  const handlePrintQR = () => {
    if (!qrCodeUrl || !selectedProduct) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>QR Code - ${selectedProduct.name}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #333;
              padding: 30px;
              border-radius: 10px;
              background: white;
            }
            .product-info {
              margin-bottom: 20px;
            }
            .product-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .product-sku {
              font-size: 18px;
              color: #666;
              margin-bottom: 5px;
            }
            .product-details {
              font-size: 14px;
              color: #888;
              margin-top: 10px;
            }
            img {
              max-width: 300px;
              height: auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                border: 1px solid #333;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="product-info">
              <div class="product-name">${selectedProduct.name}</div>
              <div class="product-sku">الكود: ${selectedProduct.sku}</div>
              ${selectedProduct.unit ? `<div class="product-details">الوحدة: ${selectedProduct.unit}</div>` : ''}
              ${selectedProduct.unitsPerBox ? `<div class="product-details">عدد الوحدات في الصندوق: ${selectedProduct.unitsPerBox}</div>` : ''}
              ${selectedProduct.price?.sellPrice ? `<div class="product-details">السعر: ${selectedProduct.price.sellPrice} د.ل/م²</div>` : ''}
            </div>
            <img src="${qrCodeUrl}" alt="QR Code" />
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // طباعة QR codes متعددة على ورقة A4 (12 ملصق - 2 أعمدة × 6 صفوف)
  // حجم الملصق: 102×49.5 مم
  const handleBulkPrintQR = () => {
    const selectedProductsList = products.filter(p => selectedProducts.has(p.id) && p.qrCode);

    if (selectedProductsList.length === 0) {
      notifications.custom.error('خطأ', 'لم يتم اختيار أي أصناف أو الأصناف المختارة لا تحتوي على QR Code');
      return;
    }

    // تكرار الأصناف لملء 12 ملصق (2 أعمدة × 6 صفوف)
    const labelsToFill = 12;
    const labels = [];
    // نملأ المصفوفة بالأصناف المختارة فقط، والباقي نتركه فارغاً (null)
    for (let i = 0; i < labelsToFill; i++) {
      if (i < selectedProductsList.length) {
        labels.push(selectedProductsList[i]);
      } else {
        labels.push(null);
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsHTML = labels.map((product) => {
      // إذا كان العنصر فارغاً، نعرض ملصق فارغ للحفاظ على التخطيط
      if (!product) {
        return '<div class="label"></div>';
      }

      return `<div class="label">
        <div class="qr-section">
          <img src="${product.qrCode}" alt="QR Code" class="qr-image" />
        </div>
        <div class="info-section">
          <div class="store-name">الامارات للسيراميك</div>
          <div class="product-name">${product.name}</div>
          <div class="product-sku">${product.sku}</div>
        </div>
      </div>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>طباعة QR Codes - ${selectedProductsList.length} صنف</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4;
              margin: 0;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              background: white;
              width: 210mm;
              height: 297mm;
            }
            
            .labels-container {
              display: grid;
              grid-template-columns: repeat(2, 102mm);
              grid-template-rows: repeat(6, 49.5mm);
              width: 210mm;
              height: 297mm;
              padding: 0;
              margin: 0 auto;
              justify-content: center;
            }
            
            .label {
              width: 102mm;
              height: 49.5mm;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: flex-start;
              padding: 2mm 3mm;
              background: white;
              overflow: hidden;
              gap: 3mm;
            }
            
            .qr-section {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .qr-image {
              width: 42mm;
              height: 42mm;
            }
            
            .info-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: right;
              overflow: hidden;
              padding-right: 2mm;
            }
            
            .product-name {
              font-size: 11pt;
              font-weight: bold;
              color: #000;
              line-height: 1.2;
              margin-bottom: 2mm;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              max-height: 14mm;
            }
            
            .product-sku {
              font-size: 10pt;
              color: #333;
              font-weight: 600;
              margin-bottom: 1.5mm;
            }
            
            .product-details {
              font-size: 8pt;
              color: #555;
              margin-bottom: 1mm;
            }
            
            .store-name {
              font-size: 14pt;
              color: #000;
              font-weight: bold;
              margin-bottom: 3mm;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .labels-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // تحديد/إلغاء تحديد صنف
  const toggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-text-primary">إدارة الأصناف والمخزن</h1>
              <p className="text-text-secondary">إدارة أصناف المنتجات والمخزون والأسعار الخاصة بشركتك</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsBulkPrintMode(!isBulkPrintMode);
                if (isBulkPrintMode) {
                  setSelectedProducts(new Set());
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${isBulkPrintMode
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isBulkPrintMode ? 'إلغاء الاختيار' : 'طباعة متعددة'}
            </button>


            {isBulkPrintMode && selectedProducts.size > 0 && (
              <button
                onClick={handleBulkPrintQR}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة ({selectedProducts.size})
              </button>
            )}


            {(currentUser?.permissions?.includes('screen.product_groups') ||
              currentUser?.permissions?.includes('screen.all')) && (
                <button
                  onClick={() => router.push('/product-groups')}
                  className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  مجموعات الأصناف
                </button>
              )}

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              إضافة صنف جديد
            </button>
          </div>
        </div>
      </div>

      {/* Stock Status Filters */}
      <div className="bg-surface-primary p-4 rounded-lg shadow-sm border border-border-primary mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setStockFilter('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${stockFilter === 'all'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-background-secondary text-text-secondary hover:bg-background-hover'
              }`}
          >
            جميع الأصناف ({totalCount})
          </button>
          <button
            onClick={() => {
              setStockFilter('available');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${stockFilter === 'available'
              ? 'bg-success-600 text-white shadow-md'
              : 'bg-background-secondary text-text-secondary hover:bg-background-hover'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            متوفرة بالمخزن ({availableCount})
          </button>
          <button
            onClick={() => {
              setStockFilter('out');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${stockFilter === 'out'
              ? 'bg-error-600 text-white shadow-md'
              : 'bg-background-secondary text-text-secondary hover:bg-background-hover'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            منتهية من المخزن ({outOfStockCount})
          </button>
          <button
            onClick={() => {
              setStockFilter('low');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${stockFilter === 'low'
              ? 'bg-warning-600 text-white shadow-md'
              : 'bg-background-secondary text-text-secondary hover:bg-background-hover'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h-2v-2h2v2zm0-4h-2V7h2v6zm-1-9C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4z" />
            </svg>
            شارفت على الانتهاء ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Filters and Search - محسّن */}
      <div className="bg-surface-primary p-6 rounded-lg shadow-sm border border-border-primary mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Filter className="w-5 h-5" />
            البحث والفلترة
          </h3>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchSKU('');
                setSelectedCompany('');
                setSelectedUnit('');
                setStockFilter('all');
                setStockFromQty('');
                setStockToQty('');
                setSelectedGroup('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Search by Name */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="البحث بالاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary placeholder-text-muted transition-all duration-200 ${searchTerm ? 'border-blue-500 ring-2 ring-blue-100' : 'border-border-primary'
                }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search by SKU */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <input
              type="text"
              placeholder="البحث بالكود..."
              value={searchSKU}
              onChange={(e) => setSearchSKU(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary placeholder-text-muted transition-all duration-200 ${searchSKU ? 'border-blue-500 ring-2 ring-blue-100' : 'border-border-primary'
                }`}
            />
            {searchSKU && (
              <button
                onClick={() => setSearchSKU('')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Company Filter */}
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 pointer-events-none" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary transition-all duration-200 appearance-none ${selectedCompany ? 'border-blue-500 ring-2 ring-blue-100 font-medium' : 'border-border-primary'
                }`}
            >
              <option value="">جميع الشركات</option>
              {companiesData?.data?.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Product Group Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary transition-all duration-200 appearance-none ${selectedGroup ? 'border-blue-500 ring-2 ring-blue-100 font-medium' : 'border-border-primary'
                }`}
            >
              <option value="">جميع المجموعات</option>
              <option value="0">بدون مجموعة</option>
              {groupsData?.map((group: any) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Unit Filter */}
          <div className="relative">
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16m-7 5h7" />
            </svg>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary transition-all duration-200 appearance-none ${selectedUnit ? 'border-blue-500 ring-2 ring-blue-100 font-medium' : 'border-border-primary'
                }`}
            >
              <option value="">جميع الوحدات</option>
              <option value="صندوق">صندوق</option>
              <option value="قطعة">قطعة</option>
              <option value="كيس">كيس</option>
              <option value="لتر">لتر</option>
            </select>
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Stock Quantity Range Filter */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <input
                  type="number"
                  placeholder="من كمية..."
                  value={stockFromQty}
                  onChange={(e) => setStockFromQty(e.target.value)}
                  min="0"
                  className={`w-full pr-9 pl-2 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary placeholder-text-muted transition-all duration-200 text-sm ${stockFromQty ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-border-primary'
                    }`}
                />
              </div>
              <span className="text-text-tertiary text-sm font-medium">إلى</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="إلى كمية..."
                  value={stockToQty}
                  onChange={(e) => setStockToQty(e.target.value)}
                  min="0"
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-border-focus focus:border-border-focus bg-background-secondary text-text-primary placeholder-text-muted transition-all duration-200 text-sm ${stockToQty ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-border-primary'
                    }`}
                />
              </div>
              {(stockFromQty || stockToQty) && (
                <button
                  onClick={() => {
                    setStockFromQty('');
                    setStockToQty('');
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="مسح نطاق الكمية"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* مؤشر الفلاتر النشطة */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-border-primary">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-text-secondary">الفلاتر النشطة:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <Search className="w-3 h-3" />
                  اسم: {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {searchSKU && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  كود: {searchSKU}
                  <button onClick={() => setSearchSKU('')} className="hover:text-blue-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {selectedCompany && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {companiesData?.data?.companies.find(c => c.id === Number(selectedCompany))?.name}
                  <button onClick={() => setSelectedCompany('')} className="hover:text-purple-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {selectedGroup && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                  {selectedGroup === '0' ? 'بدون مجموعة' : groupsData?.find((g: any) => g.id === Number(selectedGroup))?.name}
                  <button onClick={() => setSelectedGroup('')} className="hover:text-amber-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {selectedUnit && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {selectedUnit}
                  <button onClick={() => setSelectedUnit('')} className="hover:text-green-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {stockFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  {stockFilter === 'available' ? 'متوفرة' : stockFilter === 'out' ? 'منتهية' : 'شارفت على الانتهاء'}
                  <button onClick={() => setStockFilter('all')} className="hover:text-orange-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {(stockFromQty || stockToQty) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  كمية: {stockFromQty || '0'} - {stockToQty || '∞'}
                  <button onClick={() => { setStockFromQty(''); setStockToQty(''); }} className="hover:text-cyan-900">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Products Table */}
      <div className="bg-surface-primary rounded-lg shadow-sm border border-border-primary overflow-hidden w-full">
        <div className="w-full">
          <table className="w-full table-fixed">
            <thead className="bg-background-secondary">
              <tr>
                {isBulkPrintMode && (
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width: '22%' }}>
                  الصنف
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width: '6%' }}>
                  الرمز
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider hidden sm:table-cell" style={{ width: '6%' }}>
                  الوحدة
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width: '7%' }}>
                  المخزون
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell" style={{ width: '10%' }}>
                  الكمية (م²)
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width: '9%' }}>
                  السعر
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell" style={{ width: '9%' }}>
                  التكلفة
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider hidden lg:table-cell" style={{ width: '13%' }}>
                  الشركة
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width: '18%' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-primary divide-y divide-border-primary">
              {isLoadingProducts ? (
                <tr>
                  <td colSpan={9} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className="text-sm sm:text-base">جاري التحميل...</p>
                    </div>
                  </td>
                </tr>
              ) : productsError ? (
                <tr>
                  <td colSpan={9} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-error-500 text-center">
                        <p className="text-base sm:text-lg font-semibold mb-2">خطأ في تحميل البيانات</p>
                        <p className="text-xs sm:text-sm text-text-secondary max-w-md">
                          {(productsError as any)?.status === 401
                            ? 'انتهت صلاحية جلستك، يرجى تسجيل الدخول مرة أخرى'
                            : 'حدث خطأ أثناء تحميل قائمة الأصناف'}
                        </p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-all duration-200 text-sm sm:text-base"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-text-tertiary" />
                      <div className="text-center">
                        <p className="text-base sm:text-lg font-medium mb-1">لا توجد أصناف</p>
                        <p className="text-xs sm:text-sm">ابدأ بإضافة أول صنف لك</p>
                      </div>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة صنف جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className={`hover:bg-background-hover transition-all duration-200 ${selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    {isBulkPrintMode && (
                      <td className="px-3 sm:px-4 lg:px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          disabled={!product.qrCode}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
                        />
                      </td>
                    )}
                    <td className="px-2 py-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="flex-shrink-0 h-7 w-7">
                          <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-text-primary whitespace-normal break-words" title={product.name}>
                            {product.name}
                          </div>
                          <div className="text-xs text-text-secondary sm:hidden">
                            {product.unit || '-'} • {product.createdByCompany.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-text-primary">
                      <code className="bg-background-tertiary px-1.5 py-0.5 rounded text-xs font-mono">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-2 py-3 text-sm text-text-primary hidden sm:table-cell">
                      <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full">
                        {product.unit || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-text-primary">
                      <div className="flex flex-col items-start">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${((product.stock as any)?.[0]?.boxes || 0) > 0
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200'
                          : 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-200'
                          }`}>
                          {formatArabicQuantity((product.stock as any)?.[0]?.boxes || 0)}
                        </span>
                        <span className="text-xs text-text-secondary mt-0.5">
                          {product.unit === 'صندوق' ? 'صندوق' : (product.unit || 'وحدة')}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 hidden md:table-cell">
                      {product.unit === 'صندوق' && product.unitsPerBox ? (
                        <div className="text-center">
                          <div className="font-medium text-blue-600 text-sm">
                            {formatArabicArea(Number((product.stock as any)?.[0]?.boxes || 0) * Number(product.unitsPerBox))} م²
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatArabicArea(product.unitsPerBox)} م² × {formatArabicQuantity((product.stock as any)?.[0]?.boxes || 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900">
                      <div className="font-medium text-green-600">
                        {product.price?.sellPrice
                          ? formatArabicCurrency(product.price.sellPrice)
                          : '-'}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 hidden md:table-cell">
                      <div className="font-medium text-orange-600">
                        {product.cost !== undefined && product.cost !== null
                          ? formatArabicCurrency(product.cost)
                          : '0'}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 hidden lg:table-cell">
                      <span className="inline-block max-w-full px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full truncate" title={product.createdByCompany.name}>
                        {product.createdByCompany.name}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* الأزرار الأساسية - تظهر دائماً */}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsStockModalOpen(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="إدارة المخزون"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>

                        {/* الأزرار الإضافية - تظهر في الشاشات المتوسطة وما فوق */}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsPriceModalOpen(true);
                          }}
                          className="text-purple-600 hover:text-purple-900 p-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors hidden sm:block"
                          title="إدارة السعر"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateQR(product)}
                          className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors hidden md:block"
                          title="عرض QR Code"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePrintQRDirect(product)}
                          className="text-blue-600 hover:text-blue-900 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors hidden lg:block"
                          title="طباعة QR Code"
                          disabled={!product.qrCode}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>

                        {/* زر الحذف - يظهر في الشاشات الكبيرة فقط */}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors hidden lg:block"
                          title="حذف"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - محسّن */}
        {pagination && pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            {/* للشاشات الصغيرة */}
            <div className="flex-1 flex justify-between items-center sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="text-sm text-gray-700">
                {formatArabicNumber(currentPage)} / {formatArabicNumber(pagination.pages)}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>

            {/* للشاشات الكبيرة */}
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض <span className="font-medium">{formatArabicNumber((currentPage - 1) * 10 + 1)}</span> إلى{' '}
                  <span className="font-medium">{formatArabicNumber(Math.min(currentPage * 10, pagination.total))}</span> من{' '}
                  <span className="font-medium">{formatArabicNumber(pagination.total)}</span> نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {/* زر الصفحة الأولى */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="الصفحة الأولى"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* زر السابق */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="السابق"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* أرقام الصفحات - محسّن للصفحات الكثيرة */}
                  {(() => {
                    const maxButtons = 7; // أقصى عدد أزرار تظهر
                    const pages = pagination.pages;
                    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                    let endPage = Math.min(pages, startPage + maxButtons - 1);

                    if (endPage - startPage < maxButtons - 1) {
                      startPage = Math.max(1, endPage - maxButtons + 1);
                    }

                    const buttons = [];

                    for (let i = startPage; i <= endPage; i++) {
                      buttons.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === i
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {formatArabicNumber(i)}
                        </button>
                      );
                    }

                    return buttons;
                  })()}

                  {/* زر التالي */}
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="التالي"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* زر الصفحة الأخيرة */}
                  <button
                    onClick={() => setCurrentPage(pagination.pages)}
                    disabled={currentPage === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="الصفحة الأخيرة"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">إضافة صنف جديد</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form id="create-product-form" onSubmit={(e) => {
              e.preventDefault();

              // التحقق من تحميل الشركات
              if (isLoadingCompanies) {
                notifications.general.validationError('قائمة الشركات');
                return;
              }

              const formData = new FormData(e.currentTarget);
              const companyId = formData.get('companyId');

              // التحقق من اختيار الشركة
              if (!companyId) {
                notifications.general.validationError('الشركة');
                return;
              }

              const productData = {
                sku: formData.get('sku') as string,
                name: formData.get('name') as string,
                unit: formData.get('unit') as string || undefined,
                unitsPerBox: formData.get('unitsPerBox') && formData.get('unitsPerBox') !== '' ? Number(formData.get('unitsPerBox')) : undefined,
                createdByCompanyId: Number(companyId),
                sellPrice: formData.get('sellPrice') && formData.get('sellPrice') !== '' ? Number(formData.get('sellPrice')) : undefined,
                initialBoxes: formData.get('initialBoxes') && formData.get('initialBoxes') !== '' ? Number(formData.get('initialBoxes')) : undefined,
                groupId: formData.get('groupId') && formData.get('groupId') !== '' ? Number(formData.get('groupId')) : undefined,
              };
              console.log('Sending product data:', productData);
              handleCreateProduct(productData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رمز الصنف *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل رمز الصنف"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الصنف *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل اسم الصنف"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الشركة *
                  </label>
                  {currentUser?.isSystemUser ? (
                    <select
                      name="companyId"
                      required
                      defaultValue={currentUser?.companyId || ''}
                      disabled={isLoadingCompanies}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {isLoadingCompanies ? 'جاري تحميل الشركات...' : 'اختر الشركة'}
                      </option>
                      {companiesData?.data?.companies?.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} {company.code ? `(${company.code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input type="hidden" name="companyId" value={currentUser?.companyId || ''} />
                      <input
                        type="text"
                        value={companiesData?.data?.companies?.find(c => c.id === currentUser?.companyId)?.name || 'جاري التحميل...'}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        سيتم إضافة الصنف لشركتك فقط
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مجموعة الأصناف (اختياري)
                  </label>
                  <select
                    name="groupId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">لا توجد مجموعة</option>
                    {groupsData?.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                        {group.supplier ? ` - ${group.supplier.name}` : ''}
                        {group.maxDiscountPercentage ? ` (خصم: ${group.maxDiscountPercentage}%)` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    عند اختيار مجموعة، سيتم ربط الصنف بالمورد الافتراضي للمجموعة
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <select
                    name="unit"
                    value={createUnit}
                    onChange={(e) => setCreateUnit(e.target.value as 'صندوق' | 'قطعة' | 'كيس' | 'لتر')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="صندوق">صندوق</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كيس">كيس</option>
                    <option value="لتر">لتر</option>
                  </select>
                </div>

                {/* حقل unitsPerBox يظهر فقط للصندوق */}
                {createUnit === 'صندوق' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      عدد الوحدات في الصندوق (بالمتر المربع)
                    </label>
                    <input
                      type="number"
                      name="unitsPerBox"
                      step="0.01"
                      min="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: 1.44 (1.44 متر مربع في الصندوق)"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سعر البيع (للمتر الواحد)
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    أدخل سعر المتر الواحد (ليس سعر الصندوق)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {createUnit === 'صندوق' ? 'عدد الصناديق الأولية' : `الكمية الأولية (${createUnit})`}
                  </label>
                  <input
                    type="number"
                    name="initialBoxes"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={createUnit === 'صندوق' ? 'عدد الصناديق' : `الكمية بال${createUnit}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {createUnit === 'صندوق'
                      ? 'إذا تركت هذا الحقل فارغاً، سيتم إنشاء الصنف بمخزون 0 صندوق'
                      : `إذا تركت هذا الحقل فارغاً، سيتم إنشاء الصنف بمخزون 0 ${createUnit}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isLoadingCompanies}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'جاري الإضافة...' : isLoadingCompanies ? 'جاري تحميل الشركات...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">تعديل الصنف</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);

              const productData: any = {
                sku: formData.get('sku') as string,
                name: formData.get('name') as string,
                unit: formData.get('unit') as string || undefined,
                groupId: formData.get('groupId') ? parseInt(formData.get('groupId') as string) : undefined,
              };

              // إرسال unitsPerBox فقط للصندوق
              if (editUnit === 'صندوق') {
                const unitsPerBoxValue = formData.get('unitsPerBox');
                if (unitsPerBoxValue) {
                  productData.unitsPerBox = Number(unitsPerBoxValue);
                }
              }

              // إرسال السعر
              const sellPriceValue = formData.get('sellPrice');
              if (sellPriceValue) {
                productData.sellPrice = Number(sellPriceValue);
              }

              handleUpdateProduct(productData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رمز الصنف *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required
                    defaultValue={selectedProduct.sku}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل رمز الصنف"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الصنف *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={selectedProduct.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل اسم الصنف"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <select
                    name="unit"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value as 'صندوق' | 'قطعة' | 'كيس' | 'لتر')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="صندوق">صندوق</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كيس">كيس</option>
                    <option value="لتر">لتر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مجموعة الأصناف (اختياري)
                  </label>
                  <select
                    name="groupId"
                    defaultValue={selectedProduct.groupId || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">لا توجد مجموعة</option>
                    {groupsData?.map((group: any) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                        {group.supplier ? ` - ${group.supplier.name}` : ''}
                        {group.maxDiscountPercentage ? ` (خصم: ${group.maxDiscountPercentage}%)` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    عند اختيار مجموعة، سيتم ربط الصنف بالمورد الافتراضي للمجموعة
                  </p>
                </div>

                {/* حقل unitsPerBox يظهر فقط للصندوق */}
                {editUnit === 'صندوق' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      عدد الوحدات في الصندوق (بالمتر المربع)
                    </label>
                    <input
                      type="number"
                      name="unitsPerBox"
                      step="0.01"
                      min="0.01"
                      defaultValue={selectedProduct.unitsPerBox || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: 1.44 (1.44 متر مربع في الصندوق)"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السعر
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    step="0.01"
                    min="0"
                    defaultValue={selectedProduct.price?.sellPrice || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? 'جاري التحديث...' : 'تحديث'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">تأكيد الحذف</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                هل أنت متأكد من حذف الصنف التالي؟
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">رمز الصنف: {selectedProduct.sku}</p>
              </div>
              <p className="text-red-600 text-sm mt-2">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Management Modal */}
      {isStockModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">إدارة المخزون</h3>
              <button
                onClick={() => {
                  setIsStockModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">رمز الصنف: {selectedProduct.sku}</p>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>{selectedProduct.unit === 'صندوق' ? 'الصناديق الحالية:' : `الكمية الحالية (${selectedProduct.unit || 'وحدة'}):`}</span>
                    <span className="font-medium">{formatArabicQuantity(selectedProduct.stock?.boxes || 0)} {selectedProduct.unit === 'صندوق' ? 'صندوق' : (selectedProduct.unit || 'وحدة')}</span>
                  </div>
                  {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && (
                    <>
                      <div className="flex justify-between">
                        <span>الوحدات في الصندوق:</span>
                        <span className="font-medium">{formatArabicArea(selectedProduct.unitsPerBox)} م²</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium text-blue-600">إجمالي المساحة:</span>
                        <span className="font-bold text-blue-600">
                          {formatArabicArea(Number(selectedProduct.stock?.boxes || 0) * Number(selectedProduct.unitsPerBox))} م²
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const boxes = Number(formData.get('boxes'));
              handleUpdateStock(boxes);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedProduct.unit === 'صندوق' ? 'عدد الصناديق الجديد *' : `الكمية الجديدة (${selectedProduct.unit || 'وحدة'}) *`}
                  </label>
                  <input
                    type="number"
                    name="boxes"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={selectedProduct.stock?.boxes || 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={selectedProduct.unit === 'صندوق' ? 'أدخل عدد الصناديق الجديد' : `أدخل الكمية الجديدة بال${selectedProduct.unit || 'وحدة'}`}
                  />
                  {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && (
                    <p className="text-xs text-gray-500 mt-1">
                      المساحة الإجمالية = عدد الصناديق × {formatArabicArea(selectedProduct.unitsPerBox)} م² لكل صندوق
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsStockModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  تحديث المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Management Modal */}
      {isPriceModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">إدارة السعر</h3>
              <button
                onClick={() => {
                  setIsPriceModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">رمز الصنف: {selectedProduct.sku}</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>السعر الحالي (للمتر المربع):</span>
                    <span className="font-medium">{formatArabicCurrency(selectedProduct.price?.sellPrice || 0)}/م²</span>
                  </div>
                  {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && selectedProduct.price?.sellPrice && (
                    <div className="flex justify-between text-blue-600">
                      <span>سعر الصندوق الكامل:</span>
                      <span className="font-medium">
                        {formatArabicCurrency(Number(selectedProduct.price.sellPrice) * Number(selectedProduct.unitsPerBox))}/صندوق
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sellPrice = Number(formData.get('sellPrice'));
              handleUpdatePrice(sellPrice);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    السعر الجديد (للمتر الواحد) *
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={selectedProduct.price?.sellPrice || 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="أدخل سعر المتر الواحد"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    أدخل سعر المتر الواحد (ليس سعر الصندوق)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsPriceModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  تحديث السعر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQRModalOpen && selectedProduct && qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code - {selectedProduct.name}
              </h3>
              <button
                onClick={() => {
                  setIsQRModalOpen(false);
                  setSelectedProduct(null);
                  setQrCodeUrl('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* معلومات الصنف */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الكود:</span>
                    <span className="font-medium text-gray-900">{selectedProduct.sku}</span>
                  </div>
                  {selectedProduct.unit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">الوحدة:</span>
                      <span className="font-medium text-gray-900">{selectedProduct.unit}</span>
                    </div>
                  )}
                  {selectedProduct.unitsPerBox && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">وحدات/صندوق:</span>
                      <span className="font-medium text-gray-900">{formatArabicArea(selectedProduct.unitsPerBox)} م²</span>
                    </div>
                  )}
                  {selectedProduct.price?.sellPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">السعر (للمتر المربع):</span>
                      <span className="font-medium text-green-600">{formatArabicCurrency(selectedProduct.price.sellPrice)}/م²</span>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center bg-white p-4 border-2 border-gray-200 rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>

              {/* أزرار */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrintQR}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  طباعة
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `QR-${selectedProduct.sku}.png`;
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  تحميل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
