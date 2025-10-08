# دليل التشغيل السريع - نظام الفواتير المبدئية

## خطوات التشغيل

### 1. تطبيق تغييرات قاعدة البيانات
```bash
cd server
npx prisma migrate dev --name add-provisional-sales
npx prisma generate
```

### 2. تشغيل الخادم
```bash
npm run dev
```

### 3. اختبار النظام
```bash
node test-provisional-sales.js
```

## API Endpoints الجاهزة

### إنشاء فاتورة مبدئية
```bash
POST http://localhost:8000/api/provisional-sales
Content-Type: application/json

{
  "companyId": 1,
  "customerId": 1,
  "invoiceNumber": "PROV-2024-001",
  "status": "DRAFT",
  "notes": "فاتورة مبدئية جديدة",
  "lines": [
    {
      "productId": 1,
      "qty": 5,
      "unitPrice": 100.00
    }
  ]
}
```

### الحصول على قائمة الفواتير
```bash
GET http://localhost:8000/api/provisional-sales?page=1&limit=10
```

### الحصول على فاتورة واحدة
```bash
GET http://localhost:8000/api/provisional-sales/1
```

### تحديث حالة الفاتورة
```bash
PATCH http://localhost:8000/api/provisional-sales/1/status
Content-Type: application/json

{
  "status": "APPROVED"
}
```

### ترحيل فاتورة إلى مبيعات عادية
```bash
POST http://localhost:8000/api/provisional-sales/1/convert
Content-Type: application/json

{
  "saleType": "CREDIT",
  "paymentMethod": "CASH"
}
```

## حالات الفاتورة المبدئية

- **DRAFT**: مسودة (يمكن التعديل)
- **PENDING**: معلقة للمراجعة
- **APPROVED**: معتمدة (جاهزة للترحيل)
- **CONVERTED**: مرحلة (لا يمكن التعديل)
- **CANCELLED**: ملغية

## ملاحظات مهمة

1. **لا تؤثر على المخزون**: الفواتير المبدئية لا تخصم من المخزون حتى يتم ترحيلها
2. **يجب الاعتماد قبل الترحيل**: الحالة يجب أن تكون APPROVED قبل الترحيل
3. **لا يمكن تعديل الفواتير المرحلة**: بعد الترحيل تصبح للقراءة فقط
4. **ترحيل آمن**: عند الترحيل يتم خصم الكميات من المخزون وإنشاء فاتورة مبيعات عادية

## استكشاف الأخطاء

### خطأ في الاتصال
- تأكد من تشغيل الخادم على المنفذ 8000
- تحقق من إعدادات قاعدة البيانات في .env

### خطأ في البيانات
- تأكد من وجود الشركة والعميل والمنتجات في قاعدة البيانات
- تحقق من صحة أنواع البيانات (أرقام، نصوص، إلخ)

### خطأ في الترحيل
- تأكد من أن حالة الفاتورة APPROVED
- تحقق من وجود مخزون كافي للمنتجات
- تأكد من عدم ترحيل الفاتورة مسبقاً

---

النظام جاهز للاستخدام! 🎉
