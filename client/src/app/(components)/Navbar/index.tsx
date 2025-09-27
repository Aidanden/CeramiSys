"use client";
import React, { useState } from "react";
import { 
  Bell, 
  Menu, 
  Settings, 
  Sun, 
  Moon, 
  Users, 
  LogOut, 
  Search,
  ChevronUp,
  User
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { logout } from "@/state/authSlice";
import { useLogoutMutation } from "@/state/authApi";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [logoutMutation] = useLogoutMutation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { user } = useAppSelector((state) => state.auth);

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
    <nav className="bg-white border-b border-slate-200 shadow-sm relative z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Right Side - Menu & Search */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Search Bar */}
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="البحث..."
                className="w-64 pr-10 pl-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                dir="rtl"
              />
            </div>
          </div>

          {/* Left Side - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={isDarkMode ? "التبديل للوضع المضيء" : "التبديل للوضع المظلم"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-slate-600" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings */}
            <Link href="/settings">
              <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            </Link>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-300"></div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.name || "المستخدم"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                  <Link href="/profile">
                    <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <User className="w-4 h-4" />
                      الملف الشخصي
                    </div>
                  </Link>
                  <Link href="/settings">
                    <div className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      الإعدادات
                    </div>
                  </Link>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="البحث..."
            className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            dir="rtl"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;