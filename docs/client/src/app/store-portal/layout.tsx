'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Layout,
    FileText,
    Package,
    LogOut,
    Menu,
    X,
    ShoppingBag,
    BarChart3
} from 'lucide-react';

import { useGetCurrentUserQuery, useLogoutMutation, storePortalApi } from '@/state/storePortalApi';
import { useDispatch } from 'react-redux';

export default function StorePortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Fetch current user data - skip if no token
    const token = typeof window !== 'undefined' ? localStorage.getItem('storeToken') : null;
    const { data: currentUser, refetch } = useGetCurrentUserQuery(undefined, {
        skip: !token || pathname === '/store-portal/login',
    });
    
    const [logout] = useLogoutMutation();

    // التحقق من تسجيل الدخول
    useEffect(() => {
        const storedToken = localStorage.getItem('storeToken');
        if (!storedToken && pathname !== '/store-portal/login') {
            router.push('/store-portal/login');
        }
    }, [pathname, router]);

    // التعامل مع الشاشات الصغيرة
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsMobile(true);
                setIsSidebarOpen(false);
            } else {
                setIsMobile(false);
                setIsSidebarOpen(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch (error) {
            // تجاهل أخطاء تسجيل الخروج
        } finally {
            localStorage.removeItem('storeToken');
            dispatch(storePortalApi.util.resetApiState());
            // إعادة تحميل الصفحة لضمان مسح جميع البيانات
            window.location.href = '/store-portal/login';
        }
    };

    if (pathname === '/store-portal/login') {
        return <>{children}</>;
    }

    const menuItems = [
        { icon: Layout, label: 'لوحة التحكم', href: '/store-portal/dashboard' },
        { icon: FileText, label: 'الفواتير', href: '/store-portal/invoices' },
        { icon: Package, label: 'المنتجات', href: '/store-portal/products' },
        { icon: BarChart3, label: 'التقارير', href: '/store-portal/reports' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex" dir="rtl">
            {/* Sidebar Overlay for Mobile */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:static inset-y-0 right-0 z-30 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xl px-4">
                        <ShoppingBag />
                        <span className="truncate">{currentUser?.user?.storeName || 'بوابة المحلات'}</span>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="mb-4 px-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {currentUser?.user?.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {currentUser?.user?.storeName}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">تسجيل خروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {currentUser?.user?.storeName}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
