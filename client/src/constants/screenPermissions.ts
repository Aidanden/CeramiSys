/**
 * Screen Permissions Constants (Client Copy)
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
