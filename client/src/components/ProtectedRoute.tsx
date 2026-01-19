"use client";

import React, { useEffect } from "react";
import { useGetUserScreensQuery } from "@/state/permissionsApi";
import { usePathname, useRouter } from "next/navigation";
import { hasScreenAccess } from "@/types/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userScreensData, isLoading } = useGetUserScreensQuery();

  useEffect(() => {
    if (!isLoading && userScreensData) {
      const authorizedScreens = userScreensData.screens || [];
      
      // المسارات العامة التي لا تحتاج صلاحيات
      const publicRoutes = ['/login', '/unauthorized', '/'];
      if (publicRoutes.includes(pathname)) {
        return;
      }

      // التحقق من صلاحية الوصول للمسار الحالي
      const hasAccess = hasScreenAccess(authorizedScreens, pathname);

      if (!hasAccess) {
        router.push('/unauthorized');
      }
    }
  }, [pathname, userScreensData, isLoading, router]);

  // عرض loader أثناء التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
