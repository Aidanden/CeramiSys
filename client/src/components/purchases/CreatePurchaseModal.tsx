"use client";

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/app/redux';
import { 
  useCreatePurchaseMutation,
  useGetSuppliersQuery,
  CreatePurchaseRequest
} from '@/state/purchaseApi';
import { useGetProductsQuery } from '@/state/productsApi';
import { useToast } from '@/components/ui/Toast';

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedCompanyId: number | null;
}

interface PurchaseLine {
  productId: number;
  qty: number;
  unitPrice: number;
  subTotal: number;
}

const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedCompanyId
}) => {
  const toast = useToast();
  
  // Local state
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseType: 'CASH' as 'CASH' | 'CREDIT',
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'CARD',
  });
  
  const [lines, setLines] = useState<PurchaseLine[]>([
    { productId: 0, qty: 1, unitPrice: 0, subTotal: 0 }
  ]);

  // RTK Query hooks
  const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });
  const { data: productsData } = useGetProductsQuery({ 
    companyId: selectedCompanyId || undefined,
    limit: 100 
  });
  const [createPurchase, { isLoading }] = useCreatePurchaseMutation();

  // Calculate total
  const total = lines.reduce((sum, line) => sum + line.subTotal, 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      toast.error('خطأ', 'يجب اختيار الشركة أولاً');
      return;
    }

    if (lines.some(line => line.productId === 0 || line.qty <= 0 || line.unitPrice <= 0)) {
      toast.error('خطأ', 'يرجى ملء جميع بيانات الأصناف بشكل صحيح');
      return;
    }

    try {
      const purchaseData: CreatePurchaseRequest = {
        companyId: selectedCompanyId,
        supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        purchaseType: formData.purchaseType,
        paymentMethod: formData.purchaseType === 'CASH' ? formData.paymentMethod : undefined,
        lines: lines.map(line => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
        })),
      };

      await createPurchase(purchaseData).unwrap();
      toast.success('تم بنجاح!', 'تم إنشاء فاتورة المشتريات بنجاح');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('خطأ في إنشاء فاتورة المشتريات:', error);
      
      if (error?.data?.message) {
        toast.error('خطأ في العملية', error.data.message);
      } else {
        toast.error('خطأ غير متوقع', 'حدث خطأ في إنشاء فاتورة المشتريات');
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplierId: '',
      invoiceNumber: '',
      purchaseType: 'CASH',
      paymentMethod: 'CASH',
    });
    setLines([{ productId: 0, qty: 1, unitPrice: 0, subTotal: 0 }]);
  };

  // Add new line
  const addLine = () => {
    setLines([...lines, { productId: 0, qty: 1, unitPrice: 0, subTotal: 0 }]);
  };

  // Remove line
  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  // Update line
  const updateLine = (index: number, field: keyof PurchaseLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Calculate subTotal
    if (field === 'qty' || field === 'unitPrice') {
      newLines[index].subTotal = newLines[index].qty * newLines[index].unitPrice;
    }
    
    setLines(newLines);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">إنشاء فاتورة مشتريات جديدة</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المورد
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                >
                  <option value="">اختر المورد</option>
                  {suppliersData?.data?.suppliers?.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الفاتورة
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                  placeholder="رقم الفاتورة (اختياري)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الشراء
                </label>
                <select
                  value={formData.purchaseType}
                  onChange={(e) => setFormData({ ...formData, purchaseType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                >
                  <option value="CASH">نقدي</option>
                  <option value="CREDIT">آجل</option>
                </select>
              </div>

              {formData.purchaseType === 'CASH' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة الدفع
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                  >
                    <option value="CASH">نقد</option>
                    <option value="BANK">بنك</option>
                    <option value="CARD">بطاقة</option>
                  </select>
                </div>
              )}
            </div>

            {/* Purchase Lines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">أصناف المشتريات</h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  إضافة صنف
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الصنف
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => updateLine(index, 'productId', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      >
                        <option value={0}>اختر الصنف</option>
                        {productsData?.products?.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.sku}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الكمية
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.qty}
                        onChange={(e) => updateLine(index, 'qty', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        سعر الوحدة
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المجموع
                      </label>
                      <input
                        type="number"
                        value={line.subTotal}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-lg bg-gray-50 dark:bg-surface-elevated text-slate-800 dark:text-text-primary outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">المجموع الكلي:</span>
                <span className="text-xl font-bold text-green-600">
                  {total.toLocaleString('ar-LY')} د.ل
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseModal;
