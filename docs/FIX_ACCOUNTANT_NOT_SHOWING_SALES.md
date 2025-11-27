# إصلاح: الفواتير لا تظهر في شاشة المحاسب

## 🔍 المشكلة

عند إضافة فاتورة مبيعات جديدة، لم تكن تظهر في شاشة المحاسب!

### السيناريو:
```
1️⃣ المستخدم ينشئ فاتورة مبيعات جديدة
   ↓
2️⃣ الفاتورة تُنشأ بنجاح في قاعدة البيانات
   ↓
3️⃣ يذهب إلى شاشة المحاسب
   ↓
4️⃣ ❌ الفاتورة لا تظهر!
```

---

## 🔍 السبب الجذري

### **المشكلة الرئيسية:**
```tsx
// ❌ في client/src/app/accountant/page.tsx:
const { data: salesData } = useGetCashSalesQuery({
  companyId: activeCompanyId,
  // ...
});
```

**`useGetCashSalesQuery`** تجلب فقط الفواتير النقدية (`saleType: 'CASH'`)

**لكن:** بعد التعديلات الأخيرة، جميع الفواتير الآن آجلة (`saleType: 'CREDIT'`) بشكل افتراضي!

### **النتيجة:**
```
Query يبحث عن: saleType = 'CASH'
الفواتير في DB: saleType = 'CREDIT'
  ↓
❌ لا توجد نتائج!
```

---

## ✅ الإصلاح

### **1. تغيير API Endpoint في Frontend:**

#### **الملف:** `client/src/app/accountant/page.tsx`

**قبل:**
```tsx
// ❌ يجلب فقط CASH sales
import { useGetCashSalesQuery, ... } from '@/state/salesApi';

const { data: salesData } = useGetCashSalesQuery({
  companyId: activeCompanyId,
  // ...
});
```

**بعد:**
```tsx
// ✅ يجلب جميع الفواتير (CASH + CREDIT)
import { useGetSalesQuery, useGetCashSalesQuery, ... } from '@/state/salesApi';

const { data: salesData } = useGetSalesQuery({
  companyId: activeCompanyId,
  // ...
});
```

### **2. تحديث جميع الاستدعاءات:**

تم تغيير **3 استدعاءات** من `useGetCashSalesQuery` إلى `useGetSalesQuery`:

#### **أ) الاستدعاء الرئيسي (جلب الفواتير):**
```tsx
// السطر 85-105
const { data: salesData } = useGetSalesQuery({
  page: currentPage,
  limit: 10,
  search: searchTerm || undefined,
  companyId: activeCompanyId, // ✅
  receiptIssued: getReceiptIssuedFilter(),
  startDate: startDate || undefined,
  endDate: endDate || undefined
});
```

#### **ب) الفواتير المعلقة (للإحصائيات):**
```tsx
// السطر 107-122
const { data: pendingData } = useGetSalesQuery({
  page: 1,
  limit: 1000,
  companyId: activeCompanyId, // ✅
  receiptIssued: false,
  startDate: startDate || undefined,
  endDate: endDate || undefined
});
```

#### **ج) الفواتير المصدرة (للإحصائيات):**
```tsx
// السطر 124-139
const { data: issuedData } = useGetSalesQuery({
  page: 1,
  limit: 1000,
  companyId: activeCompanyId, // ✅
  receiptIssued: true,
  startDate: startDate || undefined,
  endDate: endDate || undefined
});
```

---

### **3. إضافة دعم `companyId` في Backend:**

#### **الملف:** `server/src/dto/salesDto.ts`

**قبل:**
```typescript
export const GetSalesQueryDtoSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  customerId: z.union([...]).optional(),
  // ❌ لا يوجد companyId
  saleType: z.union([...]).optional(),
  // ...
});
```

**بعد:**
```typescript
export const GetSalesQueryDtoSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  customerId: z.union([...]).optional(),
  companyId: z.union([  // ✅ إضافة companyId
    z.string().transform(val => val === '' ? undefined : Number(val)).pipe(z.number().int().positive()),
    z.literal('').transform(() => undefined)
  ]).optional(),
  saleType: z.union([...]).optional(),
  // ...
});
```

---

### **4. استخدام `companyId` في الفلترة:**

#### **الملف:** `server/src/services/SalesService.ts`

**قبل:**
```typescript
async getSales(query: GetSalesQueryDto, userCompanyId: number, isSystemUser: boolean) {
  const where: any = {
    ...(isSystemUser !== true && { companyId: userCompanyId })
  };

  // ❌ لا يستخدم query.companyId

  if (query.customerId) {
    where.customerId = query.customerId;
  }
  // ...
}
```

**بعد:**
```typescript
async getSales(query: GetSalesQueryDto, userCompanyId: number, isSystemUser: boolean) {
  const where: any = {
    ...(isSystemUser !== true && { companyId: userCompanyId })
  };

  // ✅ إذا تم تحديد companyId في الـ query، استخدمه
  if (query.companyId) {
    where.companyId = query.companyId;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }
  // ...
}
```

---

## 🎯 كيف يعمل الآن؟

### **السيناريو بعد الإصلاح:**
```
1️⃣ المستخدم ينشئ فاتورة مبيعات
   - saleType: 'CREDIT' ✅
   - status: 'DRAFT' ✅
   - companyId: 2 (الإمارات)
   ↓
2️⃣ المحاسب يفتح شاشته
   ↓
3️⃣ يختار tab "الإمارات"
   - activeCompanyId = 2
   ↓
4️⃣ useGetSalesQuery يرسل طلب:
   GET /api/sales?companyId=2
   ↓
5️⃣ Backend يفلتر:
   WHERE companyId = 2
   ↓
6️⃣ ✅ الفاتورة تظهر في شاشة المحاسب!
```

---

## 📋 ملخص التغييرات

### **Frontend:**
| الملف | التغيير | السبب |
|------|---------|--------|
| `accountant/page.tsx` | `useGetCashSalesQuery` → `useGetSalesQuery` | لجلب جميع الفواتير (ليس فقط CASH) |
| `accountant/page.tsx` | 3 استدعاءات تم تحديثها | الرئيسي + معلقة + مصدرة |

### **Backend:**
| الملف | التغيير | السبب |
|------|---------|--------|
| `dto/salesDto.ts` | إضافة `companyId` | لدعم الفلترة حسب الشركة |
| `SalesService.ts` | استخدام `query.companyId` | لتطبيق الفلترة |

---

## 🔍 الفرق بين `useGetSalesQuery` و `useGetCashSalesQuery`

### **`useGetCashSalesQuery`:**
```typescript
// في salesApi.ts
getCashSales: builder.query<SalesResponse, SalesQueryParams>({
  query: (params = {}) => {
    const searchParams = new URLSearchParams();
    // ❌ يضيف saleType=CASH تلقائياً
    searchParams.append('saleType', 'CASH');
    // ...
    return `/sales?${searchParams.toString()}`;
  }
})
```

### **`useGetSalesQuery`:**
```typescript
// في salesApi.ts
getSales: builder.query<SalesResponse, SalesQueryParams>({
  query: (params = {}) => {
    const searchParams = new URLSearchParams();
    // ✅ لا يضيف saleType - يجلب الكل
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return `/sales?${searchParams.toString()}`;
  }
})
```

---

## ✅ النتيجة النهائية

### **قبل الإصلاح:**
```
❌ الفواتير لا تظهر في شاشة المحاسب
❌ useGetCashSalesQuery يبحث عن CASH
❌ جميع الفواتير CREDIT
❌ لا توجد نتائج
```

### **بعد الإصلاح:**
```
✅ الفواتير تظهر في شاشة المحاسب
✅ useGetSalesQuery يجلب جميع الفواتير
✅ الفلترة حسب الشركة تعمل
✅ النتائج صحيحة
```

---

## 📁 الملفات المعدلة

```
✅ client/src/app/accountant/page.tsx
   - السطر 4: إضافة useGetSalesQuery للـ imports
   - السطر 85-105: تغيير useGetCashSalesQuery → useGetSalesQuery
   - السطر 107-122: تغيير useGetCashSalesQuery → useGetSalesQuery
   - السطر 124-139: تغيير useGetCashSalesQuery → useGetSalesQuery

✅ server/src/dto/salesDto.ts
   - السطر 56-59: إضافة companyId إلى GetSalesQueryDtoSchema

✅ server/src/services/SalesService.ts
   - السطر 162-165: استخدام query.companyId في الفلترة
```

---

## 📊 حالة النظام

```
✅ Frontend: يستخدم useGetSalesQuery
✅ Backend: يدعم companyId filter
✅ الفواتير تظهر في شاشة المحاسب
✅ الفلترة حسب الشركة تعمل
✅ No errors
✅ Ready to use! 🎊
```

---

**تاريخ التحديث:** 5 نوفمبر 2025  
**الحالة:** ✅ تم الإصلاح والاختبار  
**التأثير:** 🔧 إصلاح مشكلة عدم ظهور الفواتير في شاشة المحاسب

