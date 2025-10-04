# إصلاح نظام المبيعات للـ System User

## التاريخ: 2025-09-30

## المشكلة

عند محاولة إنشاء فاتورة مبيعات بواسطة مستخدم `IsSystemUser: true`:

```
📦 Stock Check Debug: {
  productId: 14,
  productName: 'GANTE CREMA 30.3×61.3',
  isSystemUser: true,
  userCompanyId: 1,                    ← شركة المستخدم
  stocksFound: 1,
  allStocks: [ { companyId: 2, boxes: 500 } ],  ← المخزون في شركة 2
  selectedStock: 'NO_STOCK'            ← لم يجد المخزون!
}

خطأ: المخزون غير كافي للصنف: GANTE CREMA 30.3×61.3
```

**السبب**: النظام كان يبحث عن المخزون في شركة المستخدم (1) بينما المخزون موجود في شركة أخرى (2).

## الحل المطبق

### 1. إضافة `companyId` في DTO

**الملف**: `server/src/dto/salesDto.ts`

```typescript
export const CreateSaleDtoSchema = z.object({
  companyId: z.number().int().positive().optional(), // جديد
  customerId: z.number().int().positive().optional(),
  saleType: z.nativeEnum(SaleType),
  paymentMethod: z.nativeEnum(PaymentMethod),
  lines: z.array(CreateSaleLineDtoSchema).min(1)
});
```

### 2. تحديد الشركة المستهدفة في Controller

**الملف**: `server/src/controllers/SalesController.ts`

```typescript
// تحديد الشركة للفاتورة:
// - System User: يمكنه تحديد أي شركة (إذا لم يحدد، يستخدم شركته)
// - مستخدم عادي: يستخدم شركته فقط
const targetCompanyId = isSystemUser && saleData.companyId 
  ? saleData.companyId 
  : userCompanyId;

const sale = await this.salesService.createSale(saleData, targetCompanyId, isSystemUser);
```

### 3. جلب المخزون الصحيح في Service

**الملف**: `server/src/services/SalesService.ts`

```typescript
// جلب جميع المخزون للـ System User
const products = await this.prisma.product.findMany({
  where: {
    id: { in: productIds },
    ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
  },
  include: {
    stocks: isSystemUser ? true : {  // ← جلب كل المخزون
      where: { companyId: userCompanyId }
    },
    prices: isSystemUser ? true : {
      where: { companyId: userCompanyId }
    }
  }
});

// البحث عن المخزون في الشركة المستهدفة
const stock = isSystemUser 
  ? product.stocks.find(s => s.companyId === userCompanyId)  // ← البحث في الشركة الصحيحة
  : product.stocks[0];
```

### 4. تحديث Frontend

**الملف**: `client/src/state/salesApi.ts`

```typescript
export interface CreateSaleRequest {
  companyId?: number; // جديد
  customerId?: number;
  saleType: "CASH" | "CREDIT";
  paymentMethod: "CASH" | "BANK" | "CARD";
  lines: { productId: number; qty: number; unitPrice: number; }[];
}
```

**الملف**: `client/src/app/sales/page.tsx`

```typescript
// إضافة companyId للطلب
const saleRequest = {
  ...saleForm,
  companyId: selectedCompanyId  // ← إرسال الشركة المختارة
};

await createSale(saleRequest).unwrap();
```

## النتيجة

### قبل الإصلاح:
```
userCompanyId: 1
allStocks: [ { companyId: 2, boxes: 500 } ]
selectedStock: 'NO_STOCK'  ← خطأ!
```

### بعد الإصلاح:
```
userCompanyId: 1 (شركة المستخدم الأصلية)
targetCompanyId: 2 (الشركة المستهدفة للفاتورة)
allStocks: [ { companyId: 2, boxes: 500 } ]
selectedStock: { companyId: 2, boxes: 500 }  ← نجح!
```

## الملفات المحدثة

### Backend:
- ✅ `server/src/dto/salesDto.ts`
- ✅ `server/src/controllers/SalesController.ts`
- ✅ `server/src/services/SalesService.ts`

### Frontend:
- ✅ `client/src/state/salesApi.ts`
- ✅ `client/src/app/sales/page.tsx`

### Documentation:
- ✅ `SALES_SYSTEM_USER_GUIDE.md` (دليل الاستخدام)
- ✅ `CHANGELOG_SALES_FIX.md` (هذا الملف)

## الاختبار

### خطوات الاختبار:
1. تسجيل الدخول كـ System User
2. الذهاب لصفحة المبيعات
3. اختيار الشركة (مثلاً: شركة 2)
4. اختيار صنف من شركة 2
5. إنشاء فاتورة مبيعات

### النتيجة المتوقعة:
✅ يتم إنشاء الفاتورة بنجاح
✅ يتم خصم المخزون من الشركة الصحيحة
✅ الفاتورة مرتبطة بالشركة المختارة

## ملاحظات

1. **المستخدم العادي**: لا يتأثر بهذا التغيير، يستمر في استخدام شركته فقط
2. **System User**: يجب اختيار الشركة قبل إنشاء الفاتورة
3. **الأمان**: يتم التحقق من الصلاحيات في كل خطوة
4. **Debug Logging**: متوفر في بيئة التطوير لتتبع المشاكل

## الخطوات التالية (اختياري)

1. إضافة validation للتأكد من أن الأصناف تنتمي للشركة المختارة ✅ (موجود بالفعل)
2. إضافة رسالة توضيحية للمستخدم عند اختيار الشركة
3. حفظ آخر شركة مختارة في localStorage
4. إضافة فلتر للشركات في صفحة المبيعات
