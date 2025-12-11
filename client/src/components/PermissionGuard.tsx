"use client";

import React from "react";
import { useAppSelector } from "@/app/redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallbackPath?: string;
}

const PermissionGuard = ({ 
  children, 
  requiredPermission, 
  requiredRole,
  fallbackPath = "/unauthorized" 
}: PermissionGuardProps) => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const router = useRouter();

  const hasPermission = (permission: string) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || 
           user.permissions.includes('*') || 
           user.role === 'admin';
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  };

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("يجب تسجيل الدخول أولاً");
      router.push("/login");
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      toast.error(`ليس لديك صلاحية للوصول إلى هذه الصفحة. الصلاحية المطلوبة: ${requiredPermission}`);
      router.push(fallbackPath);
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      toast.error(`ليس لديك الدور المطلوب للوصول إلى هذه الصفحة. الدور المطلوب: ${requiredRole}`);
      router.push(fallbackPath);
      return;
    }
  }, [isAuthenticated, user, requiredPermission, requiredRole, router, fallbackPath]);

  // إذا لم يكن مسجل دخول أو ليس لديه صلاحية، لا نعرض المحتوى
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">غير مسموح</h2>
          <p className="text-red-700 mb-4">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          <p className="text-sm text-red-600">الصلاحية المطلوبة: {requiredPermission}</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">غير مسموح</h2>
          <p className="text-red-700 mb-4">ليس لديك الدور المطلوب للوصول إلى هذه الصفحة</p>
          <p className="text-sm text-red-600">الدور المطلوب: {requiredRole}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
