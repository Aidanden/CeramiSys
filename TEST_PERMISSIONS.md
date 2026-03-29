# اختبار مشكلة الصلاحيات المخصصة

## المشكلة
عند إنشاء مستخدم بصلاحيات مخصصة (وليس من الأدوار)، يحصل المستخدم على خطأ 403 عند محاولة الوصول إلى الشاشات.

## السبب المحتمل
الصلاحيات يتم حفظها بشكل صحيح في قاعدة البيانات، لكن:
1. قد لا يتم قراءتها بشكل صحيح من قاعدة البيانات
2. قد يكون هناك مشكلة في `normalizePermissions`
3. قد تكون الصلاحيات المحفوظة بتنسيق خاطئ

## خطوات الاختبار

### 1. إنشاء مستخدم بصلاحيات مخصصة
```
اسم المستخدم: test_custom_user
الصلاحيات المخصصة: ["screen.dashboard", "screen.sales", "screen.products"]
```

### 2. تسجيل الدخول
- سجل دخول بالمستخدم الجديد
- راقب الـ console logs في الـ server

### 3. ما يجب أن تراه في الـ logs

#### في `normalizePermissions`:
```
🔧 [normalizePermissions] Input: {
  value: ["screen.dashboard", "screen.sales", "screen.products"],
  type: "object",
  isArray: false,
  isNull: false,
  isUndefined: false
}
✅ [normalizePermissions] Object input, values: [...] result: [...]
```

#### في `auth` middleware:
```
🔍 [AUTH] تتبع الصلاحيات: {
  userId: "...",
  username: "test_custom_user",
  roleId: null,
  roleName: undefined,
  userPermissionsRaw: ["screen.dashboard", "screen.sales", "screen.products"],
  userPermissionsType: "object",
  userPermissionsIsNull: false,
  userPermissionsIsUndefined: false,
  rolePermissionsRaw: undefined,
  rolePermissionsType: "undefined"
}

✅ [AUTH] الصلاحيات النهائية: {
  userPermissions: ["screen.dashboard", "screen.sales", "screen.products"],
  rolePermissions: [],
  finalPermissions: ["screen.dashboard", "screen.sales", "screen.products"],
  permissionsCount: 3
}
```

## الحل المتوقع

إذا كانت المشكلة في `normalizePermissions`:
- تحديث الدالة لمعالجة جميع أنواع البيانات بشكل صحيح
- التأكد من أن Prisma يعيد البيانات بالتنسيق الصحيح

إذا كانت المشكلة في حفظ البيانات:
- التأكد من أن الصلاحيات تُحفظ كـ JSON array وليس JSON object
- استخدام `JSON.stringify()` قبل الحفظ إذا لزم الأمر

## الملفات ذات الصلة
- `/server/src/middleware/auth.ts` - قراءة الصلاحيات
- `/server/src/utils/permissionUtils.ts` - تطبيع الصلاحيات
- `/server/src/controllers/usersController.ts` - حفظ الصلاحيات
- `/server/src/middleware/authorization.ts` - التحقق من الصلاحيات
