import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "@/app/redux";
import { API_CONFIG } from "@/lib/config";
import { logout } from "./authSlice";

/**
 * Helper function to get authentication token
 * Priority: Redux state > localStorage
 */
const getAuthToken = (getState: () => unknown): string | null => {
  const reduxToken = (getState() as RootState).auth.token;
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return reduxToken || localToken;
};

/**
 * Helper function to clear authentication data
 */
const clearAuthData = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

/**
 * Helper function to redirect to login
 */
const redirectToLogin = (): void => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

/**
 * Base query with automatic token handling
 */
export const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  prepareHeaders: (headers, { getState }) => {
    const token = getAuthToken(getState);
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // Set standard headers
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    
    // منع الـ cache في المتصفح
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    
    return headers;
  },
});

/**
 * Base query wrapper with authentication interceptor
 * Handles 401 errors automatically by logging out user
 */
export const baseQueryWithAuthInterceptor = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQueryWithAuth(args, api, extraOptions);
  
  // Handle 401 Unauthorized responses
  if (result.error?.status === 401) {
    // Log out user and clear data
    api.dispatch(logout());
    clearAuthData();
    redirectToLogin();
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔐 Authentication failed - user logged out');
    }
  }
  
  // تم تعطيل logging للأخطاء - يتم عرضها في notifications فقط
  
  return result;
};

/**
 * Helper function to check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true; // If we can't parse it, consider it expired
  }
};

/**
 * Helper function to get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
};
