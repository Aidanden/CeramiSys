"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { usePathname } from 'next/navigation';

interface SessionTimeoutContextType {
  resetTimer: () => void;
  logout: () => void;
  lastActivity: number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export const useSessionTimeoutContext = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeoutContext must be used within SessionTimeoutProvider');
  }
  return context;
};

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login' || pathname === '/';
  
  const { resetTimer, logout, lastActivity } = useSessionTimeout({
    timeout: 5 * 60 * 1000, // 5 دقائق
    warningTime: 1 * 60 * 1000, // تحذير قبل دقيقة
  });

  // عدم تفعيل مؤقت الجلسة في صفحة تسجيل الدخول
  useEffect(() => {
    if (isLoginPage) {
      return;
    }
  }, [isLoginPage]);

  // عدم تقديم السياق في صفحة تسجيل الدخول
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer, logout, lastActivity }}>
      {children}
    </SessionTimeoutContext.Provider>
  );
};
