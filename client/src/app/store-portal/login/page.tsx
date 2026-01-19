'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginMutation, storePortalApi } from '@/state/storePortalApi';
import { useDispatch } from 'react-redux';
import { ShoppingBag, AlertCircle, User, Lock } from 'lucide-react';

export default function StoreLoginPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [login, { isLoading }] = useLoginMutation();

    // مسح الـ cache عند فتح صفحة تسجيل الدخول لضمان عدم وجود بيانات قديمة
    useEffect(() => {
        localStorage.removeItem('storeToken');
        dispatch(storePortalApi.util.resetApiState());
    }, [dispatch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        try {
            // مسح التوكن القديم أولاً
            localStorage.removeItem('storeToken');

            // مسح جميع الـ cache
            dispatch(storePortalApi.util.resetApiState());

            const result = await login({ username, password }).unwrap();

            // حفظ التوكن الجديد
            localStorage.setItem('storeToken', result.token);

            // إعادة تحميل الصفحة لضمان مسح جميع البيانات القديمة
            window.location.href = '/store-portal/dashboard';
        } catch (err: any) {
            const apiError = err?.data;
            if (apiError?.error === 'STORE_DEACTIVATED') {
                setErrorMessage(apiError.message || 'المحل غير نشط. يرجى التواصل مع شركة التقازي للتفعيل.');
            } else if (apiError?.error === 'ACCOUNT_DEACTIVATED') {
                setErrorMessage(apiError.message || 'الحساب غير نشط. يرجى التواصل مع شركة التقازي.');
            } else if (apiError?.message) {
                setErrorMessage(apiError.message);
            } else {
                setErrorMessage('فشل تسجيل الدخول. يرجى التحقق من البيانات.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4 font-sans" dir="rtl">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-gray-700">
                    <div className="bg-blue-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl mb-4 shadow-sm">
                            <ShoppingBag className="text-blue-600" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">بوابة المحلات</h1>
                        <p className="text-blue-100 mt-2 text-sm">نظام CeramiSys لإدارة مبيعات الوكلاء</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {errorMessage && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                                    <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    اسم المستخدم
                                </label>
                                <div className="relative">
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="أدخل اسم المستخدم"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    كلمة المرور
                                </label>
                                <div className="relative">
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">تذكرني</span>
                                </label>

                                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                    نسيت كلمة المرور؟
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>جاري التحقق...</span>
                                    </>
                                ) : (
                                    'تسجيل الدخول'
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="text-center mt-8 text-slate-400 text-xs">
                    نظام تقني متطور مقدم من <span className="text-blue-600 font-medium">شركة التقازي للرخام والجرانيت</span>
                </p>
            </div>
        </div>
    );
}
