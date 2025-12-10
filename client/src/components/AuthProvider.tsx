"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { loginSuccess, logout, initializeStart, initializeComplete, resetLoadingStates } from "@/state/authSlice";
import { API_CONFIG } from "@/lib/config";

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const dispatch = useAppDispatch();
  const { isInitializing } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // إعادة تعيين حالات التحميل فوراً عند التحميل
    dispatch(resetLoadingStates());
    
    const validateSession = async () => {
      dispatch(initializeStart());
      
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (!token || !userString) {
        // No stored session
        dispatch(initializeComplete());
        return;
      }

      try {
        const user = JSON.parse(userString);
        
        // Validate token with server
        const response = await fetch(`${API_CONFIG.baseUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // Token is valid, restore session
          console.log('AuthProvider: Token validated successfully');
          dispatch(loginSuccess({ user, token }));
        } else {
          // Token is invalid or expired, clear session
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(logout());
        }
      } catch (error) {
        // Network error or invalid data, clear session
        console.error("Session validation error:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(logout());
      } finally {
        dispatch(initializeComplete());
      }
    };

    validateSession();
  }, [dispatch]);

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
