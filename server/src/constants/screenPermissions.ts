/**
 * Screen Permissions Constants
 * نظام الصلاحيات المبني على الشاشات
 */

export const SCREEN_PERMISSIONS = {
  // الشاشة الرئيسية
  DASHBOARD: 'screen.dashboard',

  // الإدارة الأساسية
  COMPANIES: 'screen.companies',
  PRODUCTS: 'screen.products',

  // المبيعات
  SALES: 'screen.sales',
  SALE_RETURNS: 'screen.sale_returns',
  INTER_COMPANY_SALES: 'screen.inter_company_sales',
  SELL_PARENT_COMPANY_ITEMS: 'screen.sell_parent_items',

  // المشتريات
  PURCHASES: 'screen.purchases',
  PAYMENT_RECEIPTS: 'screen.payment_receipts',

  // المخزون
  WAREHOUSE_DISPATCH: 'screen.warehouse_dispatch',
  WAREHOUSE_RETURNS: 'screen.warehouse_returns',
  DAMAGE_REPORTS: 'screen.damage_reports',

  // المحاسبة
  ACCOUNTANT: 'screen.accountant',
  CUSTOMER_ACCOUNTS: 'screen.customer_accounts',
  SUPPLIER_ACCOUNTS: 'screen.supplier_accounts',
  TREASURY: 'screen.treasury',
  PAYROLL: 'screen.payroll',
  BAD_DEBTS: 'screen.bad_debts',
  GENERAL_RECEIPTS: 'screen.general_receipts',

  // التكاليف
  PRODUCT_COST: 'screen.product_cost',
  INVOICE_COST: 'screen.invoice_cost',

  // التقارير
  REPORTS: 'screen.reports',

  // الإعدادات
  USERS: 'screen.users',
  PERMISSION_GROUPS: 'screen.permission_groups',
  NOTIFICATIONS: 'screen.notifications',

  // إدارة النظام
  SYSTEM_SETTINGS: 'screen.system_settings',
  EXPENSE_CATEGORIES: 'screen.expense_categories',

  // المحلات الخارجية
  EXTERNAL_STORES: 'screen.external_stores',
  EXTERNAL_STORE_INVOICES: 'screen.external_store_invoices',

  // صلاحيات إضافية
  PRODUCT_DISCOUNT: 'screen.product_discount',
  PRODUCT_GROUPS: 'screen.product_groups',

  // صلاحية شاملة (للمدير)
  ALL: 'screen.all'
} as const;

export type ScreenPermissionValue = typeof SCREEN_PERMISSIONS[keyof typeof SCREEN_PERMISSIONS];

export interface ScreenMetadata {
  id: string;
  name: string;
  route: string;
  permission: ScreenPermissionValue;
  category: 'main' | 'sales' | 'purchases' | 'inventory' | 'accounting' | 'reports' | 'settings' | 'system_management';
  description?: string;
  icon?: string;
}

/**
 * قائمة جميع الشاشات المتاحة في النظام
 */
export const SCREEN_METADATA: ScreenMetadata[] = [
  // الشاشات الرئيسية
  {
    id: 'dashboard',
    name: 'الرئيسية',
    route: '/dashboard',
    permission: SCREEN_PERMISSIONS.DASHBOARD,
    category: 'main',
    description: 'لوحة التحكم الرئيسية',
    icon: 'Home'
  },
  {
    id: 'companies',
    name: 'إدارة الشركات',
    route: '/companies',
    permission: SCREEN_PERMISSIONS.COMPANIES,
    category: 'main',
    description: 'إدارة الشركات والفروع',
    icon: 'Building2'
  },
  {
    id: 'products',
    name: 'الأصناف والمخزن',
    route: '/products',
    permission: SCREEN_PERMISSIONS.PRODUCTS,
    category: 'inventory',
    description: 'إدارة المنتجات والمخزون',
    icon: 'ShoppingBag'
  },
  {
    id: 'product-groups',
    name: 'مجموعات الأصناف',
    route: '/product-groups',
    permission: SCREEN_PERMISSIONS.PRODUCT_GROUPS,
    category: 'inventory',
    description: 'إدارة مجموعات الأصناف والخصومات المسموح بها',
    icon: 'Shield'
  },

  // شاشات المبيعات
  {
    id: 'sales',
    name: 'المبيعات',
    route: '/sales',
    permission: SCREEN_PERMISSIONS.SALES,
    category: 'sales',
    description: 'إدارة فواتير المبيعات',
    icon: 'ShoppingCart'
  },
  {
    id: 'sale_returns',
    name: 'المردودات',
    route: '/sale-returns',
    permission: SCREEN_PERMISSIONS.SALE_RETURNS,
    category: 'sales',
    description: 'إدارة مردودات المبيعات',
    icon: 'TrendingDown'
  },
  {
    id: 'inter_company_sales',
    name: 'المبيعات من الشركة الأم',
    route: '/complex-inter-company-sales',
    permission: SCREEN_PERMISSIONS.INTER_COMPANY_SALES,
    category: 'sales',
    description: 'المبيعات بين الشركات',
    icon: 'ArrowRightLeft'
  },
  {
    id: 'sell_parent_items',
    name: 'بيع أصناف الشركة الأم',
    route: '#action-sell-parent-items',
    permission: SCREEN_PERMISSIONS.SELL_PARENT_COMPANY_ITEMS,
    category: 'sales',
    description: 'السماح ببيع أصناف تابعة للشركة الأم من الشركات الفرعية',
    icon: 'Building'
  },

  // شاشات المشتريات
  {
    id: 'purchases',
    name: 'المشتريات',
    route: '/purchases',
    permission: SCREEN_PERMISSIONS.PURCHASES,
    category: 'purchases',
    description: 'إدارة فواتير المشتريات',
    icon: 'CreditCard'
  },
  {
    id: 'payment_receipts',
    name: 'إيصالات الدفع',
    route: '/payment-receipts',
    permission: SCREEN_PERMISSIONS.PAYMENT_RECEIPTS,
    category: 'purchases',
    description: 'إدارة إيصالات الدفع للموردين',
    icon: 'FileText'
  },

  // شاشات المخزون
  {
    id: 'warehouse_dispatch',
    name: 'أوامر صرف المخزن',
    route: '/warehouse-dispatch',
    permission: SCREEN_PERMISSIONS.WAREHOUSE_DISPATCH,
    category: 'inventory',
    description: 'إدارة أوامر صرف المخزن',
    icon: 'Layout'
  },
  {
    id: 'warehouse_returns',
    name: 'استلام المردودات',
    route: '/warehouse-returns',
    permission: SCREEN_PERMISSIONS.WAREHOUSE_RETURNS,
    category: 'inventory',
    description: 'إدارة استلام مردودات المبيعات للمخزن',
    icon: 'TrendingDown'
  },
  {
    id: 'damage_reports',
    name: 'محاضر الإتلاف',
    route: '/damage-reports',
    permission: SCREEN_PERMISSIONS.DAMAGE_REPORTS,
    category: 'inventory',
    description: 'إدارة محاضر إتلاف البضائع',
    icon: 'FileText'
  },

  // شاشات المحاسبة
  {
    id: 'accountant',
    name: 'مساحة عمل المحاسب',
    route: '/accountant',
    permission: SCREEN_PERMISSIONS.ACCOUNTANT,
    category: 'accounting',
    description: 'مساحة عمل المحاسب',
    icon: 'CreditCard'
  },
  {
    id: 'customer_accounts',
    name: 'حسابات العملاء',
    route: '/customer-accounts',
    permission: SCREEN_PERMISSIONS.CUSTOMER_ACCOUNTS,
    category: 'accounting',
    description: 'إدارة حسابات العملاء',
    icon: 'Wallet'
  },
  {
    id: 'supplier_accounts',
    name: 'حسابات الموردين',
    route: '/supplier-accounts',
    permission: SCREEN_PERMISSIONS.SUPPLIER_ACCOUNTS,
    category: 'accounting',
    description: 'إدارة حسابات الموردين',
    icon: 'CircleDollarSign'
  },
  {
    id: 'treasury',
    name: 'حركات الخزينة',
    route: '/treasury',
    permission: SCREEN_PERMISSIONS.TREASURY,
    category: 'accounting',
    description: 'إدارة الخزائن وحركات الأموال',
    icon: 'Wallet'
  },
  {
    id: 'payroll',
    name: 'المرتبات والموظفين',
    route: '/payroll',
    permission: SCREEN_PERMISSIONS.PAYROLL,
    category: 'accounting',
    description: 'إدارة الموظفين وصرف المرتبات والمكافآت',
    icon: 'UsersRound'
  },
  {
    id: 'bad_debts',
    name: 'المصروفات المعدومة',
    route: '/bad-debts',
    permission: SCREEN_PERMISSIONS.BAD_DEBTS,
    category: 'accounting',
    description: 'إدارة بنود المصروفات المعدومة وصرفها',
    icon: 'Receipt'
  },
  {
    id: 'general_receipts',
    name: 'إيصالات خارجية',
    route: '/general-receipts',
    permission: SCREEN_PERMISSIONS.GENERAL_RECEIPTS,
    category: 'accounting',
    description: 'إدارة الإيصالات الخارجية',
    icon: 'FileText'
  },

  // شاشات المحلات الخارجية
  {
    id: 'external_stores',
    name: 'المحلات الخارجية',
    route: '/external-stores',
    permission: SCREEN_PERMISSIONS.EXTERNAL_STORES,
    category: 'accounting',
    description: 'إدارة المحلات الخارجية',
    icon: 'Building2'
  },
  {
    id: 'external_store_invoices',
    name: 'فواتير المحلات',
    route: '/external-store-invoices',
    permission: SCREEN_PERMISSIONS.EXTERNAL_STORE_INVOICES,
    category: 'accounting',
    description: 'إدارة فواتير المحلات الخارجية',
    icon: 'FileText'
  },

  // التكاليف
  {
    id: 'product_cost',
    name: 'تكلفة الأصناف',
    route: '/product-cost',
    permission: SCREEN_PERMISSIONS.PRODUCT_COST,
    category: 'accounting',
    description: 'إدارة وتعديل تكلفة الأصناف يدوياً',
    icon: 'BarChart3'
  },
  {
    id: 'invoice_cost',
    name: 'تكلفة الفاتورة',
    route: '/invoice-cost',
    permission: SCREEN_PERMISSIONS.INVOICE_COST,
    category: 'accounting',
    description: 'عرض تكلفة فاتورة الشراء وتوزيع المصروفات',
    icon: 'FileText'
  },

  // التقارير
  {
    id: 'reports',
    name: 'التقارير',
    route: '/reports',
    permission: SCREEN_PERMISSIONS.REPORTS,
    category: 'reports',
    description: 'عرض التقارير والإحصائيات',
    icon: 'BarChart3'
  },

  // إدارة النظام
  {
    id: 'system_settings',
    name: 'إعدادات النظام',
    route: '/settings',
    permission: SCREEN_PERMISSIONS.SYSTEM_SETTINGS,
    category: 'system_management',
    description: 'إعدادات النظام العامة',
    icon: 'Settings'
  },
  {
    id: 'users',
    name: 'إدارة المستخدمين',
    route: '/users',
    permission: SCREEN_PERMISSIONS.USERS,
    category: 'system_management',
    description: 'إدارة المستخدمين والصلاحيات',
    icon: 'UsersRound'
  },
  {
    id: 'permission_groups',
    name: 'مجموعات الصلاحيات',
    route: '/permission-groups',
    permission: SCREEN_PERMISSIONS.PERMISSION_GROUPS,
    category: 'system_management',
    description: 'إدارة مجموعات الصلاحيات',
    icon: 'Shield'
  },
  {
    id: 'notifications',
    name: 'الإشعارات',
    route: '/notifications',
    permission: SCREEN_PERMISSIONS.NOTIFICATIONS,
    category: 'system_management',
    description: 'عرض الإشعارات',
    icon: 'Bell'
  },
  {
    id: 'expense_categories',
    name: 'إدارة فئات المصروفات',
    route: '/settings/expense-categories',
    permission: SCREEN_PERMISSIONS.EXPENSE_CATEGORIES,
    category: 'system_management',
    description: 'إدارة فئات المصروفات',
    icon: 'FolderTree'
  }
];

/**
 * أسماء الفئات بالعربية
 */
export const CATEGORY_NAMES: Record<string, string> = {
  main: 'الإدارة الأساسية',
  sales: 'المبيعات',
  purchases: 'المشتريات',
  inventory: 'المخزون',
  accounting: 'المحاسبة',
  reports: 'التقارير',
  settings: 'الإعدادات',
  system_management: 'إدارة النظام'
};

/**
 * دالة للحصول على معلومات شاشة من المسار
 */
export function getScreenByRoute(route: string): ScreenMetadata | undefined {
  return SCREEN_METADATA.find(screen => screen.route === route);
}

/**
 * دالة للحصول على معلومات شاشة من الصلاحية
 */
export function getScreenByPermission(permission: string): ScreenMetadata | undefined {
  return SCREEN_METADATA.find(screen => screen.permission === permission);
}

/**
 * دالة للحصول على جميع الشاشات حسب الفئة
 */
export function getScreensByCategory(category: string): ScreenMetadata[] {
  return SCREEN_METADATA.filter(screen => screen.category === category);
}

/**
 * دالة للتحقق من صلاحية الوصول لشاشة معينة
 */
export function hasScreenAccess(userPermissions: string[], screenPermission: string): boolean {
  // المدير له صلاحية الوصول لكل شيء
  if (userPermissions.includes(SCREEN_PERMISSIONS.ALL)) {
    return true;
  }

  // التحقق من الصلاحية المحددة
  return userPermissions.includes(screenPermission);
}

/**
 * دالة للحصول على جميع الشاشات المصرح بها للمستخدم
 */
export function getAuthorizedScreens(userPermissions: string[]): ScreenMetadata[] {
  // إذا كان المستخدم مدير، يحصل على جميع الشاشات
  if (userPermissions.includes(SCREEN_PERMISSIONS.ALL)) {
    return SCREEN_METADATA;
  }

  // فلترة الشاشات حسب الصلاحيات
  return SCREEN_METADATA.filter(screen =>
    userPermissions.includes(screen.permission)
  );
}
