# إصلاح: companyId مفقود في Controller

## 🔴 المشكلة الحقيقية

**المستخدم أبلغ:** "جميع فواتير التقازي والإمارات تظهر في كل tab!"

### التشخيص:

```
❌ الأعراض:
- فواتير التقازي تظهر في tab الإمارات
- فواتير الإمارات تظهر في tab التقازي
- جميع الفواتير تظهر في كل مكان

🔍 السبب الجذري:
- Frontend يرسل: ?companyId=1
- Backend Controller لا يقرأ companyId من req.query! ❌
- Backend Service لا يستقبل companyId في query object
- الفلتر لا يعمل أبداً
```

---

## 📋 تتبع المشكلة

### **1. Frontend (✅ صحيح)**

```typescript
// client/src/app/accountant/page.tsx
const { data: salesData } = useGetSalesQuery({
  companyId: activeCompanyId, // ✅ يرسل companyId
  page: currentPage,
  limit: 10,
  // ...
});

// Request URL:
// GET /api/sales?companyId=1&page=1&limit=10
```

### **2. Backend Controller (❌ خطأ - تم إصلاحه)**

#### قبل:
```typescript
// server/src/controllers/SalesController.ts
async getSales(req: Request, res: Response): Promise<void> {
  try {
    const query: GetSalesQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      search: req.query.search as string,
      customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      // ❌ لا يوجد companyId!
      saleType: req.query.saleType as any,
      paymentMethod: req.query.paymentMethod as any,
      // ...
    };
    
    // query.companyId = undefined دائماً!
    const result = await this.salesService.getSales(query, userCompanyId, isSystemUser);
```

**المشكلة:**
- `req.query.companyId` موجود (من الـ URL)
- لكن لا يتم قراءته ووضعه في `query` object
- `query.companyId` دائماً `undefined`

#### بعد:
```typescript
// server/src/controllers/SalesController.ts
async getSales(req: Request, res: Response): Promise<void> {
  try {
    const query: GetSalesQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      search: req.query.search as string,
      customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
      companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined, // ✅ إضافة!
      saleType: req.query.saleType as any,
      paymentMethod: req.query.paymentMethod as any,
      // ...
    };
    
    // الآن query.companyId = 1 أو 2 حسب الطلب
    const result = await this.salesService.getSales(query, userCompanyId, isSystemUser);
```

### **3. Backend Service (✅ كان صحيحاً)**

```typescript
// server/src/services/SalesService.ts
async getSales(query: GetSalesQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
  // بناء شروط البحث
  const where: any = {
    ...(isSystemUser !== true && { companyId: userCompanyId })
  };

  // إذا تم تحديد companyId في الـ query، استخدمه
  if (query.companyId) { // ← هذا الشرط لم يكن يتحقق أبداً!
    where.companyId = query.companyId;
    console.log('🔍 فلترة الفواتير حسب الشركة:', query.companyId);
  }
  
  // جلب الفواتير
  const sales = await this.prisma.sale.findMany({
    where, // ← الآن where.companyId موجود!
    // ...
  });
```

**التحليل:**
- الكود كان صحيحاً
- لكن `query.companyId` كان دائماً `undefined`
- لذلك الشرط `if (query.companyId)` لم يتحقق أبداً
- الفلتر لم يعمل

---

## 🔧 الإصلاح

### **الملف:** `server/src/controllers/SalesController.ts`

**التغيير الوحيد:**
```diff
async getSales(req: Request, res: Response): Promise<void> {
  try {
    const query: GetSalesQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      search: req.query.search as string,
      customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
+     companyId: req.query.companyId ? parseInt(req.query.companyId as string) : undefined,
      saleType: req.query.saleType as any,
      paymentMethod: req.query.paymentMethod as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      receiptIssued: req.query.receiptIssued === 'true' ? true : req.query.receiptIssued === 'false' ? false : undefined,
      todayOnly: req.query.todayOnly === 'true' ? true : req.query.todayOnly === 'false' ? false : undefined,
    };
```

**سطر واحد فقط!** ✅

### **تحسينات إضافية:**

#### **الملف:** `server/src/services/SalesService.ts`

```typescript
// إذا تم تحديد companyId في الـ query، استخدمه (للمحاسب: فلتر حسب الشركة)
if (query.companyId) {
  where.companyId = query.companyId;
  console.log('🔍 فلترة الفواتير حسب الشركة:', query.companyId); // ✅ log للتتبع
}

// ...

// Debug: عرض الشركات في النتائج
if (query.companyId) {
  const companies = [...new Set(sales.map(s => s.companyId))];
  console.log(`✅ النتيجة: ${sales.length} فاتورة، الشركات: [${companies.join(', ')}]`);
}
```

---

## 🔄 التدفق الكامل بعد الإصلاح

```
1️⃣ Frontend:
   - المستخدم ينقر على tab "التقازي"
   - activeCompanyId = 1
   - useGetSalesQuery({ companyId: 1, ... })
   
   📤 HTTP Request:
   GET /api/sales?companyId=1&page=1&limit=10
   
   ↓

2️⃣ Backend Controller (SalesController.ts):
   - req.query.companyId = "1" (string)
   - query.companyId = parseInt("1") = 1 ✅
   - يستدعي: salesService.getSales(query, ...)
   
   ↓

3️⃣ Backend Service (SalesService.ts):
   - query.companyId = 1 ✅
   - if (query.companyId) ← true ✅
   - where.companyId = 1
   - console.log('🔍 فلترة الفواتير حسب الشركة: 1')
   
   ↓

4️⃣ Database Query:
   SELECT * FROM "Sale" 
   WHERE "companyId" = 1
   ORDER BY "createdAt" DESC
   LIMIT 10;
   
   ✅ فقط فواتير التقازي!
   
   ↓

5️⃣ Response:
   {
     success: true,
     data: {
       sales: [
         { id: 1, companyId: 1, invoiceNumber: "INV-001", ... },
         { id: 2, companyId: 1, invoiceNumber: "INV-002", ... },
         { id: 3, companyId: 1, invoiceNumber: "INV-003", ... }
       ],
       pagination: { ... }
     }
   }
   
   console.log: ✅ النتيجة: 3 فاتورة، الشركات: [1]
   
   ↓

6️⃣ Frontend:
   - sales = [فاتورة 1، فاتورة 2، فاتورة 3]
   - جميعها companyId: 1 ✅
   - تظهر في tab التقازي فقط ✅
```

---

## 📊 Console Logs المتوقعة

### **عند النقر على tab "التقازي":**

```
🔄 تغيير الشركة النشطة: 1
🔍 فلترة الفواتير حسب الشركة: 1
✅ النتيجة: 5 فاتورة، الشركات: [1]
📊 الفواتير المحملة: {
  activeCompanyId: 1,
  totalSales: 5,
  companies: [1],
  sales: [
    { id: 1, companyId: 1, invoice: "INV-001" },
    { id: 2, companyId: 1, invoice: "INV-002" },
    { id: 3, companyId: 1, invoice: "INV-003" },
    { id: 4, companyId: 1, invoice: "INV-004" },
    { id: 5, companyId: 1, invoice: "INV-005" }
  ]
}
```

### **عند النقر على tab "الإمارات":**

```
🔄 تغيير الشركة النشطة: 2
🔍 فلترة الفواتير حسب الشركة: 2
✅ النتيجة: 3 فاتورة، الشركات: [2]
📊 الفواتير المحملة: {
  activeCompanyId: 2,
  totalSales: 3,
  companies: [2],
  sales: [
    { id: 6, companyId: 2, invoice: "INV-006" },
    { id: 7, companyId: 2, invoice: "INV-007" },
    { id: 8, companyId: 2, invoice: "INV-008" }
  ]
}
```

---

## ✅ التحقق من الإصلاح

### **اختبار 1: tab التقازي**
```
1. افتح شاشة المحاسب
2. تأكد أن tab "التقازي" نشط
3. افحص Console:
   ✅ يجب أن ترى: "فلترة الفواتير حسب الشركة: 1"
   ✅ يجب أن ترى: "النتيجة: X فاتورة، الشركات: [1]"
4. تحقق من الجدول:
   ✅ جميع الفواتير المعروضة من شركة "التقازي"
```

### **اختبار 2: tab الإمارات**
```
1. انقر على tab "الإمارات"
2. افحص Console:
   ✅ يجب أن ترى: "تغيير الشركة النشطة: 2"
   ✅ يجب أن ترى: "فلترة الفواتير حسب الشركة: 2"
   ✅ يجب أن ترى: "النتيجة: X فاتورة، الشركات: [2]"
3. تحقق من الجدول:
   ✅ جميع الفواتير المعروضة من شركة "الإمارات"
   ❌ لا توجد فواتير من "التقازي"
```

---

## 🎯 الخلاصة

| الموضوع | قبل | بعد |
|---------|-----|-----|
| **companyId في Controller** | ❌ مفقود | ✅ موجود |
| **query.companyId في Service** | undefined | 1 أو 2 ✅ |
| **الفلتر في Database** | ❌ لا يعمل | ✅ يعمل |
| **فواتير التقازي في tab التقازي** | ❌ + فواتير الإمارات | ✅ فقط التقازي |
| **فواتير الإمارات في tab الإمارات** | ❌ + فواتير التقازي | ✅ فقط الإمارات |

---

## 📁 الملفات المعدلة

```
✅ server/src/controllers/SalesController.ts
   - السطر 122: إضافة companyId في query object
   
✅ server/src/services/SalesService.ts
   - السطر 165: إضافة console.log للتتبع
   - السطر 247: إضافة console.log لعرض النتائج
```

---

## 💡 الدرس المستفاد

```
❌ الخطأ الشائع:
  - افتراض أن جميع query parameters تُقرأ تلقائياً
  - نسيان إضافة parameter جديد في Controller

✅ الحل:
  - تأكد من قراءة جميع query parameters في Controller
  - أضف console.log للتتبع والـ debugging
  - اختبر الـ API مباشرة قبل اللوم على Frontend!
```

---

## 🔍 Debug Checklist

عند حدوث مشكلة مشابهة:

```
□ 1. افحص Network tab في المتصفح
     - هل يتم إرسال companyId في URL؟
     
□ 2. افحص Controller
     - هل يتم قراءة companyId من req.query؟
     
□ 3. افحص Service
     - هل يتم استقبال companyId في query object؟
     - هل الشرط if (query.companyId) يتحقق؟
     
□ 4. افحص Database Query
     - هل where.companyId موجود في الـ query؟
     
□ 5. افحص Response
     - هل النتائج مفلترة بشكل صحيح؟
```

---

**تاريخ التحديث:** 5 نوفمبر 2025  
**الحالة:** ✅ تم الإصلاح بنجاح  
**التأثير:** 🐛 إصلاح الفلترة - **سطر واحد فقط!**

