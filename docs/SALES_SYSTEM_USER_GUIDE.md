# دليل نظام المبيعات للـ System User

## المشكلة التي تم حلها

عند محاولة إنشاء فاتورة مبيعات بواسطة مستخدم `IsSystemUser: true`، كان النظام يبحث عن المخزون في شركة المستخدم فقط، بينما المخزون قد يكون في شركة أخرى.

## الحل المطبق

### 1. إضافة حقل `companyId` في الفاتورة

تم إضافة حقل اختياري `companyId` في بيانات إنشاء الفاتورة يسمح للـ System User بتحديد الشركة التي يريد البيع منها.

```typescript
// في salesDto.ts
export const CreateSaleDtoSchema = z.object({
  companyId: z.number().int().positive().optional(), // للـ System User
  customerId: z.number().int().positive().optional(),
  saleType: z.nativeEnum(SaleType),
  paymentMethod: z.nativeEnum(PaymentMethod),
  lines: z.array(CreateSaleLineDtoSchema).min(1)
});
```

### 2. تحديد الشركة المستهدفة في Controller

```typescript
// في SalesController.ts
const targetCompanyId = isSystemUser && saleData.companyId 
  ? saleData.companyId   // System User يحدد الشركة
  : userCompanyId;       // مستخدم عادي يستخدم شركته
```

### 3. جلب المخزون الصحيح في Service

```typescript
// في SalesService.ts
const products = await this.prisma.product.findMany({
  where: {
    id: { in: productIds },
    ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
  },
  include: {
    stocks: isSystemUser ? true : {
      where: { companyId: userCompanyId }
    }
  }
});

// البحث عن المخزون الصحيح
const stock = isSystemUser 
  ? product.stocks.find(s => s.companyId === userCompanyId)
  : product.stocks[0];
```

## كيفية الاستخدام

### للمستخدم العادي (IsSystemUser: false)
- يتم استخدام شركته تلقائياً
- لا يحتاج لتحديد `companyId`
- يرى فقط أصناف ومخزون شركته

### للـ System User (IsSystemUser: true)

#### في الواجهة الأمامية:
1. اختيار الشركة من القائمة المنسدلة
2. اختيار الأصناف من تلك الشركة فقط
3. إنشاء الفاتورة

#### في الطلب (Request):
```json
{
  "companyId": 2,  // الشركة التي يريد البيع منها
  "customerId": 1,
  "saleType": "CASH",
  "paymentMethod": "CARD",
  "lines": [
    {
      "productId": 14,
      "qty": 10,
      "unitPrice": 50
    }
  ]
}
```

## سير العمل (Flow)

```
1. System User يسجل الدخول (شركته الأصلية: 1)
   ↓
2. يختار الشركة التي يريد البيع منها (مثلاً: 2)
   ↓
3. يختار الأصناف من شركة 2
   ↓
4. يرسل الطلب مع companyId: 2
   ↓
5. Controller يحدد targetCompanyId = 2
   ↓
6. Service يجلب جميع المخزون (لأنه System User)
   ↓
7. Service يبحث عن المخزون في شركة 2
   ↓
8. إذا كان المخزون كافي، يتم إنشاء الفاتورة
   ↓
9. يتم خصم المخزون من شركة 2
```

## الملفات المحدثة

### Backend:
1. `/server/src/dto/salesDto.ts` - إضافة `companyId` في Schema
2. `/server/src/controllers/SalesController.ts` - تحديد `targetCompanyId`
3. `/server/src/services/SalesService.ts` - جلب المخزون الصحيح

### Frontend:
1. `/client/src/state/salesApi.ts` - إضافة `companyId` في Interface
2. `/client/src/app/sales/page.tsx` - إرسال `companyId` في الطلب

## مثال عملي

### السيناريو:
- مستخدم: `admin` (IsSystemUser: true, CompanyID: 1)
- يريد البيع من شركة 2
- الصنف: GANTE CREMA (موجود في شركة 2)
- المخزون: 500 صندوق في شركة 2

### الطلب:
```json
POST /api/sales
{
  "companyId": 2,
  "customerId": 1,
  "saleType": "CASH",
  "paymentMethod": "CARD",
  "lines": [
    {
      "productId": 14,
      "qty": 10,
      "unitPrice": 50
    }
  ]
}
```

### النتيجة:
✅ يتم إنشاء الفاتورة بنجاح
✅ يتم خصم 10 صناديق من مخزون شركة 2
✅ الفاتورة مرتبطة بشركة 2

## Debug Logging

عند التطوير، يمكنك رؤية:
```javascript
SalesController - Create Sale Debug: {
  userCompanyId: 1,        // شركة المستخدم الأصلية
  isSystemUser: true,
  targetCompanyId: 2,      // الشركة المستهدفة للفاتورة
  saleData: {
    companyId: 2,
    customerId: 1,
    saleType: 'CASH',
    paymentMethod: 'CARD',
    linesCount: 1
  }
}

📦 Stock Check Debug: {
  productId: 14,
  productName: 'GANTE CREMA 30.3×61.3',
  isSystemUser: true,
  userCompanyId: 2,        // الشركة المستهدفة
  stocksFound: 1,
  allStocks: [ { companyId: 2, boxes: 500 } ],
  selectedStock: {
    companyId: 2,
    boxes: 500
  }
}
```

## ملاحظات مهمة

1. **للمستخدم العادي**: لا يمكنه تحديد `companyId`، سيتم تجاهله حتى لو أرسله
2. **للـ System User**: إذا لم يحدد `companyId`، سيتم استخدام شركته الأصلية
3. **الأمان**: يتم التحقق من صلاحيات المستخدم في كل خطوة
4. **المخزون**: يتم البحث في المخزون الصحيح حسب الشركة المستهدفة
