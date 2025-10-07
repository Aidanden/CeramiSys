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

// إعدادات الكاش لـ RTK Query
export const API_CACHE_CONFIG = {
  // إعدادات المصادقة - كاش طويل لأنها لا تتغير كثيراً
  auth: {
    keepUnusedDataFor: 600, // 10 minutes
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  },
  // إعدادات الشركات - كاش متوسط
  companies: {
    keepUnusedDataFor: 300, // 5 minutes
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },
  // إعدادات المستخدمين - كاش قصير لأنها تتغير كثيراً
  users: {
    keepUnusedDataFor: 180, // 3 minutes
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
    // إضافة polling للتحديث التلقائي (اختياري)
    pollingInterval: 30000, // 30 ثانية (معطل افتراضياً)
  },
  // إعدادات الصلاحيات - كاش طويل لأنها لا تتغير كثيراً
  permissions: {
    keepUnusedDataFor: 900, // 15 minutes
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },
  // إعدادات الأصناف - كاش متوسط لأنها تتغير أحياناً
  products: {
    keepUnusedDataFor: 300, // 5 minutes
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },
  // إعدادات الإشعارات - كاش قصير لأنها تتغير بسرعة
  notifications: {
    keepUnusedDataFor: 60, // 1 minute
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    // إضافة polling للتحديث التلقائي للإشعارات
    pollingInterval: 30000, // 30 ثانية
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
