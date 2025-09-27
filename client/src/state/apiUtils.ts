import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "@/app/redux";
import { API_CONFIG } from "@/lib/config";
import { logout } from "./authSlice";

// Base query with automatic token handling and 401 interceptor
export const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: API_CONFIG.baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token || 
                 (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set('Cache-Control', `max-age=${API_CONFIG.cacheMaxAge}`);
    return headers;
  },
});

// Base query wrapper with automatic logout on 401
export const baseQueryWithAuthInterceptor = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQueryWithAuth(args, api, extraOptions);
  
  // Check if we got a 401 Unauthorized response
  if (result.error?.status === 401) {
    // Token is invalid or expired, logout the user
    api.dispatch(logout());
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  
  return result;
};
