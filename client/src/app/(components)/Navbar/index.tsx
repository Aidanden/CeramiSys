"use client";
import React, { useState } from "react";
import {
  Menu,
  Settings,
  Sun,
  Moon,
  LogOut,
  Search,
  User
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { logout } from "@/state/authSlice";
import { useLogoutMutation } from "@/state/authApi";
import { useGetUserScreensQuery } from "@/state/permissionsApi";
import Link from "next/link";
import NotificationDropdown from "@/components/NotificationDropdown";
import { hasScreenAccess } from "@/types/permissions";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const [logoutMutation] = useLogoutMutation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { user } = useAppSelector((state) => state.auth);
  const { data: userScreensData } = useGetUserScreensQuery();

  const canAccessScreen = (route: string) => {
    if (!userScreensData?.screens) return false;
    return hasScreenAccess(userScreensData.screens, route);
  };

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const toggleDarkMode = () => {
    dispatch(setIsDarkMode(!isDarkMode));
  };

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Logout error:', error);
      // حتى لو فشل logout API، ننظف الجلسة محلياً
    } finally {
      // تنظيف حالة المصادقة
      dispatch(logout());

      // التأكد من التوجه لصفحة تسجيل الدخول
      window.location.href = '/login';
    }
  };

  return (
    <nav className="bg-background-primary border-b border-border-primary shadow-sm relative z-30 transition-all duration-300">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Right Side - Menu & Search */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-background-hover transition-all duration-200 md:hidden"
            >
              <Menu className="w-5 h-5 text-text-secondary" />
            </button>

            {/* Search Bar */}
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-tertiary" />
              </div>
              <input
                type="text"
                placeholder="البحث..."
                className="w-64 pr-10 pl-4 py-2 border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-muted bg-background-secondary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent transition-all duration-200"
                dir="rtl"
              />
            </div>
          </div>

          {/* Left Side - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="relative p-2 rounded-lg hover:bg-background-hover transition-all duration-200 group"
              title={isDarkMode ? "التبديل للوضع المضيء" : "التبديل للوضع المظلم"}
            >
              <div className="relative w-5 h-5">
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-text-secondary group-hover:text-warning-500 transition-colors duration-200" />
                ) : (
                  <Moon className="w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors duration-200" />
                )}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-text-inverse bg-surface-elevated rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                {isDarkMode ? "الوضع المضيء" : "الوضع المظلم"}
              </div>
            </button>

            {/* Notifications */}
            <NotificationDropdown />

            {/* Settings */}
            {canAccessScreen('/settings') && (
              <Link href="/settings">
                <button className="p-2 rounded-lg hover:bg-background-hover transition-all duration-200 group">
                  <Settings className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors duration-200" />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-text-inverse bg-surface-elevated rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    الإعدادات
                  </div>
                </button>
              </Link>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-border-secondary"></div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-hover transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {user?.fullName || "المستخدم"}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-surface-primary rounded-lg shadow-xl border border-border-primary py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  <Link href="/profile">
                    <div className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-background-hover hover:text-text-primary transition-all duration-200">
                      <User className="w-4 h-4" />
                      الملف الشخصي
                    </div>
                  </Link>
                  {canAccessScreen('/settings') && (
                    <Link href="/settings">
                      <div className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-background-hover hover:text-text-primary transition-all duration-200">
                        <Settings className="w-4 h-4" />
                        الإعدادات
                      </div>
                    </Link>
                  )}
                  <div className="border-t border-border-primary my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="sm:hidden px-6 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-text-tertiary" />
          </div>
          <input
            type="text"
            placeholder="البحث..."
            className="w-full pr-10 pl-4 py-2 border border-border-primary rounded-lg text-sm text-text-primary placeholder-text-muted bg-background-secondary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent transition-all duration-200"
            dir="rtl"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;