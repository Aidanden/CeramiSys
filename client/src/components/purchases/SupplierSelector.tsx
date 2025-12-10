'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

interface SupplierSelectorProps {
  suppliers: Supplier[];
  selectedSupplierId: number | undefined;
  onSupplierSelect: (supplierId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  allowEmpty?: boolean;
}

export default function SupplierSelector({
  suppliers,
  selectedSupplierId,
  onSupplierSelect,
  placeholder = "اختر المورد",
  className = "",
  required = false,
  allowEmpty = true
}: SupplierSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState(suppliers);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // تصفية الموردين حسب البحث
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      setFilteredSuppliers(
        suppliers.filter(supplier => 
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.phone && supplier.phone.includes(searchTerm)) ||
          (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, suppliers]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // التركيز على حقل البحث عند فتح القائمة
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedSupplier = suppliers.find(supplier => supplier.id === selectedSupplierId);

  const handleSupplierSelect = (supplier: Supplier | null) => {
    if (supplier === null) {
      // إذا تم اختيار "بدون مورد"، أرسل undefined
      onSupplierSelect(undefined);
    } else {
      // إذا تم اختيار مورد، أرسل id الخاص به
      onSupplierSelect(supplier.id);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* زر فتح القائمة */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        className={`w-full px-3 py-2 text-right border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          selectedSupplierId 
            ? 'border-gray-300 bg-white text-gray-900' 
            : 'border-gray-300 bg-white text-gray-500'
        } ${required && !selectedSupplierId ? 'border-red-300 bg-red-50' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">
            {selectedSupplier ? selectedSupplier.name : placeholder}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* رسالة خطأ للحقول المطلوبة */}
      {required && !selectedSupplierId && (
        <p className="text-xs text-red-600 mt-1">
          ⚠️ يجب اختيار مورد لهذه الفئة
        </p>
      )}

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* حقل البحث */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <svg 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="البحث في الموردين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* قائمة الموردين */}
          <div className="max-h-48 overflow-y-auto">
            {/* خيار فارغ إذا كان مسموحاً */}
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSupplierSelect(null)}
                className={`w-full px-3 py-2 text-right hover:bg-gray-50 transition-colors ${
                  !selectedSupplierId 
                    ? 'bg-gray-100 text-gray-700 font-medium' 
                    : 'text-gray-500'
                }`}
              >
                <div className="italic">-- بدون مورد --</div>
              </button>
            )}

            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSupplierSelect(supplier)}
                  className={`w-full px-3 py-2 text-right hover:bg-blue-50 transition-colors ${
                    selectedSupplierId === supplier.id 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-right">
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.phone && (
                        <div className="text-xs text-gray-500 mt-1">📞 {supplier.phone}</div>
                      )}
                    </div>
                    {selectedSupplierId === supplier.id && (
                      <div className="text-blue-600 mr-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-500">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا توجد موردين متاحين'}
                </div>
                {searchTerm && (
                  <div className="text-xs text-gray-400 mt-1">
                    جرب البحث بكلمات أخرى
                  </div>
                )}
              </div>
            )}
          </div>

          {/* إحصائيات سريعة */}
          {!searchTerm && suppliers.length > 0 && (
            <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
              <div className="text-xs text-gray-600 text-center">
                {suppliers.length} مورد متاح
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
