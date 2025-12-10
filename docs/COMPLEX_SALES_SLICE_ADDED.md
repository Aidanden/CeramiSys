# إضافة Redux Slice للمبيعات المعقدة

## ما تم إضافته:

### 1. **ملف Slice جديد**: `complexInterCompanySalesSlice.ts`

#### State:
```typescript
interface ComplexInterCompanySalesState {
  selectedParentCompany: number | null;
  selectedCustomer: number | null;
  profitMargin: number;
  isCreating: boolean;
  error: string | null;
}
```

#### Actions:
- `setSelectedParentCompany(id)` - تعيين الشركة الأم المختارة
- `setSelectedCustomer(id)` - تعيين العميل المختار
- `setProfitMargin(margin)` - تعيين هامش الربح
- `setIsCreating(boolean)` - تعيين حالة الإنشاء
- `setError(message)` - تعيين رسالة الخطأ
- `resetComplexSale()` - إعادة تعيين جميع القيم

### 2. **تسجيل في Redux Store**:
- ✅ تم إضافة `complexInterCompanySalesReducer` في `redux.tsx`
- ✅ تم إضافة `"complexInterCompanySales"` في whitelist للـ persistence
- ✅ الآن البيانات تُحفظ في localStorage

## كيفية الاستخدام:

### في المكون:
```typescript
import { useAppDispatch, useAppSelector } from "@/app/redux";
import {
  setSelectedParentCompany,
  setSelectedCustomer,
  setProfitMargin,
  resetComplexSale,
} from "@/state/complexInterCompanySalesSlice";

// في المكون
const dispatch = useAppDispatch();
const { selectedParentCompany, selectedCustomer, profitMargin } = useAppSelector(
  (state) => state.complexInterCompanySales
);

// استخدام
dispatch(setSelectedParentCompany(1));
dispatch(setSelectedCustomer(5));
dispatch(setProfitMargin(25));
dispatch(resetComplexSale()); // إعادة تعيين
```

## المميزات:

### 1. **Persistence**:
- البيانات تُحفظ في localStorage
- عند إعادة تحميل الصفحة، القيم المختارة تبقى

### 2. **Centralized State**:
- حالة واحدة مشتركة عبر التطبيق
- سهولة الوصول من أي مكون

### 3. **Type Safety**:
- جميع الـ actions و state مُعرّفة بـ TypeScript
- IntelliSense كامل

## الملفات المحدثة:
1. ✅ `/client/src/state/complexInterCompanySalesSlice.ts` - ملف الـ slice الجديد
2. ✅ `/client/src/app/redux.tsx` - تسجيل الـ reducer

## الخطوة التالية:
يمكنك الآن استخدام الـ slice في صفحة المبيعات المعقدة بدلاً من `useState` المحلي!
