'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '@/state/storePortalApi';
import { Store, Lock, User } from 'lucide-react';

export default function StoreLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [login, { isLoading, error }] = useLoginMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await login({ username, password }).unwrap();
            localStorage.setItem('storeToken', result.token);
            router.push('/store-portal/dashboard');
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                        <Store className="text-blue-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">بوابة المحلات الخارجية</h1>
                    <p className="text-blue-100 mt-2">تسجيل الدخول لإدارة مبيعاتك</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm text-center">
                                فشل تسجيل الدخول. يرجى التحقق من البيانات.
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                اسم المستخدم
                            </label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="أدخل اسم المستخدم"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="أدخل كلمة المرور"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                                    تذكرني
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                    نسيت كلمة المرور؟
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    جاري تسجيل الدخول...
                                </>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
