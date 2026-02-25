# إصلاح معاينة وطباعة الفواتير المبدئية

## المشكلة
عند إنشاء فاتورة مبيعات مبدئية ومعاينتها أو طباعتها، كانت تظهر:
- **نوع البيع**: آجل
- **طريقة الدفع**: بطاقة

بدلاً من عرض "**مبدئية**" كنوع للفاتورة.

## الحل المطبق

### 1. تعديل مكون الطباعة `InvoicePrint`

تم تعديل الملف `@/client/src/components/sales/InvoicePrint.tsx` لدعم الفواتير المبدئية:

#### التغييرات:
- **إضافة معامل `isProvisional`** إلى واجهة المكون
- **تعديل عنوان الفاتورة**: يعرض "فاتورة مبيعات مبدئية" باللون البرتقالي عندما `isProvisional = true`
- **تعديل معلومات الفاتورة**: عرض "نوع الفاتورة: مبدئية" بدلاً من نوع البيع وطريقة الدفع

```typescript
interface InvoicePrintProps {
  sale: Sale;
  enableLineDiscount?: boolean;
  enableInvoiceDiscount?: boolean;
  isProvisional?: boolean; // جديد
}
```

#### كيفية الاستخدام:

**للفواتير المبدئية:**
```tsx
<InvoicePrint 
  sale={provisionalSale} 
  isProvisional={true}
  enableLineDiscount={true}
  enableInvoiceDiscount={true}
/>
```

**للفواتير العادية:**
```tsx
<InvoicePrint 
  sale={normalSale} 
  isProvisional={false} // أو حذف المعامل
  enableLineDiscount={true}
  enableInvoiceDiscount={true}
/>
```

### 2. إضافة API للفواتير المبدئية

تم إنشاء `@/client/src/state/provisionalSalesApi.ts` مع جميع الوظائف المطلوبة:

#### الوظائف المتاحة:
- `useGetProvisionalSalesQuery` - جلب قائمة الفواتير المبدئية
- `useGetProvisionalSaleByIdQuery` - جلب فاتورة مبدئية واحدة
- `useCreateProvisionalSaleMutation` - إنشاء فاتورة مبدئية
- `useUpdateProvisionalSaleMutation` - تحديث فاتورة مبدئية
- `useDeleteProvisionalSaleMutation` - حذف فاتورة مبدئية
- `useUpdateProvisionalSaleStatusMutation` - تحديث حالة الفاتورة
- `useConvertProvisionalSaleToSaleMutation` - ترحيل الفاتورة المبدئية إلى فاتورة عادية

#### مثال على الاستخدام:
```tsx
import { useGetProvisionalSalesQuery } from '@/state/provisionalSalesApi';

const { data, isLoading } = useGetProvisionalSalesQuery({
  page: 1,
  limit: 20,
  companyId: 2,
  status: 'APPROVED'
});
```

### 3. تكامل Redux Store

تم إضافة `provisionalSalesApi` إلى Redux store في `@/client/src/app/redux.tsx`:
- إضافة الـ reducer
- إضافة الـ middleware

## التحديثات من شاشة المحاسب

عند ترحيل فاتورة مبدئية إلى فاتورة عادية من شاشة المحاسب:

### Backend (`ProvisionalSalesService.convertToSale`)
1. يتم إنشاء فاتورة مبيعات عادية جديدة
2. يتم تحديد `saleType` و `paymentMethod` في الفاتورة الجديدة
3. يتم تحديث الفاتورة المبدئية:
   - `isConverted = true`
   - `convertedSaleId` = معرف الفاتورة الجديدة
   - `status = 'CONVERTED'`

### الاستخدام:
```tsx
const [convertToSale] = useConvertProvisionalSaleToSaleMutation();

await convertToSale({
  id: provisionalSaleId,
  data: {
    saleType: 'CASH', // أو 'CREDIT'
    paymentMethod: 'CASH' // أو 'BANK' أو 'CARD'
  }
});
```

## ملاحظات مهمة

### 1. الفواتير المبدئية قبل الترحيل
- يجب استخدام `isProvisional={true}` عند طباعة أو معاينة الفاتورة
- لا تحتوي على `saleType` أو `paymentMethod`
- الحالة: `DRAFT`, `PENDING`, `APPROVED`, أو `CANCELLED`

### 2. الفواتير المبدئية بعد الترحيل
- يتم إنشاء فاتورة مبيعات عادية جديدة
- الفاتورة الجديدة تحتوي على `saleType` و `paymentMethod`
- الفاتورة المبدئية تصبح `CONVERTED` ولا يمكن تعديلها

### 3. خصم المخزون
- **لا يتم خصم المخزون** عند إنشاء الفاتورة المبدئية
- **لا يتم خصم المخزون** عند ترحيل الفاتورة المبدئية
- **يتم خصم المخزون فقط** عند اعتماد الفاتورة العادية من المحاسب

## مثال كامل لواجهة الفواتير المبدئية

```tsx
'use client';

import React, { useState } from 'react';
import { useGetProvisionalSalesQuery } from '@/state/provisionalSalesApi';
import { InvoicePrint } from '@/components/sales/InvoicePrint';
import { PrintModal } from '@/components/sales/PrintModal';

export default function ProvisionalSalesPage() {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const { data, isLoading } = useGetProvisionalSalesQuery({
    page: 1,
    limit: 20,
  });

  const handlePrint = (sale) => {
    setSelectedSale(sale);
    setShowPrintModal(true);
  };

  return (
    <div>
      {/* قائمة الفواتير */}
      {data?.provisionalSales.map((sale) => (
        <div key={sale.id}>
          <button onClick={() => handlePrint(sale)}>
            طباعة
          </button>
        </div>
      ))}

      {/* مودال الطباعة */}
      {showPrintModal && selectedSale && (
        <div>
          <InvoicePrint 
            sale={selectedSale} 
            isProvisional={true}
          />
        </div>
      )}
    </div>
  );
}
```

## الملفات المعدلة

### Frontend:
1. ✅ `@/client/src/components/sales/InvoicePrint.tsx` - تعديل لدعم الفواتير المبدئية
2. ✅ `@/client/src/state/provisionalSalesApi.ts` - إنشاء API جديد
3. ✅ `@/client/src/app/redux.tsx` - إضافة API إلى Store

### Backend:
- لا توجد تعديلات مطلوبة - النظام موجود ويعمل بشكل صحيح

## الخطوات التالية

لإكمال النظام، يجب:

1. **إنشاء واجهة كاملة للفواتير المبدئية** في `@/client/src/app/provisional-sales/page.tsx`
2. **إضافة مكون PrintModal** خاص بالفواتير المبدئية
3. **إضافة رابط في Sidebar** للوصول إلى شاشة الفواتير المبدئية
4. **تكامل مع شاشة المحاسب** لترحيل الفواتير المبدئية

## الخلاصة

✅ **تم إصلاح مشكلة عرض نوع البيع وطريقة الدفع في الفواتير المبدئية**

الآن عند معاينة أو طباعة فاتورة مبدئية، ستظهر:
- **العنوان**: "فاتورة مبيعات مبدئية" (باللون البرتقالي)
- **نوع الفاتورة**: مبدئية (باللون البرتقالي والخط العريض)

بدلاً من عرض نوع البيع وطريقة الدفع الخاطئة.
