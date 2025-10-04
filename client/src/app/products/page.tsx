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
  TrendingUp,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { 
  useGetProductsQuery, 
  useGetProductStatsQuery,
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
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux';
import { toast } from 'react-hot-toast';
import { formatArabicNumber, formatArabicCurrency, formatArabicQuantity, formatArabicArea } from '@/utils/formatArabicNumbers';

const ProductsPage = () => {
  const router = useRouter();
  
  // Get current user info
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // State للتصفية والبحث
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  // State للمودالز
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // وحدة القياس في نماذج الإضافة والتعديل
  const [createUnit, setCreateUnit] = useState<'صندوق' | 'قطعة'>('صندوق');
  const [editUnit, setEditUnit] = useState<'صندوق' | 'قطعة'>('صندوق');

  // مزامنة قيمة الوحدة في نموذج التعديل عند فتح المودال
  useEffect(() => {
    if (isEditModalOpen && selectedProduct) {
      const unit = (selectedProduct.unit as 'صندوق' | 'قطعة' | undefined) || 'صندوق';
      setEditUnit(unit);
    }
  }, [isEditModalOpen, selectedProduct]);

  // RTK Query hooks
  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch } = useGetProductsQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    unit: selectedUnit || undefined,
  }, {
    // إعادة جلب البيانات عند العودة للصفحة
    refetchOnFocus: true,
    // إعادة جلب البيانات عند إعادة الاتصال
    refetchOnReconnect: true,
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetProductStatsQuery();
  const { data: companiesData, isLoading: isLoadingCompanies } = useGetCompaniesQuery({ limit: 100 });
  
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [updateStock] = useUpdateStockMutation();
  const [updatePrice] = useUpdatePriceMutation();

  // بيانات الأصناف
  const products = productsData?.data?.products || [];
  const pagination = productsData?.data?.pagination;

  // معالجة إنشاء صنف
  const handleCreateProduct = async (productData: CreateProductRequest) => {
    try {
      const result = await createProduct(productData).unwrap();
      if (result.success) {
        toast.success('تم إنشاء الصنف بنجاح');
        setIsCreateModalOpen(false);
        refetch(); // تحديث قائمة الأصناف
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'خطأ في إنشاء الصنف');
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
        toast.success('تم تحديث الصنف بنجاح');
        setIsEditModalOpen(false);
        setSelectedProduct(null);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'خطأ في تحديث الصنف');
    }
  };

  // معالجة حذف صنف
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      const result = await deleteProduct(selectedProduct.id).unwrap();
      if (result.success) {
        toast.success('تم حذف الصنف بنجاح');
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'خطأ في حذف الصنف');
    }
  };

  // معالجة تحديث المخزون
  const handleUpdateStock = async (boxes: number) => {
    if (!selectedProduct) return;
    
    try {
      await updateStock({
        companyId: 1, // This should come from user context
        productId: selectedProduct.id,
        quantity: boxes // سيتم تحديث هذا لاحقاً ليكون boxes
      }).unwrap();
      toast.success('تم تحديث المخزون بنجاح');
      setIsStockModalOpen(false);
      setSelectedProduct(null);
      refetch(); // Refresh the products list
    } catch (error: any) {
      toast.error(error?.data?.message || 'خطأ في تحديث المخزون');
    }
  };

  // معالجة تحديث السعر
  const handleUpdatePrice = async (sellPrice: number) => {
    if (!selectedProduct) return;
    
    try {
      await updatePrice({
        companyId: 1, // This should come from user context
        productId: selectedProduct.id,
        sellPrice
      }).unwrap();
      toast.success('تم تحديث السعر بنجاح');
      setIsPriceModalOpen(false);
      setSelectedProduct(null);
      refetch(); // Refresh the products list
    } catch (error: any) {
      toast.error(error?.data?.message || 'خطأ في تحديث السعر');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إدارة الأصناف والمخزن</h1>
              <p className="text-gray-600">إدارة أصناف المنتجات والمخزون والأسعار الخاصة بشركتك</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة صنف جديد
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {isLoadingStats ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : statsData ? (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">إجمالي الأصناف</p>
                    <p className="text-2xl font-bold text-gray-900">{statsData.data.totalProducts}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">أصناف بمخزون</p>
                    <p className="text-2xl font-bold text-green-600">{statsData.data.productsWithStock}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">أصناف بدون مخزون</p>
                    <p className="text-2xl font-bold text-red-600">{Math.abs(statsData.data.productsWithoutStock)}</p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">قيمة المخزون</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatArabicNumber(statsData.data.totalStockValue)} د.ل
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث عن الأصناف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">جميع الوحدات</option>
              <option value="قطعة">قطعة</option>
              <option value="متر">متر</option>
              <option value="كيس">كيس</option>
              <option value="علبة">علبة</option>
            </select>
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            تصدير
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الصنف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الرمز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوحدة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المخزون (صناديق)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الكمية (متر مربع)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  السعر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingProducts ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : productsError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="text-red-500 mb-4">
                      <p className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</p>
                      <p className="text-sm text-gray-600">
                        {(productsError as any)?.status === 401 
                          ? 'انتهت صلاحية جلستك، يرجى تسجيل الدخول مرة أخرى'
                          : 'حدث خطأ أثناء تحميل قائمة الأصناف'}
                      </p>
                    </div>
                    <button 
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      إعادة المحاولة
                    </button>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingBag className="w-12 h-12 text-gray-300" />
                      <div>
                        <p className="text-lg font-medium text-gray-600">لا توجد أصناف في مخزن شركتك</p>
                        <p className="text-sm text-gray-500">ابدأ بإضافة أول صنف لشركتك</p>
                      </div>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-2 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة صنف جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.unit || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (product.stock?.boxes || 0) > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formatArabicQuantity(product.stock?.boxes || 0)} {product.unit === 'صندوق' ? 'صندوق' : (product.unit || 'وحدة')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.unit === 'صندوق' && product.unitsPerBox ? (
                        <div className="text-center">
                          <span className="font-medium text-blue-600">
                            {formatArabicArea(Number(product.stock?.boxes || 0) * Number(product.unitsPerBox))} م²
                          </span>
                          <div className="text-xs text-gray-500">
                            ({formatArabicArea(product.unitsPerBox)} م² × {formatArabicQuantity(product.stock?.boxes || 0)} صندوق)
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium text-green-600">
                        {product.price?.sellPrice 
                          ? formatArabicCurrency(product.price.sellPrice) 
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.createdByCompany.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="حذف"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsStockModalOpen(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="إدارة المخزون"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsPriceModalOpen(true);
                          }}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="إدارة السعر"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
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
        {pagination && pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  عرض {(currentPage - 1) * 10 + 1} إلى {Math.min(currentPage * 10, pagination.total)} من {pagination.total} نتيجة
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.pages }, (_, i) => (
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
            
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // التحقق من تحميل الشركات
              if (isLoadingCompanies) {
                toast.error('يرجى انتظار تحميل قائمة الشركات');
                return;
              }
              
              const formData = new FormData(e.currentTarget);
              const companyId = formData.get('companyId');
              
              // التحقق من اختيار الشركة
              if (!companyId) {
                toast.error('يرجى اختيار الشركة');
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
                  {!isLoadingCompanies && (!companiesData?.data?.companies || companiesData.data.companies.length === 0) && (
                    <p className="text-sm text-red-500 mt-1">
                      لا توجد شركات متاحة. يرجى إضافة شركة أولاً.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوحدة
                  </label>
                  <select
                    name="unit"
                    value={createUnit}
                    onChange={(e) => setCreateUnit(e.target.value as 'صندوق' | 'قطعة')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="صندوق">صندوق</option>
                    <option value="قطعة">قطعة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عدد الوحدات في الصندوق
                  </label>
                  <input
                    type="number"
                    name="unitsPerBox"
                    step="0.01"
                    min="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={createUnit !== 'صندوق'}
                    placeholder="مثال: 6 (6 متر في الصندوق)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    سعر البيع
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عدد الصناديق الأولية
                  </label>
                  <input
                    type="number"
                    name="initialBoxes"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    إذا تركت هذا الحقل فارغاً، سيتم إنشاء الصنف بمخزون 0 صندوق
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
              const productData = {
                sku: formData.get('sku') as string,
                name: formData.get('name') as string,
                unit: formData.get('unit') as string || undefined,
                unitsPerBox: formData.get('unitsPerBox') ? Number(formData.get('unitsPerBox')) : undefined,
                sellPrice: formData.get('sellPrice') ? Number(formData.get('sellPrice')) : undefined,
              };
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
                    onChange={(e) => setEditUnit(e.target.value as 'صندوق' | 'قطعة')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="صندوق">صندوق</option>
                    <option value="قطعة">قطعة</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عدد الوحدات في الصندوق
                  </label>
                  <input
                    type="number"
                    name="unitsPerBox"
                    step="0.01"
                    min="0.01"
                    defaultValue={selectedProduct.unitsPerBox || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    disabled={editUnit !== 'صندوق'}
                    placeholder="مثال: 6 (6 وحدات في الصندوق)"
                  />
                </div>
                
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
                    <span>السعر الحالي:</span>
                    <span className="font-medium">{formatArabicCurrency(selectedProduct.price?.sellPrice || 0)}</span>
                  </div>
                  {selectedProduct.unit === 'صندوق' && selectedProduct.unitsPerBox && selectedProduct.price?.sellPrice && (
                    <div className="flex justify-between text-blue-600">
                      <span>السعر لكل متر مربع:</span>
                      <span className="font-medium">
                        {formatArabicCurrency(Number(selectedProduct.price.sellPrice) / Number(selectedProduct.unitsPerBox))}/م²
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
                    السعر الجديد *
                  </label>
                  <input
                    type="number"
                    name="sellPrice"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={selectedProduct.price?.sellPrice || 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="أدخل السعر الجديد"
                  />
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
    </div>
  );
};

export default ProductsPage;
