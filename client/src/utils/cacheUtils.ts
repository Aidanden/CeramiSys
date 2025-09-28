/**
 * Cache Utilities for Manual Cache Management
 * أدوات إدارة الكاش اليدوية
 */

import { usersApi } from '@/state/usersApi';
import { companyApi } from '@/state/companyApi';
import { AppDispatch } from '@/app/redux';

// Manual Cache Update Functions
export class CacheManager {
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // تحديث قائمة المستخدمين يدوياً
  updateUsersCache(newUser: any, operation: 'add' | 'update' | 'delete', userId?: string) {
    this.dispatch(
      usersApi.util.updateQueryData('getUsers', {}, (draft) => {
        if (!draft.data?.users) return;

        switch (operation) {
          case 'add':
            draft.data.users.unshift(newUser);
            break;
          
          case 'update':
            if (userId) {
              const index = draft.data.users.findIndex(u => u.id === userId);
              if (index !== -1) {
                draft.data.users[index] = { ...draft.data.users[index], ...newUser };
              }
            }
            break;
          
          case 'delete':
            if (userId) {
              draft.data.users = draft.data.users.filter(u => u.id !== userId);
            }
            break;
        }
      })
    );
  }

  // تحديث قائمة الشركات يدوياً
  updateCompaniesCache(newCompany: any, operation: 'add' | 'update' | 'delete', companyId?: number) {
    this.dispatch(
      companyApi.util.updateQueryData('getCompanies', {}, (draft) => {
        if (!draft.data?.companies) return;

        switch (operation) {
          case 'add':
            draft.data.companies.unshift(newCompany);
            break;
          
          case 'update':
            if (companyId) {
              const index = draft.data.companies.findIndex(c => c.id === companyId);
              if (index !== -1) {
                draft.data.companies[index] = { ...draft.data.companies[index], ...newCompany };
              }
            }
            break;
          
          case 'delete':
            if (companyId) {
              draft.data.companies = draft.data.companies.filter(c => c.id !== companyId);
            }
            break;
        }
      })
    );
  }

  // إعادة تعيين الكاش بالكامل
  resetCache(apiType: 'users' | 'companies' | 'all') {
    switch (apiType) {
      case 'users':
        this.dispatch(usersApi.util.resetApiState());
        break;
      case 'companies':
        this.dispatch(companyApi.util.resetApiState());
        break;
      case 'all':
        this.dispatch(usersApi.util.resetApiState());
        this.dispatch(companyApi.util.resetApiState());
        break;
    }
  }

  // إجبار إعادة تحميل البيانات
  forceRefresh(apiType: 'users' | 'companies' | 'all') {
    switch (apiType) {
      case 'users':
        this.dispatch(usersApi.util.invalidateTags(['Users', 'UserStats']));
        break;
      case 'companies':
        this.dispatch(companyApi.util.invalidateTags(['Companies', 'CompanyStats', 'CompanyHierarchy']));
        break;
      case 'all':
        this.dispatch(usersApi.util.invalidateTags(['Users', 'UserStats']));
        this.dispatch(companyApi.util.invalidateTags(['Companies', 'CompanyStats', 'CompanyHierarchy']));
        break;
    }
  }
}

// Hook لاستخدام Cache Manager
export const useCacheManager = (dispatch: AppDispatch) => {
  return new CacheManager(dispatch);
};

// دالة مساعدة للتحديث السريع
export const quickCacheUpdate = (
  dispatch: AppDispatch,
  type: 'users' | 'companies',
  operation: 'add' | 'update' | 'delete',
  data: any,
  id?: string | number
) => {
  const cacheManager = new CacheManager(dispatch);
  
  if (type === 'users') {
    cacheManager.updateUsersCache(data, operation, id as string);
  } else if (type === 'companies') {
    cacheManager.updateCompaniesCache(data, operation, id as number);
  }
};
