# إصلاح التحديث الفوري لحسابات الموردين

## المشكلة
شاشة حسابات الموردين لا تتحدث فورياً عند إجراء عمليات في:
- شاشة المشتريات (إنشاء، تعديل، حذف، اعتماد)
- شاشة إيصالات الدفع (إنشاء، دفع، إلغاء، إضافة أقساط)

## الحل
تم إضافة **Cache Invalidation** في RTK Query لتحديث cache حسابات الموردين تلقائياً.

## الملفات المحدثة

### 1. purchaseApi.ts
```typescript
tagTypes: ['Purchase', 'Supplier', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts']

// عند إنشاء مشترى
invalidatesTags: ['Purchase', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts']

// عند تعديل مشترى
invalidatesTags: [..., 'SupplierAccounts']

// عند حذف مشترى
invalidatesTags: ['Purchase', 'PurchaseStats', 'PaymentReceipts', 'SupplierAccounts']
```

### 2. purchaseExpenseApi.ts
```typescript
tagTypes: ['ExpenseCategories', 'PurchaseExpenses', 'ProductCostHistory', 'PaymentReceipts', 'SupplierAccounts']

// عند اعتماد فاتورة
approvePurchase: {
  invalidatesTags: ['PurchaseExpenses', 'PaymentReceipts', 'SupplierAccounts']
}

// عند إضافة مصروفات لفاتورة معتمدة
addExpensesToApprovedPurchase: {
  invalidatesTags: ['PurchaseExpenses', 'PaymentReceipts', 'SupplierAccounts']
}
```

### 3. paymentReceiptsApi.ts
```typescript
tagTypes: ['PaymentReceipts', 'SupplierAccounts']

// عند إنشاء إيصال دفع
createPaymentReceipt: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند تحديث إيصال دفع
updatePaymentReceipt: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند حذف إيصال دفع
deletePaymentReceipt: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند دفع إيصال
payReceipt: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند إلغاء إيصال
cancelReceipt: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند إضافة قسط
addInstallment: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}

// عند حذف قسط
deleteInstallment: {
  invalidatesTags: ['PaymentReceipts', 'SupplierAccounts']
}
```

## كيف يعمل؟

### قبل الإصلاح:
1. المستخدم يعتمد فاتورة مشتريات
2. البيانات تتحدث في قاعدة البيانات ✅
3. شاشة حسابات الموردين **لا تتحدث** ❌
4. المستخدم يحتاج لإعادة تحميل الصفحة يدوياً

### بعد الإصلاح:
1. المستخدم يعتمد فاتورة مشتريات
2. البيانات تتحدث في قاعدة البيانات ✅
3. RTK Query يلاحظ أن `SupplierAccounts` tag تم invalidate
4. يقوم تلقائياً بإعادة fetch بيانات حسابات الموردين
5. شاشة حسابات الموردين **تتحدث فورياً** ✅

## التحديثات الفورية تشمل:

### من شاشة المشتريات:
- ✅ إنشاء مشترى آجل → يظهر رصيد المورد فوراً
- ✅ اعتماد فاتورة → تتحدث الأرصدة فوراً
- ✅ إضافة مصروفات → تتحدث أرصدة موردي المصروفات فوراً
- ✅ تعديل مشترى → تتحدث البيانات فوراً
- ✅ حذف مشترى → تتحدث الأرصدة فوراً

### من شاشة إيصالات الدفع:
- ✅ إنشاء إيصال دفع → يظهر في حساب المورد فوراً
- ✅ دفع إيصال → يتحدث رصيد المورد فوراً
- ✅ إضافة قسط → يتحدث الرصيد فوراً
- ✅ إلغاء إيصال → يتحدث الرصيد فوراً
- ✅ حذف إيصال → يتحدث الرصيد فوراً
- ✅ حذف قسط → يتحدث الرصيد فوراً

## الفوائد:

1. **تجربة مستخدم أفضل**: لا حاجة لإعادة تحميل الصفحة
2. **بيانات دقيقة**: دائماً تعرض أحدث البيانات
3. **أداء محسّن**: RTK Query يدير cache بذكاء
4. **كود نظيف**: لا حاجة لـ manual refetch في كل مكان

## الاختبار:

1. افتح شاشة حسابات الموردين
2. في نافذة أخرى، افتح شاشة المشتريات
3. أنشئ مشترى آجل لأحد الموردين
4. ارجع لشاشة حسابات الموردين
5. **ستلاحظ تحديث الرصيد فوراً دون إعادة تحميل** ✅

## ملاحظات:

- التحديث يحدث **تلقائياً** بفضل RTK Query
- لا حاجة لأي كود إضافي في المكونات
- يعمل مع جميع العمليات (إنشاء، تعديل، حذف، دفع، إلخ)
- Cache يتم إدارته بذكاء لتحسين الأداء
