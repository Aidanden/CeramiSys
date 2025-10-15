"use client";

import React, { useState, useEffect } from 'react';
import { 
  CreateProvisionalSaleRequest,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  Customer
} from '@/state/provisionalSalesApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { formatArabicNumber, formatArabicCurrency } from '@/utils/formatArabicNumbers';
import useNotifications from '@/hooks/useNotifications';

interface CreateProvisionalSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProvisionalSaleRequest) => void;
  isLoading: boolean;
  selectedCompanyId: number | null;
  isSystemUser: boolean;
}

const CreateProvisionalSaleModal: React.FC<CreateProvisionalSaleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  selectedCompanyId,
  isSystemUser
}) => {
  const notifications = useNotifications();
  
  // Form state
  const [formData, setFormData] = useState<CreateProvisionalSaleRequest>({
    customerId: undefined,
    invoiceNumber: '',
    status: 'DRAFT',
    notes: '',
    lines: []
  });

  // UI states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', note: '' });

  // API calls
  const { data: customersData } = useGetCustomersQuery({ limit: 1000 });
  const { data: productsData } = useGetProductsQuery({ limit: 1000 });
  const { data: companiesData } = useGetCompaniesQuery({ limit: 1000 });
  const [createCustomer] = useCreateCustomerMutation();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        customerId: undefined,
        invoiceNumber: '',
        status: 'DRAFT',
        notes: '',
        lines: []
      });
      setProductSearchTerm('');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.lines.length === 0) {
      notifications.custom.error('خطأ', 'يرجى إضافة منتج واحد على الأقل');
      return;
    }

    if (!formData.customerId) {
      notifications.custom.error('خطأ', 'يجب اختيار العميل لإتمام الفاتورة');
      return;
    }

    onSubmit(formData);
  };

  // Add product to form
  const addProduct = (productId: number) => {
    const product = productsData?.data?.find(p => p.id === productId);
    if (!product) return;

    const existingLineIndex = formData.lines.findIndex(line => line.productId === productId);
    
    if (existingLineIndex >= 0) {
      const updatedLines = [...formData.lines];
      updatedLines[existingLineIndex].qty += 1;
      setFormData(prev => ({ ...prev, lines: updatedLines }));
    } else {
      // Get company price for the product
      const companyPrice = product.prices?.find(p => p.companyId === selectedCompanyId);
      const unitPrice = companyPrice?.sellPrice || 0;
      
      setFormData(prev => ({
        ...prev,
        lines: [...prev.lines, { productId, qty: 1, unitPrice }]
      }));
    }
    setProductSearchTerm('');
  };

  // Remove product from form
  const removeProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  // Update line quantity
  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeProduct(index);
      return;
    }
    
    const updatedLines = [...formData.lines];
    updatedLines[index].qty = qty;
    setFormData(prev => ({ ...prev, lines: updatedLines }));
  };

  // Update line price
  const updatePrice = (index: number, unitPrice: number) => {
    const updatedLines = [...formData.lines];
    updatedLines[index].unitPrice = unitPrice;
    setFormData(prev => ({ ...prev, lines: updatedLines }));
  };

  // Create new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomer.name.trim()) {
      notifications.custom.error('خطأ', 'يرجى إدخال اسم العميل');
      return;
    }

    try {
      const result = await createCustomer(newCustomer).unwrap();
      setFormData(prev => ({ ...prev, customerId: result.data.id }));
      setShowCreateCustomerModal(false);
      setNewCustomer({ name: '', phone: '', note: '' });
      notifications.custom.success('نجح', 'تم إضافة العميل بنجاح');
    } catch (error: any) {
      notifications.custom.error('خطأ', error?.data?.message || 'حدث خطأ في إضافة العميل');
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return formData.lines.reduce((total, line) => {
      const product = productsData?.data?.find(p => p.id === line.productId);
      return total + (line.qty * line.unitPrice);
    }, 0);
  };

  // Filter products based on search
  const filteredProducts = productsData?.data?.filter(product => 
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  ).slice(0, 10) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">إضافة فاتورة مبدئية جديدة</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العميل {!formData.customerId && <span className="text-red-600 font-bold">*</span>}
              </label>
              <div className="flex space-x-2 space-x-reverse">
                <select
                  value={formData.customerId || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    customerId: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !formData.customerId && formData.lines.length > 0
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                >
                  <option value="">اختر عميل</option>
                  {customersData?.data?.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `- ${customer.phone}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  إضافة عميل
                </button>
              </div>
              {!formData.customerId && formData.lines.length > 0 && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <span>⚠️</span>
                  <span>يجب اختيار العميل لإتمام الفاتورة</span>
                </p>
              )}
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الفاتورة (اختياري)</label>
              <input
                type="text"
                value={formData.invoiceNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="سيتم إنشاء رقم تلقائياً إذا ترك فارغاً"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">مسودة</option>
                <option value="PENDING">معلقة للمراجعة</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>

          {/* Product Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">إضافة منتج</label>
            <div className="relative">
              <input
                type="text"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="البحث عن منتج بالاسم أو الكود..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {productSearchTerm && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const companyPrice = product.prices?.find(p => p.companyId === selectedCompanyId);
                    const price = companyPrice?.sellPrice || 0;
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product.id)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">كود: {product.sku}</div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatArabicCurrency(price)} ر.س
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Products */}
          {formData.lines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">المنتجات المختارة</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">سعر الوحدة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموع</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.lines.map((line, index) => {
                      const product = productsData?.data?.find(p => p.id === line.productId);
                      const subTotal = line.qty * line.unitPrice;
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product?.name}</div>
                              <div className="text-sm text-gray-500">كود: {product?.sku}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={line.qty}
                              onChange={(e) => updateQuantity(index, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updatePrice(index, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatArabicCurrency(subTotal)} ر.س
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="text-lg font-semibold text-gray-900">
                  الإجمالي: {formatArabicCurrency(calculateTotal())} ر.س
                </div>
              </div>
            </div>
          )}

          {/* تنبيه إذا لم يتم اختيار العميل */}
          {!formData.customerId && formData.lines.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm text-yellow-900 font-bold mb-1">
                    يجب اختيار العميل لإتمام الفاتورة
                  </p>
                  <p className="text-xs text-yellow-800">
                    يمكنك إضافة البنود الآن، لكن لا يمكن حفظ الفاتورة إلا بعد اختيار العميل من القائمة أعلاه.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || formData.lines.length === 0 || !formData.customerId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!formData.customerId ? 'يجب اختيار العميل أولاً' : ''}
            >
              {formData.lines.length === 0
                ? 'أضف بند واحد على الأقل'
                : !formData.customerId
                ? 'يجب اختيار العميل لإتمام الفاتورة'
                : isLoading ? 'جاري الحفظ...' : 'حفظ الفاتورة المبدئية'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">إضافة عميل جديد</h3>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={newCustomer.note}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  إضافة العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProvisionalSaleModal;
