# الخطوات التالية لإكمال نظام الصلاحيات

## ✅ ما تم إنجازه

تم تطوير 60% من نظام الصلاحيات المبني على الشاشات:
- ✅ Backend كامل (Constants, Middleware, Controllers, Routes)
- ✅ Frontend API Integration (Types, RTK Query)
- ✅ Sidebar Integration (إخفاء الشاشات غير المصرح بها)
- ✅ تحديث seed data للأدوار

## 🔄 الخطوات المتبقية (بالترتيب)

### الخطوة 1: تحديث قاعدة البيانات ⚡ (5 دقائق)

```bash
cd server
npm run seed
# أو
npx prisma db seed
```

**ماذا يفعل هذا؟**
- يحدث جدول `UserRoles` بالصلاحيات الجديدة
- يضيف دور "أمين مخزن" الجديد
- يحول الصلاحيات من النظام القديم للجديد

**التحقق من النجاح:**
```sql
SELECT "RoleName", "Permissions" FROM "UserRoles";
```

يجب أن ترى:
- Admin: `["screen.all"]`
- Manager: `["screen.dashboard", "screen.companies", ...]`
- Cashier: `["screen.dashboard", "screen.sales", ...]`

---

### الخطوة 2: اختبار Backend 🧪 (10 دقائق)

#### 2.1 تشغيل السيرفر:
```bash
cd server
npm run dev
```

#### 2.2 اختبار Endpoints:

**جلب جميع الشاشات:**
```bash
curl http://localhost:8000/api/screens \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**جلب شاشات المستخدم الحالي:**
```bash
curl http://localhost:8000/api/users/me/screens \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "data": {
    "screens": [...],
    "screensByCategory": {...},
    "categories": {...},
    "hasAllAccess": false
  }
}
```

---

### الخطوة 3: اختبار Frontend 🎨 (15 دقيقة)

#### 3.1 تشغيل التطبيق:
```bash
cd client
npm run dev
```

#### 3.2 اختبار الأدوار المختلفة:

**كمدير (Admin):**
1. سجل دخول كمدير
2. افتح Sidebar
3. ✅ يجب أن ترى جميع الشاشات (16 شاشة)

**كصراف (Cashier):**
1. سجل دخول كصراف
2. افتح Sidebar
3. ✅ يجب أن ترى فقط 6 شاشات:
   - الرئيسية
   - المبيعات
   - المردودات
   - المشتريات
   - حسابات العملاء
   - حسابات الموردين

**كمحاسب (Accountant):**
1. سجل دخول كمحاسب
2. افتح Sidebar
3. ✅ يجب أن ترى فقط 6 شاشات:
   - الرئيسية
   - مساحة عمل المحاسب
   - حسابات العملاء
   - حسابات الموردين
   - التقارير
   - إيصالات الدفع

---

### الخطوة 4: صفحة إدارة المستخدمين 👥 (30-45 دقيقة)

**الهدف**: إضافة واجهة لاختيار الشاشات عند إنشاء/تعديل مستخدم

#### 4.1 تحديث صفحة المستخدمين:

```typescript
// في client/src/app/users/page.tsx أو مكون منفصل

import { useGetAllScreensQuery } from "@/state/permissionsApi";

const UserForm = () => {
  const { data: screensData } = useGetAllScreensQuery();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // تجميع الشاشات حسب الفئة
  const screensByCategory = screensData?.screensByCategory || {};
  const categories = screensData?.categories || {};
  
  return (
    <form>
      {/* حقول أخرى: الاسم، البريد، إلخ */}
      
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">الصلاحيات (الشاشات المتاحة)</h3>
        
        {Object.entries(screensByCategory).map(([category, screens]) => (
          <div key={category} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{categories[category]}</h4>
            <div className="grid grid-cols-2 gap-3">
              {screens.map(screen => (
                <label key={screen.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(screen.permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPermissions([...selectedPermissions, screen.permission]);
                      } else {
                        setSelectedPermissions(selectedPermissions.filter(p => p !== screen.permission));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{screen.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        
        {/* زر "تحديد الكل" / "إلغاء التحديد" */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const allPermissions = Object.values(screensByCategory)
                .flat()
                .map(s => s.permission);
              setSelectedPermissions(allPermissions);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            تحديد الكل
          </button>
          <button
            type="button"
            onClick={() => setSelectedPermissions([])}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
          >
            إلغاء التحديد
          </button>
        </div>
      </div>
      
      {/* زر الحفظ */}
      <button type="submit" className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg">
        حفظ المستخدم
      </button>
    </form>
  );
};
```

#### 4.2 تحديث API call عند الحفظ:

```typescript
// عند إنشاء مستخدم جديد
const handleCreateUser = async (userData) => {
  // إنشاء دور مخصص أو استخدام دور موجود
  // ثم ربط الصلاحيات المختارة
  
  await createUser({
    ...userData,
    // إما:
    roleId: selectedRoleId, // استخدام دور موجود
    // أو:
    customPermissions: selectedPermissions // صلاحيات مخصصة
  });
};
```

---

### الخطوة 5: Route Guard Component 🛡️ (20-30 دقيقة)

#### 5.1 إنشاء المكون:

```typescript
// client/src/components/ProtectedRoute.tsx
'use client';

import { useGetUserScreensQuery } from "@/state/permissionsApi";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userScreensData, isLoading } = useGetUserScreensQuery();
  
  useEffect(() => {
    if (!isLoading && userScreensData) {
      const authorizedScreens = userScreensData.screens || [];
      const hasAccess = authorizedScreens.some(screen => screen.route === pathname);
      
      // السماح بالمسارات العامة
      const publicRoutes = ['/login', '/unauthorized', '/'];
      if (publicRoutes.includes(pathname)) {
        return;
      }
      
      if (!hasAccess) {
        router.push('/unauthorized');
      }
    }
  }, [pathname, userScreensData, isLoading, router]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return <>{children}</>;
};
```

#### 5.2 إنشاء صفحة Unauthorized:

```typescript
// client/src/app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-8xl mb-4">⛔</div>
        <h1 className="text-4xl font-bold text-red-600 mb-4">غير مصرح</h1>
        <p className="text-lg text-gray-600 mb-8">
          ليس لديك صلاحية الوصول لهذه الصفحة
        </p>
        <a 
          href="/dashboard" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}
```

#### 5.3 تطبيق Route Guard:

```typescript
// في client/src/app/layout.tsx أو في كل صفحة محمية
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Layout({ children }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
```

---

### الخطوة 6: الاختبار النهائي 🎯 (30 دقيقة)

#### 6.1 اختبار السيناريوهات:

**سيناريو 1: المدير**
- ✅ يرى جميع الشاشات
- ✅ يمكنه الوصول لجميع الصفحات
- ✅ يمكنه إدارة المستخدمين وتعيين الصلاحيات

**سيناريو 2: الصراف**
- ✅ يرى فقط الشاشات المصرح بها
- ✅ محاولة الوصول لـ `/users` → Redirect to `/unauthorized`
- ✅ محاولة الوصول لـ `/reports` → Redirect to `/unauthorized`

**سيناريو 3: المحاسب**
- ✅ يرى فقط الشاشات المصرح بها
- ✅ محاولة الوصول لـ `/sales` → Redirect to `/unauthorized`
- ✅ يمكنه الوصول لـ `/reports` ✅

**سيناريو 4: أمين المخزن**
- ✅ يرى: الرئيسية، الأصناف، أوامر صرف المخزن، محاضر الإتلاف، المشتريات
- ✅ لا يرى: المبيعات، التقارير، المحاسبة، إدارة المستخدمين

#### 6.2 اختبار الحالات الحدية:

- ✅ مستخدم بدون صلاحيات → يرى فقط الرئيسية
- ✅ مستخدم معطل → لا يمكنه تسجيل الدخول
- ✅ تغيير صلاحيات مستخدم → يتم تحديث Sidebar فوراً (بعد refresh)

---

## 📝 Checklist النهائي

قبل اعتبار النظام مكتملاً، تأكد من:

### Backend:
- [ ] تم تشغيل seed بنجاح
- [ ] جميع endpoints تعمل بشكل صحيح
- [ ] التحقق من الصلاحيات يعمل في Middleware

### Frontend:
- [ ] Sidebar يعرض فقط الشاشات المصرح بها
- [ ] صفحة المستخدمين تسمح باختيار الصلاحيات
- [ ] Route Guard يمنع الوصول غير المصرح به
- [ ] صفحة Unauthorized تعمل بشكل صحيح

### الاختبار:
- [ ] تم اختبار جميع الأدوار (Admin, Manager, Cashier, Accountant, Warehouse)
- [ ] تم اختبار الحالات الحدية
- [ ] لا توجد أخطاء في Console

### التوثيق:
- [ ] تم توثيق جميع التغييرات
- [ ] تم تحديث README إذا لزم الأمر
- [ ] تم إنشاء دليل المستخدم (اختياري)

---

## 🚀 بعد الإكمال

عند إكمال جميع الخطوات:

1. **Commit & Push:**
```bash
git add .
git commit -m "feat: implement screen-based permissions system"
git push
```

2. **Deploy:**
- تأكد من تشغيل seed على production database
- اختبر النظام على production

3. **تدريب المستخدمين:**
- شرح نظام الصلاحيات الجديد
- كيفية تعيين الصلاحيات للمستخدمين الجدد

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع ملف `PERMISSIONS_SYSTEM_PLAN.md`
2. راجع ملف `SCREEN_PERMISSIONS_PROGRESS.md`
3. تحقق من console logs في Backend و Frontend

---

**وقت الإكمال المقدر**: 2-3 ساعات
**الصعوبة**: متوسطة
**الأولوية**: عالية

Good luck! 🎉
