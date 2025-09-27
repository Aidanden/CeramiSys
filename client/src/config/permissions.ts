// مركز إدارة الصلاحيات في النظام
export const PERMISSIONS = {
  // صلاحيات المبيعات
  SALES: {
    CREATE: 'sales:create',
    READ: 'sales:read',
    UPDATE: 'sales:update',
    DELETE: 'sales:delete',
    LIST: 'sales:list'
  },
  
  // صلاحيات المشتريات
  BUYS: {
    CREATE: 'buys:create',
    READ: 'buys:read',
    UPDATE: 'buys:update',
    DELETE: 'buys:delete',
    LIST: 'buys:list'
  },
  
  // صلاحيات العملاء
  CUSTOMERS: {
    CREATE: 'customers:create',
    READ: 'customers:read',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
    LIST: 'customers:list'
  },
  
  // صلاحيات الديون
  DEBTS: {
    CREATE: 'debts:create',
    READ: 'debts:read',
    UPDATE: 'debts:update',
    DELETE: 'debts:delete',
    LIST: 'debts:list',
    PAYMENT: 'debts:payment'
  },
  
  // صلاحيات الخزينة
  TREASURY: {
    CREATE: 'treasury:create',
    READ: 'treasury:read',
    UPDATE: 'treasury:update',
    DELETE: 'treasury:delete',
    LIST: 'treasury:list'
  },
  
  // صلاحيات العملات
  CURRENCIES: {
    CREATE: 'currencies:create',
    READ: 'currencies:read',
    UPDATE: 'currencies:update',
    DELETE: 'currencies:delete',
    LIST: 'currencies:list'
  },
  
  // صلاحيات المستخدمين
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    LIST: 'users:list'
  },
  
  // صلاحيات التقارير
  REPORTS: {
    SALES: 'reports:sales',
    BUYS: 'reports:buys',
    CUSTOMERS: 'reports:customers',
    DEBTS: 'reports:debts',
    TREASURY: 'reports:treasury',
    MONTHLY: 'reports:monthly'
  },
  
  // صلاحيات لوحة التحكم
  DASHBOARD: {
    VIEW: 'dashboard:view',
    ANALYTICS: 'dashboard:analytics'
  },
  
  // صلاحيات الجنسيات
  NATIONALITIES: {
    CREATE: 'nationalities:create',
    READ: 'nationalities:read',
    UPDATE: 'nationalities:update',
    DELETE: 'nationalities:delete',
    LIST: 'nationalities:list'
  }
} as const;

// الأدوار المحددة مسبقاً
export const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier', // صراف
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant', // محاسب
  VIEWER: 'viewer' // مشاهد فقط
} as const;

// صلاحيات كل دور
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'], // جميع الصلاحيات
  
  [ROLES.CASHIER]: [
    // الصراف يستطيع فقط إجراء المعاملات الأساسية
    PERMISSIONS.SALES.CREATE,
    PERMISSIONS.SALES.READ,
    PERMISSIONS.BUYS.CREATE,
    PERMISSIONS.BUYS.READ,
    PERMISSIONS.CUSTOMERS.CREATE,
    PERMISSIONS.CUSTOMERS.READ,
    PERMISSIONS.CUSTOMERS.UPDATE,
    PERMISSIONS.TREASURY.READ,
    PERMISSIONS.CURRENCIES.READ,
    PERMISSIONS.DASHBOARD.VIEW
  ],
  
  [ROLES.MANAGER]: [
    // المدير يستطيع الوصول لمعظم الوظائف عدا إدارة المستخدمين
    ...Object.values(PERMISSIONS.SALES),
    ...Object.values(PERMISSIONS.BUYS),
    ...Object.values(PERMISSIONS.CUSTOMERS),
    ...Object.values(PERMISSIONS.DEBTS),
    ...Object.values(PERMISSIONS.TREASURY),
    ...Object.values(PERMISSIONS.CURRENCIES),
    ...Object.values(PERMISSIONS.REPORTS),
    ...Object.values(PERMISSIONS.DASHBOARD),
    ...Object.values(PERMISSIONS.NATIONALITIES)
  ],
  
  [ROLES.ACCOUNTANT]: [
    // المحاسب يركز على التقارير والديون والخزينة
    PERMISSIONS.SALES.READ,
    PERMISSIONS.SALES.LIST,
    PERMISSIONS.BUYS.READ,
    PERMISSIONS.BUYS.LIST,
    PERMISSIONS.CUSTOMERS.READ,
    PERMISSIONS.CUSTOMERS.LIST,
    ...Object.values(PERMISSIONS.DEBTS),
    ...Object.values(PERMISSIONS.TREASURY),
    PERMISSIONS.CURRENCIES.READ,
    PERMISSIONS.CURRENCIES.LIST,
    ...Object.values(PERMISSIONS.REPORTS),
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.DASHBOARD.ANALYTICS
  ],
  
  [ROLES.VIEWER]: [
    // المشاهد يستطيع فقط القراءة
    PERMISSIONS.SALES.READ,
    PERMISSIONS.SALES.LIST,
    PERMISSIONS.BUYS.READ,
    PERMISSIONS.BUYS.LIST,
    PERMISSIONS.CUSTOMERS.READ,
    PERMISSIONS.CUSTOMERS.LIST,
    PERMISSIONS.DEBTS.READ,
    PERMISSIONS.DEBTS.LIST,
    PERMISSIONS.TREASURY.READ,
    PERMISSIONS.TREASURY.LIST,
    PERMISSIONS.CURRENCIES.READ,
    PERMISSIONS.CURRENCIES.LIST,
    PERMISSIONS.REPORTS.SALES,
    PERMISSIONS.REPORTS.BUYS,
    PERMISSIONS.REPORTS.CUSTOMERS,
    PERMISSIONS.DASHBOARD.VIEW
  ]
} as const;

// دالة للتحقق من الصلاحية
export const hasPermission = (userPermissions: string[], userRole: string, requiredPermission: string): boolean => {
  // المدير له جميع الصلاحيات
  if (userRole === ROLES.ADMIN) return true;
  
  // التحقق من الصلاحية الشاملة
  if (userPermissions.includes('*')) return true;
  
  // التحقق من الصلاحية المحددة
  return userPermissions.includes(requiredPermission);
};

// دالة للحصول على صلاحيات الدور
export const getRolePermissions = (role: string): string[] => {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
};
