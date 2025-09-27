"use client";

import React, { useEffect } from "react";
import { useAppSelector } from "@/app/redux";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    // Check role requirement
    if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
      router.push("/unauthorized");
      return;
    }

    // Check permissions
    if (requiredPermissions.length > 0 && user.role !== "admin") {
      const hasAllPermissions = requiredPermissions.every(permission =>
        user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isAuthenticated, user, requiredPermissions, requiredRole, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check permissions again for rendering
  if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
    return null;
  }

  if (requiredPermissions.length > 0 && user.role !== "admin") {
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return null;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
