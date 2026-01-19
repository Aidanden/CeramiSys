import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface UseSessionTimeoutOptions {
  timeout?: number; // في الميلي ثانية، افتراضي 5 دقائق
  warningTime?: number; // وقت التحذير قبل انتهاء الجلسة، افتراضي دقيقة واحدة
  onTimeout?: () => void;
  onWarning?: () => void;
}

export const useSessionTimeout = ({
  timeout = 5 * 60 * 1000, // 5 دقائق
  warningTime = 1 * 60 * 1000, // دقيقة واحدة
  onTimeout,
  onWarning
}: UseSessionTimeoutOptions = {}) => {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // تسجيل الخروج وإعادة التوجيه لصفحة تسجيل الدخول
  const logout = useCallback(() => {
    // مسح التوكن من localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    // عرض رسالة انتهاء الجلسة
    toast.error('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
    
    // استدعاء callback إذا تم تمريره
    if (onTimeout) {
      onTimeout();
    }
    
    // إعادة التوجيه لصفحة تسجيل الدخول مع إعادة تحميل الصفحة
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }, [onTimeout]);

  // عرض تحذير قبل انتهاء الجلسة
  const showWarning = useCallback(() => {
    toast.error('ستنتهي جلسة العمل خلال دقيقة واحدة. قم بأي نشاط للمتابعة.');
    
    if (onWarning) {
      onWarning();
    }
  }, [onWarning]);

  // إعادة تعيين مؤقت الجلسة
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // مسح المؤقتات السابقة
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
    
    // تعيين مؤقت التحذير
    warningRef.current = setTimeout(() => {
      showWarning();
    }, timeout - warningTime);
    
    // تعيين مؤقت انتهاء الجلسة
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeout);
  }, [timeout, warningTime, logout, showWarning]);

  // تتبع نشاط المستخدم
  useEffect(() => {
    // التحقق من وجود التوكن
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return;
    }


    // قائمة الأحداث التي تدل على نشاط المستخدم
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // معالج الأحداث
    const handleActivity = () => {
      resetTimer();
    };

    // إضافة مستمعي الأحداث
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // بدء المؤقت
    resetTimer();

    // تنظيف المستمعين عند إلغاء التحميل
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [resetTimer]);

  return {
    resetTimer,
    logout,
    lastActivity: lastActivityRef.current
  };
};
