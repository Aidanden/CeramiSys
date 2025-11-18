# اختبار وظائف الطباعة

## المشكلة المحتملة
الطباعة لا تعمل - قد يكون السبب:

1. **Pop-up Blocker**: المتصفح يمنع النوافذ المنبثقة
2. **استيراد الدوال**: كانت هناك مشكلة في استيراد `formatLibyanCurrencyArabic`

## الحلول المطبقة

### 1. إضافة `formatLibyanCurrencyArabic` إلى utils
```typescript
// في /client/src/utils/formatLibyanNumbers.ts
export const formatLibyanCurrencyArabic = (amount: number): string => {
  const formattedAmount = formatEnglishNumber(amount);
  return `${formattedAmount} د.ل`;
};
```

### 2. تحديث الاستيراد في page.tsx
```typescript
import { formatLibyanCurrencyArabic } from '@/utils/formatLibyanNumbers';
```

### 3. تحديث printUtils.ts
```typescript
import { formatLibyanCurrencyArabic, formatEnglishDate } from './formatLibyanNumbers';
```

## خطوات الاختبار

### اختبار 1: الطباعة التلقائية
1. اذهب إلى شاشة إيصالات الدفع
2. اختر إيصال معلق (PENDING)
3. اضغط على زر التسديد (Pay)
4. يجب أن تفتح نافذة طباعة تلقائياً بعد ثانية واحدة

### اختبار 2: الطباعة اليدوية
1. اضغط على زر "طباعة إيصالات" في الهيدر
2. يجب أن يفتح مودال يعرض جميع الإيصالات المدفوعة
3. اضغط على زر "طباعة إيصال كامل" بجانب أي إيصال
4. يجب أن تفتح نافذة الطباعة

### اختبار 3: طباعة الدفعات الجزئية
1. اختر إيصال معلق (PENDING)
2. اضغط على أيقونة "دفعات جزئية" (المحفظة الخضراء)
3. أضف دفعة جزئية
4. في جدول الدفعات، اضغط على أيقونة الطباعة بجانب أي دفعة
5. يجب أن تفتح نافذة الطباعة

## ملاحظات مهمة

### إذا لم تعمل الطباعة:
1. **تحقق من Pop-up Blocker**: 
   - افتح إعدادات المتصفح
   - اسمح بالنوافذ المنبثقة لهذا الموقع
   
2. **تحقق من Console**:
   - افتح Developer Tools (F12)
   - تحقق من وجود أخطاء في Console
   
3. **تحقق من الشبكة**:
   - تأكد من أن البيانات تُحمّل بشكل صحيح
   - تحقق من أن `receipt.supplier.name` موجود

### رسالة الخطأ المحتملة
إذا ظهرت رسالة "يرجى السماح بفتح النوافذ المنبثقة للطباعة"، فهذا يعني:
- المتصفح يمنع النوافذ المنبثقة
- يجب السماح بها في إعدادات المتصفح

## البيانات المطلوبة للطباعة

### للإيصال الكامل:
```typescript
{
  id: number,
  supplier: { name: string },
  amount: number,
  paidAmount: number,
  remainingAmount: number,
  status: string,
  type: string,
  purchase?: { invoiceNumber: string, id: number },
  paidAt?: string,
  createdAt: string
}
```

### للدفعة الجزئية:
```typescript
{
  amount: number,
  paidAt: string,
  paymentMethod?: string,
  referenceNumber?: string,
  notes?: string
}
```
