/**
 * Types for Screen-Based Permissions System
 */

export type ScreenCategory = 'main' | 'sales' | 'purchases' | 'inventory' | 'accounting' | 'reports' | 'settings' | 'system_management';

export interface ScreenPermission {
  id: string;
  name: string;
  route: string;
  permission: string;
  category: ScreenCategory;
  description?: string;
  icon?: string;
}

export interface ScreensByCategory {
  [category: string]: ScreenPermission[];
}

export interface CategoryNames {
  [category: string]: string;
}

export interface UserScreensResponse {
  screens: ScreenPermission[];
  screensByCategory: ScreensByCategory;
  categories: CategoryNames;
  hasAllAccess: boolean;
}

export interface AllScreensResponse {
  screens: ScreenPermission[];
  screensByCategory: ScreensByCategory;
  categories: CategoryNames;
}

export interface ScreenByCategoryResponse {
  category: string;
  categoryName: string;
  screens: ScreenPermission[];
}

/**
 * دالة مساعدة للتحقق من صلاحية الوصول لشاشة معينة
 */
export function hasScreenAccess(
  userScreens: ScreenPermission[],
  route: string
): boolean {
  return userScreens.some(screen => screen.route === route);
}

/**
 * دالة مساعدة للحصول على معلومات شاشة من المسار
 */
export function getScreenByRoute(
  screens: ScreenPermission[],
  route: string
): ScreenPermission | undefined {
  return screens.find(screen => screen.route === route);
}

/**
 * دالة مساعدة لتجميع الشاشات حسب الفئة
 */
export function groupScreensByCategory(
  screens: ScreenPermission[]
): ScreensByCategory {
  return screens.reduce((acc, screen) => {
    if (!acc[screen.category]) {
      acc[screen.category] = [];
    }
    acc[screen.category].push(screen);
    return acc;
  }, {} as ScreensByCategory);
}
