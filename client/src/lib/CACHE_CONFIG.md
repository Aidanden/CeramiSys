# إعدادات الكاش (Cache Configuration)

## نظرة عامة
تم نقل جميع إعدادات الكاش من ملفات API إلى ملف `config.ts` في `lib` لتنظيم أفضل وإدارة مركزية.

## إعدادات الكاش المختلفة

### 1. المستخدمين (USERS_CACHE_CONFIG)
```typescript
export const USERS_CACHE_CONFIG = {
  keepUnusedDataFor: 0, // تعطيل الكاش تماماً
  refetchOnMountOrArgChange: true, // Refetch عند تحميل المكون
  refetchOnFocus: true, // Refetch عند التركيز على النافذة
  refetchOnReconnect: true, // Refetch عند إعادة الاتصال
  tagTypes: ["Users", "User", "UserStats"], // أنواع الـ tags
};
```
**السبب**: المستخدمين يحتاجون تحديث فوري بعد العمليات (إضافة، تحديث، حذف)

### 2. الشركات (COMPANIES_CACHE_CONFIG)
```typescript
export const COMPANIES_CACHE_CONFIG = {
  keepUnusedDataFor: 60, // 60 seconds cache
  refetchOnMountOrArgChange: true,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: ["Companies", "Company", "CompanyStats"],
};
```
**السبب**: بيانات الشركات لا تتغير كثيراً، يمكن استخدام كاش محدود

### 3. المصادقة (AUTH_CACHE_CONFIG)
```typescript
export const AUTH_CACHE_CONFIG = {
  keepUnusedDataFor: 30, // 30 seconds cache
  refetchOnMountOrArgChange: true,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: ["Auth", "User"],
};
```
**السبب**: بيانات المصادقة حساسة، كاش قصير المدى

### 4. الصلاحيات (PERMISSIONS_CACHE_CONFIG)
```typescript
export const PERMISSIONS_CACHE_CONFIG = {
  keepUnusedDataFor: 120, // 2 minutes cache
  refetchOnMountOrArgChange: true,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: ["Permissions", "Roles", "UserPermissions"],
};
```
**السبب**: الصلاحيات نادراً ما تتغير، كاش طويل المدى

## كيفية الاستخدام

### في ملفات API:
```typescript
import { USERS_CACHE_CONFIG } from '@/lib/config';

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: baseQueryWithAuthInterceptor,
  tagTypes: USERS_CACHE_CONFIG.tagTypes,
  keepUnusedDataFor: USERS_CACHE_CONFIG.keepUnusedDataFor,
  refetchOnMountOrArgChange: USERS_CACHE_CONFIG.refetchOnMountOrArgChange,
  refetchOnFocus: USERS_CACHE_CONFIG.refetchOnFocus,
  refetchOnReconnect: USERS_CACHE_CONFIG.refetchOnReconnect,
  endpoints: (builder) => ({
    // ...
  }),
});
```

## المزايا

1. **تنظيم أفضل**: جميع إعدادات الكاش في مكان واحد
2. **سهولة الصيانة**: تعديل إعدادات الكاش من ملف واحد
3. **مرونة**: إعدادات مختلفة لكل نوع من البيانات
4. **وضوح**: كل إعداد له سبب واضح

## ملاحظات مهمة

- **المستخدمين**: بدون كاش لضمان البيانات الحديثة
- **الشركات**: كاش محدود (60 ثانية)
- **المصادقة**: كاش قصير (30 ثانية)
- **الصلاحيات**: كاش طويل (2 دقيقة)

## التحديثات المستقبلية

لإضافة إعدادات كاش جديدة:
1. أضف الإعدادات في `config.ts`
2. استوردها في ملف API المطلوب
3. استخدمها في `createApi`

