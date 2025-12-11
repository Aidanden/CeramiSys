'use client';

import React from 'react';
import { PurchaseExpenseCategory } from '@/state/api/purchaseExpenseApi';

interface ExpenseCategorySelectorProps {
  categories: PurchaseExpenseCategory[];
  selectedCategoryId: number;
  onCategorySelect: (categoryId: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function ExpenseCategorySelector({
  categories,
  selectedCategoryId,
  onCategorySelect,
  placeholder = "اختر فئة المصروف",
  className = "",
  required = false
}: ExpenseCategorySelectorProps) {

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      // إذا تم اختيار البند الافتراضي، أرسل 0
      onCategorySelect(0);
    } else {
      const categoryId = parseInt(value);
      // تأكد من أن القيمة صحيحة قبل الإرسال
      if (!isNaN(categoryId) && categoryId > 0) {
        onCategorySelect(categoryId);
      }
    }
  };

  // فلترة الفئات النشطة فقط
  const activeCategories = categories.filter(cat => cat.isActive);

  return (
    <div className={className}>
      <select
        value={selectedCategoryId === 0 ? '' : selectedCategoryId}
        onChange={handleSelectChange}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          required && !selectedCategoryId ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        required={required}
      >
        <option value="">
          {placeholder}
        </option>
        {activeCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {category.suppliers && category.suppliers.length > 0 
              ? ` (${category.suppliers.length} مورد)` 
              : ' (بدون موردين)'
            }
          </option>
        ))}
      </select>

      {/* رسالة خطأ للحقول المطلوبة */}
      {required && !selectedCategoryId && (
        <p className="text-xs text-red-600 mt-1">
          ⚠️ يجب اختيار فئة المصروف
        </p>
      )}
    </div>
  );
}
