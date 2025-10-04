"use client";

import React, { useState } from 'react';
import {
  useGetInterCompanySalesQuery,
  useGetInterCompanySalesStatsQuery,
  useCreateInterCompanySaleMutation,
  InterCompanySaleLine,
} from '@/state/interCompanySalesApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCustomersQuery } from '@/state/salesApi';
import { useToast } from '@/components/ui/Toast';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';

const InterCompanySalesPage = () => {
  const { success, error } = useToast();
  
  // States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  // Form states
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [saleType, setSaleType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD'>('CASH');
  const [lines, setLines] = useState<InterCompanySaleLine[]>([]);
  
  // API calls
  const { data: salesData, isLoading: salesLoading, refetch } = useGetInterCompanySalesQuery({
    page: currentPage,
    limit: 10,
    search: searchTerm
  });
  
  const { data: statsData } = useGetInterCompanySalesStatsQuery();
  const { data: productsData } = useGetProductsQuery({ limit: 1000 });
  const { data: customersData } = useGetCustomersQuery({ limit: 1000 });
  const [createSale, { isLoading: isCreating }] = useCreateInterCompanySaleMutation();
  
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
  
  // Remove line
  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };
  
  // Update line
  const handleUpdateLine = (index: number, field: keyof InterCompanySaleLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Calculate subTotal
    if (field === 'qty' || field === 'branchUnitPrice') {
      newLines[index].subTotal = newLines[index].qty * newLines[index].branchUnitPrice;
    }
    
    // Auto-fill parent price when product is selected
    if (field === 'productId') {
      const product = productsData?.data?.products?.find((p: any) => p.id === value);
      if (product?.price?.sellPrice) {
        newLines[index].parentUnitPrice = product.price.sellPrice;
        newLines[index].branchUnitPrice = product.price.sellPrice * 1.2; // 20% markup by default
        newLines[index].subTotal = newLines[index].qty * newLines[index].branchUnitPrice;
      }
    }
    
    setLines(newLines);
  };
  
  // Calculate totals
  const calculateTotals = () => {
    const revenue = lines.reduce((sum, line) => sum + line.subTotal, 0);
    const cost = lines.reduce((sum, line) => sum + (line.qty * line.parentUnitPrice), 0);
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return { revenue, cost, profit, profitMargin };
  };
  
  // Handle create sale
  const handleCreateSale = async () => {
    if (lines.length === 0) {
      error('خطأ', 'يجب إضافة بند واحد على الأقل');
      return;
    }
    
    const invalidLines = lines.filter(line => 
      !line.productId || line.qty <= 0 || line.branchUnitPrice <= 0
    );
    
    if (invalidLines.length > 0) {
      error('خطأ', 'يرجى التأكد من إدخال جميع البيانات بشكل صحيح');
      return;
    }
    
    try {
      await createSale({
        customerId,
        saleType,
        paymentMethod: saleType === 'CASH' ? paymentMethod : undefined,
        lines
      }).unwrap();
      
      success('تم بنجاح', 'تم إنشاء فاتورة المبيعات بين الشركات بنجاح');
      setShowCreateModal(false);
      resetForm();
      refetch();
    } catch (err: any) {
      error('خطأ', err.data?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    }
  };
  
  // Reset form
  const resetForm = () => {
    setCustomerId(undefined);
    setSaleType('CASH');
    setPaymentMethod('CASH');
    setLines([]);
  };
  
  if (salesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  const stats = statsData?.data || {};
  const totals = calculateTotals();
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">المبيعات بين الشركات</h1>
              <p className="text-gray-600">البيع من أصناف الشركة الأم مع هامش ربح</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-gray-900">{formatArabicNumber(stats.totalSales || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">الإيرادات</p>
              <p className="text-2xl font-bold text-green-600">{formatArabicCurrency(stats.totalRevenue || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">التكلفة</p>
              <p className="text-2xl font-bold text-orange-600">{formatArabicCurrency(stats.totalCost || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">الربح</p>
              <p className="text-2xl font-bold text-purple-600">{formatArabicCurrency(stats.totalProfit || 0)}</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
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
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* New Invoice */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            فاتورة جديدة
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
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإيرادات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesData?.data?.sales?.map((sale: any) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.invoiceNumber || `#${sale.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer?.name || 'عميل نقدي'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.createdAt).toLocaleDateString('ar-LY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatArabicCurrency(sale.total)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedSale(sale);
                        setShowDetailsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="عرض التفاصيل"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(!salesData?.data?.sales || salesData.data.sales.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">لا توجد فواتير مبيعات بين الشركات</p>
              <p className="text-gray-400 text-sm mt-2">ابدأ بإنشاء أول فاتورة</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">➕ إنشاء فاتورة مبيعات بين الشركات</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Customer and Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">العميل</label>
                  <select
                    value={customerId || ''}
                    onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">عميل نقدي</option>
                    {customersData?.data?.customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع البيع *</label>
                  <select
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value as 'CASH' | 'CREDIT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">💵 نقدي</option>
                    <option value="CREDIT">📄 آجل</option>
                  </select>
                </div>
                
                {saleType === 'CASH' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'BANK' | 'CARD')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CASH">💵 كاش</option>
                      <option value="BANK">🏦 حوالة بنكية</option>
                      <option value="CARD">💳 بطاقة</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Lines Table */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-lg">الأصناف</h3>
                  <button
                    onClick={handleAddLine}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    <span>➕</span>
                    إضافة صنف
                  </button>
                </div>
                
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">#</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الصنف</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الأم</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">سعر الفرع</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lines.map((line, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{formatArabicNumber(index + 1)}</td>
                          <td className="px-4 py-2">
                            <select
                              value={line.productId}
                              onChange={(e) => handleUpdateLine(index, 'productId', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value={0}>اختر الصنف</option>
                              {productsData?.data?.products?.map((product: any) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => handleUpdateLine(index, 'qty', Number(e.target.value))}
                              className="w-20 px-2 py-1 border rounded text-sm"
                              min="0.01"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.parentUnitPrice}
                              readOnly
                              className="w-24 px-2 py-1 border rounded text-sm bg-gray-50"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={line.branchUnitPrice}
                              onChange={(e) => handleUpdateLine(index, 'branchUnitPrice', Number(e.target.value))}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              min="0.01"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-green-600">
                            {formatArabicCurrency(line.subTotal)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemoveLine(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {lines.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      اضغط "إضافة صنف" لبدء الفاتورة
                    </div>
                  )}
                </div>
              </div>
              
              {/* Totals */}
              {lines.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">الإيرادات</div>
                    <div className="text-xl font-bold text-green-600">{formatArabicCurrency(totals.revenue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">التكلفة</div>
                    <div className="text-xl font-bold text-orange-600">{formatArabicCurrency(totals.cost)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">الربح</div>
                    <div className="text-xl font-bold text-purple-600">{formatArabicCurrency(totals.profit)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">هامش الربح</div>
                    <div className="text-xl font-bold text-blue-600">{totals.profitMargin.toFixed(2)}%</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateSale}
                disabled={isCreating || lines.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreating ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Details Modal - Placeholder */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">تفاصيل الفاتورة</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-center text-gray-500">تفاصيل الفاتورة قيد التطوير...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterCompanySalesPage;
