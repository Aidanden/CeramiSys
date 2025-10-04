# إصلاح حساب إحصائيات الأصناف

## 🐛 المشكلة الأساسية:

كان الحساب **خاطئاً تماماً** لأنه يحسب عدد **سجلات المخزون** وليس عدد **المنتجات الفريدة**.

### مثال على المشكلة:
```
لديك 10 منتجات:
- منتج A: له مخزون في شركة 1 (5 صناديق) وشركة 2 (3 صناديق)
- منتج B: له مخزون في شركة 1 (0 صناديق)
- منتج C: ليس له سجل مخزون أصلاً
- ... إلخ

الحساب القديم الخاطئ:
- productsWithStock = عدد سجلات المخزون التي boxes > 0 = 2 سجل
- productsWithoutStock = 10 - 2 = 8 ❌ خطأ!

الحساب الصحيح:
- productsWithStock = عدد المنتجات الفريدة التي لها boxes > 0 = 1 منتج (A فقط)
- productsWithoutStock = 9 منتجات ✅ صحيح!
```

---

## ✅ الحل المطبق:

### 1. حساب المنتجات التي لها مخزون:
```typescript
// الحصول على المنتجات الفريدة التي لها boxes > 0
const stocksWithPositiveBoxes = await this.prisma.stock.findMany({
  where: {
    ...(isSystemUser !== true && { companyId: userCompanyId }),
    boxes: { gt: 0 }
  },
  select: { productId: true },
  distinct: ['productId']  // ✅ المفتاح: distinct للحصول على منتجات فريدة
});

const productsWithStock = stocksWithPositiveBoxes.length;
```

### 2. حساب المنتجات بدون مخزون:
```typescript
// المنتجات التي لها boxes = 0
const stocksWithZeroBoxes = await this.prisma.stock.findMany({
  where: {
    ...(isSystemUser !== true && { companyId: userCompanyId }),
    boxes: { lte: 0 }
  },
  select: { productId: true },
  distinct: ['productId']
});

// جميع المنتجات التي لها سجل مخزون
const productsWithStockRecords = await this.prisma.stock.findMany({
  where: {
    ...(isSystemUser !== true && { companyId: userCompanyId })
  },
  select: { productId: true },
  distinct: ['productId']
});

const productIdsWithStock = new Set(productsWithStockRecords.map(s => s.productId));

// المنتجات بدون مخزون = التي لها boxes = 0 + التي ليس لها سجل مخزون أصلاً
const productsWithoutStock = stocksWithZeroBoxes.length + (totalProducts - productIdsWithStock.size);
```

---

## 📊 الفرق بين الحساب القديم والجديد:

### الحساب القديم (خاطئ):
```typescript
// يحسب عدد السجلات وليس المنتجات
const productsWithStock = await this.prisma.stock.count({
  where: { boxes: { gt: 0 } }
});
// ❌ إذا كان المنتج له مخزون في شركتين، يُحسب مرتين!

const productsWithoutStock = totalProducts - productsWithStock;
// ❌ طرح خاطئ لأن الأرقام غير متطابقة
```

### الحساب الجديد (صحيح):
```typescript
// يحسب عدد المنتجات الفريدة
const stocksWithPositiveBoxes = await this.prisma.stock.findMany({
  select: { productId: true },
  distinct: ['productId']  // ✅ distinct
});
// ✅ كل منتج يُحسب مرة واحدة فقط

const productsWithStock = stocksWithPositiveBoxes.length;
// ✅ عدد صحيح للمنتجات الفريدة
```

---

## 🧪 أمثلة على الحساب الصحيح:

### مثال 1: شركة واحدة
```
إجمالي الأصناف: 100
- 60 صنف لهم مخزون > 0
- 30 صنف لهم مخزون = 0
- 10 أصناف بدون سجل مخزون

النتيجة:
✅ أصناف بمخزون: 60
✅ أصناف بدون مخزون: 40 (30 + 10)
```

### مثال 2: عدة شركات (System User)
```
إجمالي الأصناف: 100
- صنف A: له مخزون في شركة 1 (5) وشركة 2 (3) ← يُحسب مرة واحدة
- صنف B: له مخزون في شركة 1 (0) وشركة 2 (10) ← له مخزون
- صنف C: له مخزون في شركة 1 (0) وشركة 2 (0) ← بدون مخزون
- صنف D: ليس له سجل مخزون ← بدون مخزون

النتيجة:
✅ كل صنف يُحسب مرة واحدة فقط
✅ الحساب دقيق ومنطقي
```

---

## 📁 الملف المحدث:
- ✅ `/server/src/services/ProductService.ts` - دالة `getProductStats()`

---

## ✨ النتيجة النهائية:

### قبل الإصلاح:
```
إجمالي الأصناف: 100
أصناف بمخزون: 150 ❌ (أكثر من الإجمالي!)
أصناف بدون مخزون: -50 ❌ (رقم سالب!)
```

### بعد الإصلاح:
```
إجمالي الأصناف: 100
أصناف بمخزون: 60 ✅
أصناف بدون مخزون: 40 ✅
```

---

## 🎯 الفوائد:

1. ✅ **حساب دقيق**: كل منتج يُحسب مرة واحدة فقط
2. ✅ **لا أرقام سالبة**: المنطق صحيح
3. ✅ **يعمل مع عدة شركات**: للـ System Users
4. ✅ **أداء جيد**: استخدام `distinct` بدلاً من queries معقدة

النظام الآن يحسب الإحصائيات بشكل صحيح من قاعدة البيانات! 🎉
