"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/redux';
import { setIsDarkMode } from '@/state';
import { usePathname } from 'next/navigation';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  // التحقق مما إذا كان المسار الحالي هو صفحة تسجيل الدخول
  const isLoginPage = pathname === '/login' || pathname === '/store-portal/login';

  // تحميل التفضيلات المحفوظة عند بدء التطبيق
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let shouldUseDarkMode = false;

    if (savedTheme) {
      // إذا كان هناك تفضيل محفوظ، استخدمه
      shouldUseDarkMode = savedTheme === 'dark';
    } else {
      // إذا لم يكن هناك تفضيل محفوظ، استخدم تفضيل النظام
      shouldUseDarkMode = systemPrefersDark;
    }

    // تطبيق الثيم مرة واحدة فقط عند التحميل
    dispatch(setIsDarkMode(shouldUseDarkMode));
    setIsInitialized(true);
  }, [dispatch]); // إزالة isDarkMode من dependencies

  // تطبيق الثيم على DOM
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;

    // إذا كانت صفحة تسجيل دخول، نفرض الوضع الفاتح دائماً
    if (isDarkMode && !isLoginPage) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    // حفظ التفضيل في localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isInitialized, isLoginPage]);

  // مراقبة تغيير تفضيل النظام
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // تطبيق تفضيل النظام فقط إذا لم يكن هناك تفضيل محفوظ
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        dispatch(setIsDarkMode(e.matches));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [dispatch]);

  const toggleTheme = () => {
    dispatch(setIsDarkMode(!isDarkMode));
  };

  const setTheme = (isDark: boolean) => {
    dispatch(setIsDarkMode(isDark));
  };

  // إضافة transition للتبديل السلس
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    root.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');

    // التحقق من عدم وجود الـ style مسبقاً
    const existingStyle = document.getElementById('theme-transitions');
    if (existingStyle) return;

    // إضافة CSS للـ transitions
    const style = document.createElement('style');
    style.id = 'theme-transitions';
    style.textContent = `
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
      }
      
      .theme-transition-disable * {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById('theme-transitions');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, [isInitialized]);

  const value: ThemeContextType = {
    isDarkMode,
    toggleTheme,
    setTheme,
  };

  // عرض loading أثناء تحميل التفضيلات
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
