"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export const TestSessionTimeout: React.FC = () => {
  const [countdown, setCountdown] = useState(10);
  const [isActive, setIsActive] = useState(false);
  const router = useRouter();

  const startTest = () => {
    console.log('🧪 Starting session timeout test');
    setIsActive(true);
    setCountdown(10);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        console.log(`⏱️ Countdown: ${prev - 1}`);
        if (prev <= 1) {
          clearInterval(interval);
          console.log('🚪 Test timeout reached - logging out');
          
          // مسح التوكن
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
          
          toast.error('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
          router.push('/login');
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTest = () => {
    console.log('🔄 Resetting test');
    setIsActive(false);
    setCountdown(10);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <h3 className="font-bold mb-2">اختبار انتهاء الجلسة</h3>
      
      {!isActive ? (
        <button
          onClick={startTest}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          بدء الاختبار (10 ثوان)
        </button>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">
            {countdown}
          </div>
          <button
            onClick={resetTest}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            إيقاف الاختبار
          </button>
        </div>
      )}
    </div>
  );
};
