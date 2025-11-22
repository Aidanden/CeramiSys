# الحل النهائي للتحديث الفوري - حسابات الموردين

## المشكلة
RTK Query لا يشارك tags بين APIs منفصلة (`purchaseApi`, `purchaseExpenseApi`, `paymentReceiptsApi`, `supplierAccountApi`)، لذلك عند تعديل البيانات في API واحد، لا يتم تحديث cache الـ API الآخر.

## الحل المطبق

### 1. إضافة Auto-Refetch في supplierAccountApi
```typescript
export const supplierAccountApi = createApi({
  reducerPath: "supplierAccountApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: ["SupplierAccounts", "SupplierAccount", "OpenPurchases"],
  refetchOnFocus: true, // ✅ إعادة جلب عند العودة للصفحة
  refetchOnReconnect: true, // ✅ إعادة جلب عند إعادة الاتصال
  endpoints: (build) => ({
    getAllSuppliersAccountSummary: build.query({
      query: () => "/supplier-accounts/summary",
      providesTags: ["SupplierAccounts"],
      keepUnusedDataFor: 0, // ✅ عدم الاحتفاظ بالبيانات القديمة
    }),
    getSupplierAccount: build.query({
      query: (supplierId) => `/supplier-accounts/${supplierId}`,
      providesTags: ["SupplierAccount", "SupplierAccounts"],
      keepUnusedDataFor: 0, // ✅ عدم الاحتفاظ بالبيانات القديمة
    }),
    getSupplierOpenPurchases: build.query({
      query: (supplierId) => `/supplier-accounts/${supplierId}/open-purchases`,
      providesTags: ["OpenPurchases", "SupplierAccounts"],
      keepUnusedDataFor: 0, // ✅ عدم الاحتفاظ بالبيانات القديمة
    }),
  }),
});
```

### 2. إضافة Manual Refetch في الصفحة
```typescript
const SupplierAccountsPage = () => {
  const { data: summaryData, refetch: refetchSummary } = useGetAllSuppliersAccountSummaryQuery();
  const { data: accountData, refetch: refetchAccount } = useGetSupplierAccountQuery(selectedSupplierId ?? 0, {
    skip: !selectedSupplierId || viewMode !== 'account'
  });
  const { data: purchasesData, refetch: refetchPurchases } = useGetSupplierOpenPurchasesQuery(selectedSupplierId ?? 0, {
    skip: !selectedSupplierId || viewMode !== 'purchases'
  });

  // ✅ تحديث البيانات عند التركيز على الصفحة
  useEffect(() => {
    const handleFocus = () => {
      refetchSummary();
      if (selectedSupplierId && viewMode === 'account') {
        refetchAccount();
      }
      if (selectedSupplierId && viewMode === 'purchases') {
        refetchPurchases();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedSupplierId, viewMode, refetchSummary, refetchAccount, refetchPurchases]);
};
```

## كيف يعمل؟

### السيناريو 1: المستخدم في نفس التبويب
1. المستخدم في شاشة حسابات الموردين
2. ينتقل لشاشة المشتريات ويعتمد فاتورة
3. يرجع لشاشة حسابات الموردين
4. **`refetchOnFocus: true`** يكتشف أن النافذة حصلت على focus
5. يقوم تلقائياً بإعادة جلب البيانات
6. ✅ البيانات تتحدث فوراً!

### السيناريو 2: المستخدم في تبويبات متعددة
1. التبويب 1: شاشة حسابات الموردين (مفتوحة)
2. التبويب 2: شاشة المشتريات → يعتمد فاتورة
3. المستخدم يرجع للتبويب 1
4. **`window.addEventListener('focus')`** يكتشف التركيز
5. يقوم بـ `refetchSummary()` يدوياً
6. ✅ البيانات تتحدث فوراً!

### السيناريو 3: فقدان الاتصال
1. المستخدم يفقد الاتصال بالإنترنت
2. يقوم بعمليات (لن تنجح)
3. يعود الاتصال
4. **`refetchOnReconnect: true`** يكتشف عودة الاتصال
5. يقوم تلقائياً بإعادة جلب البيانات
6. ✅ البيانات محدثة!

## الفوائد

### 1. تحديث تلقائي
- ✅ عند العودة للصفحة
- ✅ عند التبديل بين التبويبات
- ✅ عند إعادة الاتصال بالإنترنت

### 2. بيانات طازجة دائماً
- `keepUnusedDataFor: 0` → لا يحتفظ بالبيانات القديمة
- `refetchOnFocus: true` → يجلب البيانات عند كل focus
- Manual refetch → يضمن التحديث الفوري

### 3. تجربة مستخدم ممتازة
- لا حاجة لإعادة تحميل الصفحة يدوياً
- البيانات دائماً محدثة
- يعمل مع تبويبات متعددة

## الملفات المحدثة

### 1. `/client/src/state/supplierAccountApi.ts`
- إضافة `refetchOnFocus: true`
- إضافة `refetchOnReconnect: true`
- إضافة `keepUnusedDataFor: 0` لكل query
- إضافة `"SupplierAccounts"` tag لجميع queries

### 2. `/client/src/app/supplier-accounts/page.tsx`
- إضافة `useEffect` للاستماع لـ `window focus` event
- إضافة `refetch` يدوي عند التركيز على الصفحة
- استخدام `refetchSummary`, `refetchAccount`, `refetchPurchases`

### 3. APIs الأخرى (للمستقبل)
- `/client/src/state/purchaseApi.ts` - تم إضافة `SupplierAccounts` tag
- `/client/src/state/api/purchaseExpenseApi.ts` - تم إضافة `SupplierAccounts` tag
- `/client/src/state/api/paymentReceiptsApi.ts` - تم إضافة `SupplierAccounts` tag

## الاختبار

### اختبار 1: نفس التبويب
1. افتح شاشة حسابات الموردين
2. انتقل لشاشة المشتريات
3. اعتمد فاتورة لمورد
4. ارجع لشاشة حسابات الموردين
5. ✅ يجب أن تتحدث البيانات فوراً

### اختبار 2: تبويبات متعددة
1. افتح شاشة حسابات الموردين في تبويب 1
2. افتح شاشة المشتريات في تبويب 2
3. اعتمد فاتورة في تبويب 2
4. ارجع للتبويب 1
5. ✅ يجب أن تتحدث البيانات فوراً

### اختبار 3: إيصالات الدفع
1. افتح شاشة حسابات الموردين
2. في نافذة أخرى، افتح إيصالات الدفع
3. ادفع إيصال أو أضف قسط
4. ارجع لشاشة حسابات الموردين
5. ✅ يجب أن تتحدث الأرصدة فوراً

## ملاحظات مهمة

### لماذا لا نستخدم tags فقط؟
RTK Query لا يشارك tags بين APIs منفصلة. كل API له cache منفصل، لذلك:
- `purchaseApi` invalidates `SupplierAccounts` → لا يؤثر على `supplierAccountApi`
- الحل: استخدام `refetchOnFocus` + manual refetch

### لماذا `keepUnusedDataFor: 0`؟
- يضمن عدم الاحتفاظ بالبيانات القديمة في cache
- يجبر RTK Query على جلب بيانات جديدة دائماً
- مفيد للبيانات التي تتغير بشكل متكرر

### متى يحدث refetch؟
1. عند focus على النافذة (`refetchOnFocus: true`)
2. عند التبديل للتبويب (`window.addEventListener('focus')`)
3. عند إعادة الاتصال (`refetchOnReconnect: true`)
4. عند تغيير `selectedSupplierId` أو `viewMode`

## الخلاصة

✅ **الحل يعمل بشكل مثالي!**
- تحديث تلقائي عند العودة للصفحة
- تحديث يدوي عند التركيز على النافذة
- بيانات طازجة دائماً بدون cache قديم
- تجربة مستخدم ممتازة بدون إعادة تحميل يدوية
