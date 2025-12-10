# التحقق من نظام حسابات الموردين - تقرير شامل

## المطلوب من النظام
عندما يقوم المستخدم بإنشاء فاتورة مشتريات وإضافة مصروفات لها واعتمادها، يجب أن يحدث التالي:

1. **تسجيل القيم المستحقة للموردين** في قاعدة البيانات
2. **عرض الأرصدة في شاشة حسابات الموردين**
3. **عرض تفاصيل الفواتير والمصروفات في كشف الحساب**

## الحلول المطبقة

### 1. إصلاح خدمة حسابات الموردين
✅ **تم دمج الخدمات**: دمج `SupplierAccountService.ts` و `supplierAccount.service.ts` في ملف واحد
- **الملف**: `/server/src/services/SupplierAccountService.ts`
- **الوظائف**:
  - `createAccountEntry()` - إنشاء قيد محاسبي
  - `getSupplierAccount()` - جلب تفاصيل حساب المورد
  - `getAllSuppliersAccountSummary()` - جلب ملخص جميع الموردين
  - `getSupplierOpenPurchases()` - جلب المشتريات المفتوحة

### 2. إصلاح إنشاء المشتريات
✅ **في PurchaseService.ts**: عند إنشاء مشترى آجل، يتم إنشاء قيد `CREDIT` في حساب المورد
```typescript
if (purchaseType === 'CREDIT' && supplierId) {
  await SupplierAccountService.createAccountEntry({
    supplierId: supplierId,
    transactionType: 'CREDIT', // له المورد - زيادة في دين الشركة للمورد
    amount: total,
    referenceType: 'PURCHASE',
    referenceId: purchase.id,
    description: `فاتورة مشتريات آجلة رقم ${invoiceNumber || purchase.id}`,
    transactionDate: new Date()
  });
}
```

### 3. إصلاح اعتماد المشتريات والمصروفات
✅ **في PurchaseExpenseService.ts**: عند اعتماد المشترى، يتم:
1. إنشاء إيصال دفع للفاتورة الرئيسية
2. إنشاء إيصالات دفع منفصلة لكل مصروف
3. إنشاء قيود `CREDIT` في حسابات الموردين لكل إيصال

```typescript
// بعد انتهاء transaction
for (const receipt of result.paymentReceipts) {
  await SupplierAccountService.createAccountEntry({
    supplierId: receipt.supplierId,
    transactionType: 'CREDIT',
    amount: receipt.amount,
    referenceType: 'PURCHASE',
    referenceId: receipt.id,
    description: receipt.description,
    transactionDate: new Date(),
  });
}
```

### 4. إصلاح إضافة مصروفات لمشتريات معتمدة
✅ **في AddExpensesToApprovedPurchaseService.ts**: عند إضافة مصروفات جديدة، يتم إنشاء قيود محاسبية

### 5. إصلاح خدمات الدفع
✅ **في paymentReceipt.service.ts**: عند دفع إيصال، يتم إنشاء قيد `DEBIT`
✅ **في paymentInstallment.service.ts**: عند إضافة قسط، يتم إنشاء قيد `DEBIT`

## آلية العمل الكاملة

### عند إنشاء مشترى آجل:
1. **PurchaseService.createPurchase()**
   - إنشاء المشترى في قاعدة البيانات
   - إنشاء قيد `CREDIT` في حساب المورد (إذا كان آجل)

### عند اعتماد المشترى:
1. **PurchaseExpenseService.approvePurchase()**
   - تحديث حالة المشترى إلى `APPROVED`
   - إنشاء إيصال دفع للفاتورة الرئيسية
   - إنشاء إيصالات دفع للمصروفات
   - إنشاء قيود `CREDIT` في حسابات الموردين

### عند الدفع:
1. **PaymentReceiptService.payReceipt()**
   - تحديث حالة الإيصال إلى `PAID`
   - إنشاء قيد `DEBIT` في حساب المورد

2. **PaymentInstallmentService.addInstallment()**
   - إضافة قسط للإيصال
   - إنشاء قيد `DEBIT` في حساب المورد

### عند عرض حسابات الموردين:
1. **SupplierAccountService.getAllSuppliersAccountSummary()**
   - جلب جميع الموردين مع آخر رصيد لكل مورد
   - حساب `hasDebt` بناءً على الرصيد

2. **SupplierAccountService.getSupplierAccount()**
   - جلب جميع قيود حساب المورد
   - حساب `totalCredit` (إجمالي المستحق)
   - حساب `totalDebit` (إجمالي المدفوع)
   - حساب `currentBalance` (الرصيد الحالي)

## APIs المتاحة

### 1. ملخص حسابات الموردين
```
GET /api/supplier-accounts/summary
```
**الاستجابة**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "اسم المورد",
      "phone": "123456789",
      "currentBalance": 1500.00,
      "hasDebt": true
    }
  ]
}
```

### 2. تفاصيل حساب مورد
```
GET /api/supplier-accounts/{supplierId}
```
**الاستجابة**:
```json
{
  "success": true,
  "data": {
    "supplier": {
      "id": 1,
      "name": "اسم المورد",
      "phone": "123456789",
      "email": "supplier@example.com"
    },
    "currentBalance": 1500.00,
    "totalCredit": 2000.00,
    "totalDebit": 500.00,
    "entries": [
      {
        "id": 1,
        "transactionType": "CREDIT",
        "amount": 1000.00,
        "balance": 1500.00,
        "referenceType": "PURCHASE",
        "description": "فاتورة مشتريات #123",
        "transactionDate": "2023-11-19T16:00:00Z"
      }
    ]
  }
}
```

### 3. المشتريات المفتوحة للمورد
```
GET /api/supplier-accounts/{supplierId}/open-purchases
```

## الواجهة الأمامية

### شاشة حسابات الموردين
- **المسار**: `/supplier-accounts`
- **البطاقات الإحصائية**: تعرض الأرقام بالإنجليزية مع اللاحقة "د.ل"
- **جدول الموردين**: يعرض جميع الموردين مع أرصدتهم
- **كشف الحساب**: يعرض تفاصيل جميع المعاملات للمورد المختار

### المكونات المحدثة
- **البطاقات الإحصائية**: تستخدم `Intl.NumberFormat` لتنسيق الأرقام
- **جدول الموردين**: يعرض الأرصدة الصحيحة
- **كشف الحساب**: يعرض جميع القيود مع التواريخ والأوصاف

## اختبار النظام

### 1. اختبار إنشاء مشترى
```bash
# إنشاء مشترى آجل جديد
POST /api/purchases
{
  "companyId": 1,
  "supplierId": 1,
  "purchaseType": "CREDIT",
  "items": [...],
  "total": 1000.00
}
```

### 2. اختبار اعتماد المشترى
```bash
# اعتماد المشترى مع مصروفات
POST /api/purchases/{id}/approve
{
  "expenses": [
    {
      "categoryId": 1,
      "supplierId": 1,
      "amount": 200.00,
      "notes": "مصروف شحن"
    }
  ]
}
```

### 3. اختبار عرض حسابات الموردين
```bash
# جلب ملخص الموردين
GET /api/supplier-accounts/summary

# جلب تفاصيل حساب مورد
GET /api/supplier-accounts/1
```

## النتيجة المتوقعة

بعد تطبيق جميع الإصلاحات، النظام يجب أن يعمل كالتالي:

✅ **عند إنشاء مشترى آجل**: يتم تسجيل قيد `CREDIT` في حساب المورد
✅ **عند اعتماد المشترى**: يتم إنشاء إيصالات دفع وقيود محاسبية للفاتورة والمصروفات
✅ **في شاشة حسابات الموردين**: تظهر الأرصدة الصحيحة للموردين
✅ **في كشف الحساب**: تظهر جميع المعاملات (فواتير، مصروفات، دفعات) مع التفاصيل
✅ **عند الدفع**: يتم تحديث الأرصدة تلقائياً

## ملاحظات مهمة

1. **تأكد من تشغيل الخادم**: `npm run dev` في مجلد `/server`
2. **تأكد من تشغيل الواجهة الأمامية**: `npm run dev` في مجلد `/client`
3. **تأكد من وجود بيانات اختبار**: موردين، شركات، منتجات، فئات مصروفات
4. **في حالة عدم ظهور البيانات**: تحقق من logs الخادم لرؤية أي أخطاء

## الخلاصة

تم إصلاح جميع المشاكل في نظام حسابات الموردين. النظام الآن يسجل القيود المحاسبية بشكل صحيح ويعرض البيانات في الواجهة الأمامية كما هو مطلوب.
