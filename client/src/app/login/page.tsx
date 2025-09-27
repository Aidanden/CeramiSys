"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { useLoginMutation } from "@/state/authApi";
import { loginStart, loginSuccess, loginFailure, resetLoadingStates } from "@/state/authSlice";

const LoginPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);
  const [login] = useLoginMutation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  // إعادة التوجيه إذا كان المستخدم مسجل دخول بالفعل
  useEffect(() => {
    // إعادة تعيين حالات التحميل عند تحميل صفحة تسجيل الدخول
    dispatch(resetLoadingStates());
    
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      alert("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    dispatch(loginStart());

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
        rememberMe: formData.rememberMe,
      }).unwrap();

      if (result.success && result.data) {
        // حفظ الـ token وبيانات المستخدم في localStorage
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        
        // تحديث Redux state
        dispatch(loginSuccess({
          user: result.data.user,
          token: result.data.token,
        }));
        
        // سيتم التوجيه مباشرة بعد النجاح
        router.push("/dashboard");
      } else {
        dispatch(loginFailure(result.message || "خطأ في تسجيل الدخول"));
        alert(result.message || "خطأ في تسجيل الدخول");
      }
    } catch (err: any) {
      const errorMessage = err?.data?.message || "خطأ في اسم المستخدم أو كلمة المرور";
      dispatch(loginFailure(errorMessage));
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">مرحباً بعودتك</h1>
            <p className="text-slate-600">قم بتسجيل الدخول إلى حسابك</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2 text-right">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input text-right pr-10 pl-10"
                  placeholder="أدخل اسم المستخدم"
                  dir="rtl"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input text-right pr-10 pl-10"
                  placeholder="أدخل كلمة المرور"
                  dir="rtl"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-slate-700">
                  تذكرني
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-r-4 border-red-400 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  جارٍ تسجيل الدخول...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="h-5 w-5" />
                  تسجيل الدخول
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
            &copy; 2025 ARABTECH . جميع الحقوق محفوظة     
                   </p>
          </div>
        </div>
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-20 xl:px-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute inset-0 h-full w-full" fill="currentColor">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="white" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold mb-6 text-right">
            نظام إدارة شامل
          </h2>
          <p className="text-xl mb-8 text-blue-100 text-right leading-relaxed">
            حلول متقدمة لإدارة أعمالك بكفاءة وأمان عالي مع واجهة سهلة الاستخدام
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-right">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-blue-100">إدارة متقدمة للمستخدمين والصلاحيات</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-blue-100">تقارير شاملة وتحليلات ذكية</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-blue-100">أمان عالي المستوى ونسخ احتياطي</span>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
              <span className="text-blue-100">دعم فني متواصل 24/7</span>
            </div>
          </div>

          <div className="mt-12 text-right">
            <p className="text-blue-200 text-sm">
              &copy; 2025 CeramiSys Management System
            </p>
            <p className="text-blue-300 text-xs mt-1">
              جميع الحقوق محفوظة . ARABTECH 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;