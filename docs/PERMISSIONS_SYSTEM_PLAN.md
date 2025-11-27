# خطة تطوير نظام الصلاحيات المبني على الشاشات

## 1. الوضع الحالي

### نظام الصلاحيات الموجود:
- **الأدوار (Roles)**: مخزنة في `UserRoles` table
- **الصلاحيات**: مخزنة كـ JSON array في حقل `Permissions`
- **الصلاحيات الحالية**: مثل `users.view`, `users.create`, `sales.view`, إلخ
- **المشكلة**: الصلاحيات مجمعة (grouped) وليست مرتبطة مباشرة بالشاشات

### الشاشات الموجودة في Sidebar:
1. **الرئيسية** - `/dashboard`
2. **إدارة الشركات** - `/companies`
3. **الأصناف والمخزن** - `/products`
4. **المبيعات** - `/sales`
5. **مساحة عمل المحاسب** - `/accountant`
6. **حسابات العملاء** - `/customer-accounts`
7. **حسابات الموردين** - `/supplier-accounts`
8. **أوامر صرف المخزن** - `/warehouse-dispatch`
9. **المبيعات من الشركة الأم** - `/complex-inter-company-sales` (للفروع فقط)
10. **المردودات** - `/sale-returns`
11. **المشتريات** - `/purchases`
12. **إيصالات الدفع** - `/payment-receipts`
13. **محاضر الإتلاف** - `/damage-reports`
14. **التقارير** - `/reports`
15. **إدارة المستخدمين** - `/users`
16. **الإشعارات** - `/notifications`

## 2. النظام الجديد المطلوب

### المفهوم:
- كل شاشة لها صلاحية واحدة مستقلة
- عند إضافة/تعديل مستخدم، يتم اختيار الشاشات التي يمكنه الوصول إليها
- الشاشات غير المصرح بها لا تظهر في الـ Sidebar
- محاولة الوصول المباشر للشاشة غير المصرح بها تُرفض

### هيكل الصلاحيات الجديد:

```typescript
interface ScreenPermission {
  id: string;              // مثل: "dashboard"
  name: string;            // مثل: "الرئيسية"
  route: string;           // مثل: "/dashboard"
  category: string;        // مثل: "main", "sales", "purchases", "reports", "settings"
  description?: string;    // وصف اختياري
}
```

### قائمة الصلاحيات الجديدة (Screen-Based):

```json
{
  "screens": {
    "dashboard": {
      "name": "الرئيسية",
      "route": "/dashboard",
      "category": "main"
    },
    "companies": {
      "name": "إدارة الشركات",
      "route": "/companies",
      "category": "main"
    },
    "products": {
      "name": "الأصناف والمخزن",
      "route": "/products",
      "category": "inventory"
    },
    "sales": {
      "name": "المبيعات",
      "route": "/sales",
      "category": "sales"
    },
    "accountant": {
      "name": "مساحة عمل المحاسب",
      "route": "/accountant",
      "category": "accounting"
    },
    "customer_accounts": {
      "name": "حسابات العملاء",
      "route": "/customer-accounts",
      "category": "accounting"
    },
    "supplier_accounts": {
      "name": "حسابات الموردين",
      "route": "/supplier-accounts",
      "category": "accounting"
    },
    "warehouse_dispatch": {
      "name": "أوامر صرف المخزن",
      "route": "/warehouse-dispatch",
      "category": "inventory"
    },
    "inter_company_sales": {
      "name": "المبيعات من الشركة الأم",
      "route": "/complex-inter-company-sales",
      "category": "sales"
    },
    "sale_returns": {
      "name": "المردودات",
      "route": "/sale-returns",
      "category": "sales"
    },
    "purchases": {
      "name": "المشتريات",
      "route": "/purchases",
      "category": "purchases"
    },
    "payment_receipts": {
      "name": "إيصالات الدفع",
      "route": "/payment-receipts",
      "category": "purchases"
    },
    "damage_reports": {
      "name": "محاضر الإتلاف",
      "route": "/damage-reports",
      "category": "inventory"
    },
    "reports": {
      "name": "التقارير",
      "route": "/reports",
      "category": "reports"
    },
    "users": {
      "name": "إدارة المستخدمين",
      "route": "/users",
      "category": "settings"
    },
    "notifications": {
      "name": "الإشعارات",
      "route": "/notifications",
      "category": "settings"
    }
  }
}
```

## 3. خطوات التنفيذ

### المرحلة 1: تحديث Backend

#### 1.1 تحديث Schema (Prisma)
- تحديث `UserRoles.Permissions` لتخزين صلاحيات الشاشات
- إضافة جدول اختياري `ScreenPermissions` لتخزين تعريفات الشاشات

#### 1.2 إنشاء Constants للصلاحيات
```typescript
// server/src/constants/screenPermissions.ts
export const SCREEN_PERMISSIONS = {
  DASHBOARD: 'screen.dashboard',
  COMPANIES: 'screen.companies',
  PRODUCTS: 'screen.products',
  SALES: 'screen.sales',
  ACCOUNTANT: 'screen.accountant',
  CUSTOMER_ACCOUNTS: 'screen.customer_accounts',
  SUPPLIER_ACCOUNTS: 'screen.supplier_accounts',
  WAREHOUSE_DISPATCH: 'screen.warehouse_dispatch',
  INTER_COMPANY_SALES: 'screen.inter_company_sales',
  SALE_RETURNS: 'screen.sale_returns',
  PURCHASES: 'screen.purchases',
  PAYMENT_RECEIPTS: 'screen.payment_receipts',
  DAMAGE_REPORTS: 'screen.damage_reports',
  REPORTS: 'screen.reports',
  USERS: 'screen.users',
  NOTIFICATIONS: 'screen.notifications',
  ALL: 'screen.all' // للمدير
};

export const SCREEN_METADATA = [
  { id: 'dashboard', name: 'الرئيسية', route: '/dashboard', permission: SCREEN_PERMISSIONS.DASHBOARD, category: 'main' },
  { id: 'companies', name: 'إدارة الشركات', route: '/companies', permission: SCREEN_PERMISSIONS.COMPANIES, category: 'main' },
  // ... باقي الشاشات
];
```

#### 1.3 تحديث Middleware
```typescript
// server/src/middleware/screenAuthorization.ts
export const authorizeScreen = (screenPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions as string[] || [];
    
    // المدير له صلاحية الوصول لكل شيء
    if (userPermissions.includes(SCREEN_PERMISSIONS.ALL)) {
      return next();
    }
    
    // التحقق من صلاحية الشاشة
    if (!userPermissions.includes(screenPermission)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية الوصول لهذه الشاشة'
      });
    }
    
    next();
  };
};
```

#### 1.4 تحديث Controllers
- إضافة endpoint للحصول على قائمة الشاشات المتاحة
- تحديث `createUser` و `updateUser` لدعم صلاحيات الشاشات

```typescript
// GET /api/screens - الحصول على جميع الشاشات المتاحة
export const getAvailableScreens = async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: SCREEN_METADATA
  });
};

// GET /api/users/me/screens - الحصول على الشاشات المصرح بها للمستخدم الحالي
export const getUserScreens = async (req: AuthRequest, res: Response) => {
  const userPermissions = req.user?.permissions as string[] || [];
  
  const authorizedScreens = SCREEN_METADATA.filter(screen => 
    userPermissions.includes(SCREEN_PERMISSIONS.ALL) || 
    userPermissions.includes(screen.permission)
  );
  
  res.json({
    success: true,
    data: authorizedScreens
  });
};
```

#### 1.5 تحديث Seed Data
```json
// server/prisma/seedData/UserRoles.json
[
  {
    "RoleID": "role_admin_001",
    "RoleName": "admin",
    "DisplayName": "مدير النظام",
    "Permissions": ["screen.all"],
    "Description": "مدير النظام له جميع الصلاحيات",
    "IsActive": true
  },
  {
    "RoleID": "role_manager_001",
    "RoleName": "manager",
    "DisplayName": "مدير",
    "Permissions": [
      "screen.dashboard",
      "screen.companies",
      "screen.products",
      "screen.sales",
      "screen.purchases",
      "screen.reports",
      "screen.users"
    ],
    "Description": "مدير له صلاحيات إدارية محدودة",
    "IsActive": true
  },
  {
    "RoleID": "role_cashier_001",
    "RoleName": "cashier",
    "DisplayName": "صراف",
    "Permissions": [
      "screen.dashboard",
      "screen.sales",
      "screen.purchases",
      "screen.customer_accounts"
    ],
    "Description": "صراف يمكنه إجراء عمليات البيع والشراء",
    "IsActive": true
  }
]
```

### المرحلة 2: تحديث Frontend

#### 2.1 إنشاء Types
```typescript
// client/src/types/permissions.ts
export interface ScreenPermission {
  id: string;
  name: string;
  route: string;
  permission: string;
  category: 'main' | 'sales' | 'purchases' | 'inventory' | 'accounting' | 'reports' | 'settings';
}

export interface UserPermissions {
  screens: string[];
  hasAllAccess: boolean;
}
```

#### 2.2 إنشاء API للصلاحيات
```typescript
// client/src/state/permissionsApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuthInterceptor } from "./apiUtils";

export const permissionsApi = createApi({
  reducerPath: "permissionsApi",
  baseQuery: baseQueryWithAuthInterceptor,
  endpoints: (build) => ({
    getAvailableScreens: build.query<ScreenPermission[], void>({
      query: () => "/screens",
    }),
    getUserScreens: build.query<ScreenPermission[], void>({
      query: () => "/users/me/screens",
    }),
  }),
});

export const { 
  useGetAvailableScreensQuery, 
  useGetUserScreensQuery 
} = permissionsApi;
```

#### 2.3 تحديث Sidebar
```typescript
// client/src/app/(components)/Sidebar/index.tsx
const Sidebar = () => {
  const { data: userScreensData } = useGetUserScreensQuery();
  const authorizedScreens = userScreensData?.data || [];
  
  // دالة للتحقق من الصلاحية
  const hasScreenAccess = (route: string) => {
    return authorizedScreens.some(screen => screen.route === route);
  };
  
  return (
    <div className={sidebarClassNames}>
      {/* ... */}
      <nav className="space-y-1">
        {hasScreenAccess('/dashboard') && (
          <SidebarLink href="/dashboard" icon={Home} label="الرئيسية" />
        )}
        {hasScreenAccess('/companies') && (
          <SidebarLink href="/companies" icon={Building2} label="إدارة الشركات" />
        )}
        {/* ... باقي الروابط */}
      </nav>
    </div>
  );
};
```

#### 2.4 إنشاء Route Guard Component
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
      const authorizedScreens = userScreensData.data || [];
      const hasAccess = authorizedScreens.some(screen => screen.route === pathname);
      
      if (!hasAccess && pathname !== '/unauthorized') {
        router.push('/unauthorized');
      }
    }
  }, [pathname, userScreensData, isLoading, router]);
  
  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }
  
  return <>{children}</>;
};
```

#### 2.5 تحديث صفحة إضافة/تعديل المستخدم
```typescript
// client/src/app/users/components/UserForm.tsx
const UserForm = () => {
  const { data: screensData } = useGetAvailableScreensQuery();
  const availableScreens = screensData?.data || [];
  
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  
  // تجميع الشاشات حسب الفئة
  const screensByCategory = availableScreens.reduce((acc, screen) => {
    if (!acc[screen.category]) {
      acc[screen.category] = [];
    }
    acc[screen.category].push(screen);
    return acc;
  }, {} as Record<string, ScreenPermission[]>);
  
  return (
    <form>
      {/* ... حقول أخرى */}
      
      <div className="space-y-4">
        <h3 className="font-semibold">الصلاحيات (الشاشات المتاحة)</h3>
        
        {Object.entries(screensByCategory).map(([category, screens]) => (
          <div key={category} className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">{getCategoryName(category)}</h4>
            <div className="grid grid-cols-2 gap-2">
              {screens.map(screen => (
                <label key={screen.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedScreens.includes(screen.permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScreens([...selectedScreens, screen.permission]);
                      } else {
                        setSelectedScreens(selectedScreens.filter(p => p !== screen.permission));
                      }
                    }}
                  />
                  <span>{screen.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
};
```

## 4. Migration Plan

### الخطوة 1: تحديث البيانات الموجودة
```typescript
// server/src/scripts/migratePermissions.ts
// سكريبت لتحويل الصلاحيات القديمة إلى الصلاحيات الجديدة
const OLD_TO_NEW_PERMISSIONS_MAP = {
  'users.view': 'screen.users',
  'users.create': 'screen.users',
  'users.edit': 'screen.users',
  'sales.view': 'screen.sales',
  'sales.create': 'screen.sales',
  'purchases.view': 'screen.purchases',
  'purchases.create': 'screen.purchases',
  'reports.view': 'screen.reports',
  // ... إلخ
};
```

### الخطوة 2: Backward Compatibility
- الحفاظ على الصلاحيات القديمة مؤقتاً
- دعم كلا النظامين في فترة انتقالية
- إزالة النظام القديم بعد التأكد من استقرار النظام الجديد

## 5. الاختبار

### اختبارات Backend:
- [ ] التحقق من صلاحيات الشاشات في Middleware
- [ ] اختبار endpoints الجديدة
- [ ] اختبار إنشاء/تحديث المستخدمين بالصلاحيات الجديدة

### اختبارات Frontend:
- [ ] التحقق من ظهور الشاشات المصرح بها فقط في Sidebar
- [ ] اختبار Route Guard
- [ ] اختبار واجهة إضافة/تعديل المستخدم

### اختبارات Integration:
- [ ] إنشاء مستخدم بصلاحيات محددة
- [ ] تسجيل الدخول والتحقق من الشاشات المتاحة
- [ ] محاولة الوصول لشاشة غير مصرح بها

## 6. الجدول الزمني المقترح

1. **اليوم 1-2**: تحديث Backend (Schema, Constants, Middleware)
2. **اليوم 3-4**: تحديث Frontend (API, Types, Sidebar)
3. **اليوم 5**: تحديث صفحة المستخدمين
4. **اليوم 6**: Migration و Testing
5. **اليوم 7**: Documentation و Deployment

## 7. ملاحظات مهمة

- ✅ صلاحية `screen.all` تعطي الوصول لجميع الشاشات (للمدير)
- ✅ كل شاشة لها صلاحية واحدة فقط
- ✅ الشاشات غير المصرح بها لا تظهر في Sidebar
- ✅ محاولة الوصول المباشر تُرفض وتوجه لصفحة Unauthorized
- ✅ يمكن تجميع الشاشات حسب الفئات في واجهة إضافة المستخدم
- ✅ النظام قابل للتوسع بسهولة عند إضافة شاشات جديدة
