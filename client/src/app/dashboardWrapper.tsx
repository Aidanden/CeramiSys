"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "./(components)/Sidebar";
import { useAppSelector } from "./redux";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/unauthorized'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isStorePortalRoute = pathname?.startsWith('/store-portal');

  // ThemeProvider يتولى تطبيق الثيم الآن، لذا لا نحتاج هذا useEffect

  useEffect(() => {
    // Only redirect if we're not authenticated and not on a public route or store portal route
    // The AuthProvider handles initial session validation
    if (!isAuthenticated && !isPublicRoute && !isStorePortalRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, isPublicRoute, isStorePortalRoute, router]);

  // Show loading spinner for protected routes when not authenticated
  // This provides a fallback while AuthProvider is validating the session
  if (!isAuthenticated && !isPublicRoute && !isStorePortalRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من صلاحيات الوصول...</p>
        </div>
      </div>
    );
  }

  // For public routes or store portal, don't show sidebar and navbar
  if (isPublicRoute || isStorePortalRoute) {
    return (
      <div className={isStorePortalRoute ? "" : "min-h-screen bg-gray-50"}>
        {children}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="bg-background-primary text-text-primary w-full min-h-screen transition-all duration-300 ease-in-out"
    >
      <Sidebar />
      <div
        className={`transition-all duration-300 ease-in-out min-h-screen ${isSidebarCollapsed ? "mr-0 md:mr-16" : "mr-0 md:mr-64"
          }`}
      >
        <Navbar />
        <main className="p-6 bg-background-secondary min-h-screen transition-all duration-300">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default DashboardWrapper;
