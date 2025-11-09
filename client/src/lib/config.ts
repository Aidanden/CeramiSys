/**
 * API Configuration
 * إعدادات API للتطبيق
 */

// تحديد عنوان API الأساسي
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // في المتصفح
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
  }
  // في الخادم
  return process.env.API_BASE_URL || 'http://localhost:4000/api';
};

// إعدادات API
export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// إعدادات محسّنة للأداء مع Optimistic Updates
export const API_CACHE_CONFIG = {
  // إعدادات المصادقة - بدون كاش (حساسة)
  auth: {
    keepUnusedDataFor: 0, // بدون كاش
    refetchOnMountOrArgChange: true, // جلب دائماً
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الشركات - كاش قصير
  companies: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات المستخدمين - كاش قصير
  users: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الصلاحيات - كاش طويل
  permissions: {
    keepUnusedDataFor: 600, // 10 دقائق كاش
    refetchOnMountOrArgChange: 60, // جلب كل دقيقة
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الأصناف - تحديث فوري عند التغيير
  products: {
    keepUnusedDataFor: 60, // دقيقة واحدة فقط
    refetchOnMountOrArgChange: true, // جلب فوري عند أي تغيير
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الإشعارات - كاش قصير
  notifications: {
    keepUnusedDataFor: 60, // دقيقة واحدة كاش
    refetchOnMountOrArgChange: 15, // جلب كل 15 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات المبيعات - فوري بدون كاش
  sales: {
    keepUnusedDataFor: 0, // بدون كاش للتحديث الفوري
    refetchOnMountOrArgChange: true, // جلب دائماً
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات المشتريات - كاش متوسط
  purchases: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات المبيعات بين الشركات - كاش متوسط
  interCompanySales: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات التقارير - كاش قصير
  reports: {
    keepUnusedDataFor: 180, // 3 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الأنشطة - كاش قصير
  activities: {
    keepUnusedDataFor: 120, // دقيقتان كاش
    refetchOnMountOrArgChange: 20, // جلب كل 20 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات مرتجعات المبيعات - كاش متوسط
  saleReturns: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات المخزن - كاش متوسط مع Optimistic Updates
  warehouse: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
  // إعدادات الدفعات - كاش متوسط
  salePayments: {
    keepUnusedDataFor: 300, // 5 دقائق كاش
    refetchOnMountOrArgChange: 30, // جلب كل 30 ثانية
    refetchOnFocus: false, // لا نجلب عند التركيز
    refetchOnReconnect: true, // جلب عند إعادة الاتصال
  },
};


// إعدادات التطبيق
export const APP_CONFIG = {
  name: 'CeramiSys',
  version: '1.0.0',
  description: 'نظام إدارة السيراميك',
  author: 'CeramiSys Team',
  support: {
    email: 'EM.Said@amadholding.com',
    phone: '0918636083',
  },
};

// إعدادات التطوير
export const DEV_CONFIG = {
  enableLogging: process.env.NODE_ENV === 'development',
  enableDebug: process.env.NODE_ENV === 'development',
  enableReduxDevTools: process.env.NODE_ENV === 'development',
};

// إعدادات الإنتاج
export const PROD_CONFIG = {
  enableLogging: false,
  enableDebug: false,
  enableReduxDevTools: false,
};

// إعدادات البيئة
export const ENV_CONFIG = process.env.NODE_ENV === 'production' ? PROD_CONFIG : DEV_CONFIG;

// تصدير الإعدادات الافتراضية
export default {
  API_CONFIG,
  API_CACHE_CONFIG,
  APP_CONFIG,
  ENV_CONFIG,
};
