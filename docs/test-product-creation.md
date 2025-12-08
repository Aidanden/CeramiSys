# اختبار إضافة صنف جديد مع كمية أولية

## خطوات الاختبار:

### 1. تشغيل الخادم:
```bash
cd server
npm run dev
```

### 2. تشغيل الواجهة الأمامية:
```bash
cd client
npm run dev
```

### 3. اختبار إضافة صنف جديد:

#### أ. بيانات الاختبار:
- **رمز الصنف**: TEST-001
- **اسم الصنف**: بلاط اختبار
- **الوحدة**: صندوق
- **عدد الوحدات في الصندوق**: 6
- **الكمية الأولية**: 10 صندوق
- **السعر**: 150 د.ل

#### ب. النتيجة المتوقعة:
- يتم إنشاء الصنف بنجاح
- يظهر في جدول الأصناف فوراً
- المخزون يظهر: "10 صندوق"
- إجمالي الأمتار يظهر: "60.00 م²" (10 × 6)
- السعر يظهر: "150.00 د.ل"

### 4. التحقق من قاعدة البيانات:

#### أ. جدول Product:
```sql
SELECT id, sku, name, unit, unitsPerBox, createdByCompanyId 
FROM Product 
WHERE sku = 'TEST-001';
```

#### ب. جدول Stock:
```sql
SELECT s.id, s.companyId, s.productId, s.boxes, p.sku 
FROM Stock s 
JOIN Product p ON s.productId = p.id 
WHERE p.sku = 'TEST-001';
```

#### ج. جدول CompanyProductPrice:
```sql
SELECT cpp.id, cpp.companyId, cpp.productId, cpp.sellPrice, p.sku 
FROM CompanyProductPrice cpp 
JOIN Product p ON cpp.productId = p.id 
WHERE p.sku = 'TEST-001';
```

### 5. اختبارات إضافية:

#### أ. اختبار بدون كمية أولية:
- **رمز الصنف**: TEST-002
- **اسم الصنف**: بلاط بدون مخزون
- **الوحدة**: قطعة
- **الكمية الأولية**: (فارغ)
- **النتيجة المتوقعة**: المخزون = 0

#### ب. اختبار بكمية عشرية:
- **رمز الصنف**: TEST-003
- **اسم الصنف**: بلاط كسري
- **الوحدة**: صندوق
- **عدد الوحدات في الصندوق**: 6.5
- **الكمية الأولية**: 2.5 صندوق
- **النتيجة المتوقعة**: إجمالي الوحدات = 16.25

### 6. فحص الـ Logs:

#### أ. في ProductController:
```
ProductController - Create Product Debug: {
  receivedInitialBoxes: "10",
  typeOfInitialBoxes: "string",
  parsedInitialBoxes: 10,
  finalProductData: { ... }
}
```

#### ب. في ProductService:
```
ProductService - Create Stock Debug: {
  receivedInitialBoxes: 10,
  typeOfReceived: "number",
  finalInitialBoxes: 10,
  typeOfFinal: "number",
  willCreateStockWith: { ... }
}
```

## نتائج الاختبار:

### ✅ نجح الاختبار إذا:
- تم إنشاء الصنف بنجاح
- المخزون يظهر بالقيمة الصحيحة
- البيانات محفوظة في قاعدة البيانات
- الحسابات صحيحة (الصناديق × الوحدات)

### ❌ فشل الاختبار إذا:
- المخزون يظهر 0 رغم إدخال قيمة
- خطأ في الحفظ في قاعدة البيانات
- الحسابات خاطئة
- عدم ظهور الصنف في الجدول

## الملاحظات:
- تأكد من تشغيل الخادم في وضع التطوير لرؤية الـ debug logs
- راقب console المتصفح للأخطاء
- راقب terminal الخادم للـ logs التشخيصية
