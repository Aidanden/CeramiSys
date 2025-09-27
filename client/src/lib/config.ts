/**
 * إعدادات API للتطبيق
 */

// الحصول على API Base URL من متغيرات البيئة أو next.config
export const getApiBaseUrl = (): string => {
  // في بيئة المتصفح، استخدم NEXT_PUBLIC_API_BASE_URL
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
  }
  
  // في بيئة الخادم، استخدم API_BASE_URL
  return process.env.API_BASE_URL || 'http://localhost:8000/api';
};

// إعدادات API الافتراضية
export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  timeout: 10000, // 10 ثوانٍ
  retries: 3,
  cacheMaxAge: 30, // 30 ثانية
} as const;

// إعدادات مختلفة لكل نوع API
export const API_CACHE_CONFIG = {
  auth: {
    keepUnusedDataFor: 600, // 10 دقائق للمصادقة
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  },
  companies: {
    keepUnusedDataFor: 300, // 5 دقائق للشركات
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },
  users: {
    keepUnusedDataFor: 180, // 3 دقائق للمستخدمين
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  },
  permissions: {
    keepUnusedDataFor: 900, // 15 دقيقة للصلاحيات (نادراً ما تتغير)
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  },
} as const;
