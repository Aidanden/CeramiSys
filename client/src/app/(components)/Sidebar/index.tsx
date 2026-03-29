"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetCurrentUserQuery } from "@/state/authApi";
import { useGetUserScreensQuery } from "@/state/permissionsApi";
import { hasScreenAccess } from "@/types/permissions";
import {
  Layout,
  LucideIcon,
  CircleDollarSign,
  UsersRound,
  ShoppingCart,
  CreditCard,
  FileText,
  Home,
  Building2,
  ShoppingBag,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Wallet,
  TrendingDown,
  TrendingDown as Returns,
  FileText as Receipt,
  Shield,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import Link from "next/link";
import { useGetSalesQuery } from "@/state/salesApi";
import { useGetDispatchOrdersQuery, useGetReturnOrdersQuery } from "@/state/warehouseApi";
import { useGetPaymentReceiptsQuery } from "@/state/api/paymentReceiptsApi";
import { useGetInvoiceStatsQuery } from "@/state/externalStoreInvoicesApi";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  badgeCount?: number;
}

const SidebarLink = React.memo(({
  href,
  icon: Icon,
  label,
  isCollapsed,
  badgeCount,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href}>
      <div
        className={`relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group ${isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg dark:from-blue-500 dark:to-indigo-500"
          : "text-slate-700 dark:text-text-secondary hover:bg-blue-50 dark:hover:bg-surface-hover hover:text-blue-700 dark:hover:text-blue-400"
          } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? label : ""}
      >
        <Icon
          className={`h-5 w-5 transition-colors shrink-0 ${isActive
            ? "text-white"
            : "text-slate-500 dark:text-text-tertiary group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }`}
        />
        <span
          className={`font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            } ${isActive
              ? "text-white"
              : "text-slate-700 dark:text-text-secondary group-hover:text-blue-700 dark:group-hover:text-blue-400"
            }`}
        >
          {label}
        </span>
        {badgeCount !== undefined && badgeCount > 0 && !isCollapsed && (
          <span className="mr-auto bg-red-500 dark:bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm animate-pulse">
            {badgeCount}
          </span>
        )}
        {badgeCount !== undefined && badgeCount > 0 && isCollapsed && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 dark:bg-red-600 rounded-full border border-white dark:border-gray-800"></div>
        )}
        {isActive && !isCollapsed && (
          <div className="absolute left-2 w-1 h-8 bg-white dark:bg-gray-200 rounded-full"></div>
        )}
      </div>
    </Link>
  );
});

SidebarLink.displayName = 'SidebarLink';

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );

  // جلب بيانات المستخدم الحالي
  const { data: userData } = useGetCurrentUserQuery();
  const user = userData?.data;
  const isParentCompany = user?.company?.parentId === null; // الشركة الأم ليس لها parentId

  // جلب طريقة حساب التكلفة من localStorage
  const [costCalculationMethod, setCostCalculationMethod] = React.useState<'manual' | 'invoice'>('manual');

  React.useEffect(() => {
    const savedMethod = localStorage.getItem('costCalculationMethod');
    setCostCalculationMethod((savedMethod as 'manual' | 'invoice') || 'manual');
  }, []);

  // جلب الشاشات المصرح بها للمستخدم أولاً
  const { data: userScreensData, isLoading: isLoadingScreens, error: screensError } = useGetUserScreensQuery(undefined, {
    skip: !user // تخطي الجلب إذا لم يكن هناك مستخدم مسجل
  });
  const authorizedScreens = React.useMemo(
    () => userScreensData?.screens || [],
    [userScreensData?.screens]
  );

  // جلب عدد الفواتير المعلقة (DRAFT)
  const { data: pendingSalesData } = useGetSalesQuery({
    status: 'DRAFT',
    limit: 1,
    // فلتر حسب الشركة الحالية إذا لم يكن System User
    companyId: user?.isSystemUser ? undefined : user?.companyId
  }, {
    // تحديث البيانات كل 10 ثواني للاستجابة السريعة
    pollingInterval: 10000,
    refetchOnFocus: true,
    skip: !user || !authorizedScreens.some(s => s.permission === 'screen.sales' || s.permission === 'screen.all')
  });
  const pendingCount = pendingSalesData?.data?.pagination?.total || 0;

  // جلب عدد أوامر الصرف المعلقة
  const { data: pendingDispatchData } = useGetDispatchOrdersQuery({
    status: 'PENDING',
    limit: 1,
  }, {
    pollingInterval: 10000,
    refetchOnFocus: true,
    skip: !user || !authorizedScreens.some(s => s.permission === 'screen.warehouse_dispatch' || s.permission === 'screen.all')
  });
  const pendingDispatchCount = pendingDispatchData?.data?.pagination?.total || 0;

  // جلب عدد أوامر الاستلام المعلقة
  const { data: pendingReturnData } = useGetReturnOrdersQuery({
    status: 'PENDING',
    limit: 1,
  }, {
    pollingInterval: 10000,
    refetchOnFocus: true,
    skip: !user || !authorizedScreens.some(s => s.permission === 'screen.warehouse_returns' || s.permission === 'screen.all')
  });
  const pendingReturnCount = pendingReturnData?.data?.pagination?.total || 0;

  // إجمالي الأوامر المعلقة للمخزن
  const totalPendingWarehouseOrders = pendingDispatchCount + pendingReturnCount;

  // جلب عدد إيصالات الدفع المعلقة
  const { data: pendingPaymentReceiptsData } = useGetPaymentReceiptsQuery({
    status: 'PENDING',
    limit: 1,
  }, {
    pollingInterval: 2000,
    refetchOnFocus: true,
    skip: !user || !authorizedScreens.some(s => s.permission === 'screen.payment_receipts' || s.permission === 'screen.all')
  });
  const pendingPaymentReceiptsCount = pendingPaymentReceiptsData?.pagination?.total || 0;

  // جلب إحصائيات فواتير المحلات الخارجية
  const { data: externalStoreInvoicesStats } = useGetInvoiceStatsQuery(undefined, {
    pollingInterval: 10000,
    refetchOnFocus: true,
    skip: !user || !authorizedScreens.some(s => s.permission === 'screen.external_store_invoices' || s.permission === 'screen.all')
  });
  const pendingExternalInvoicesCount = externalStoreInvoicesStats?.pendingInvoices || 0;

  // Debug logging - تفعيل للتشخيص
  React.useEffect(() => {
    console.log('🔍 Sidebar Debug:', {
      user: user ? { id: user.id, username: user.username, permissions: user.permissions } : null,
      isLoadingScreens,
      screensError: screensError ? 'Error exists' : null,
      authorizedScreensCount: authorizedScreens.length,
      authorizedScreens: authorizedScreens.map(s => ({ route: s.route, permission: s.permission })),
      userScreensData: userScreensData
    });
  }, [user, isLoadingScreens, screensError, authorizedScreens, userScreensData]);

  // التحقق من صلاحية الوصول لشاشة معينة
  const canAccessScreen = (route: string) => {
    // إذا لا يوجد مستخدم، لا نعرض الشاشة
    if (!user) {
      return false;
    }

    // إذا كان جاري التحميل ولا توجد بيانات بعد، ننتظر
    if (isLoadingScreens && authorizedScreens.length === 0) {
      return false; // لا نعرض الشاشة حتى يتم تحميل الصلاحيات
    }

    // إذا كان هناك خطأ في جلب الصلاحيات، نستخدم صلاحيات المستخدم من Redux
    if (screensError && user.permissions) {
      // استخدام الصلاحيات من user object مباشرة كـ fallback
      const hasAllAccess = user.permissions.includes('screen.all');
      if (hasAllAccess) return true;
      
      // التحقق من الصلاحية المحددة للشاشة
      const screenPermission = `screen.${route.replace('/', '')}`;
      return user.permissions.includes(screenPermission);
    }

    // التحقق من الصلاحية من authorizedScreens
    return hasScreenAccess(authorizedScreens, route);
  };

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const sidebarClassNames = `fixed right-0 top-0 flex flex-col bg-white dark:bg-surface-primary transition-all duration-300 h-screen shadow-xl border-l border-slate-200 dark:border-border-primary z-40 ${isSidebarCollapsed ? "w-16" : "w-64"
    }`;

  return (
    <div className={sidebarClassNames}>
      {/* TOP LOGO & HEADER */}
      <div className="relative">
        <div
          className={`flex items-center transition-all duration-300 pt-5 pb-5 border-b border-slate-200 dark:border-border-primary ${isSidebarCollapsed ? "px-2 flex-col gap-3" : "px-5 gap-3"
            }`}
        >
          {/* Logo */}
          <div className={`transition-all duration-300 shrink-0 ${isSidebarCollapsed ? "w-12 h-12" : "w-11 h-11"
            }`}>
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-500 dark:via-blue-600 dark:to-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 dark:bg-white/20"></div>
              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Text - يختفي عند التصغير */}
          <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            }`}>
            <h1 className="font-bold text-lg text-slate-800 dark:text-text-primary truncate leading-tight">
              نظام إدارة
            </h1>
            <p className="text-xs text-slate-500 dark:text-text-tertiary truncate mt-0.5">CeramiSys</p>
          </div>
        </div>

        {/* زر التصغير/التكبير - موضع ثابت */}
        <button
          className={`group absolute top-1/2 -translate-y-1/2 transition-all duration-300 flex items-center justify-center z-10 ${isSidebarCollapsed ? "left-1/2 -translate-x-1/2 w-12 h-12" : "left-4 w-8 h-8"
            }`}
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
        >
          <div className={`flex items-center justify-center rounded-lg bg-slate-100 dark:bg-surface-secondary hover:bg-blue-50 dark:hover:bg-surface-hover active:bg-blue-100 dark:active:bg-surface-active transition-all duration-200 shadow-sm hover:shadow-md ${isSidebarCollapsed ? "w-10 h-10" : "w-8 h-8"
            }`}>
            <svg
              className={`text-slate-600 dark:text-text-secondary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 pointer-events-none ${isSidebarCollapsed ? "w-5 h-5 rotate-180" : "w-4 h-4"
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <div className="flex-grow py-6 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          {canAccessScreen('/dashboard') && (
            <SidebarLink
              href="/dashboard"
              icon={Home}
              label="الرئيسية"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/companies') && (
            <SidebarLink
              href="/companies"
              icon={Building2}
              label="إدارة الشركات"
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccessScreen('/products') && (
            <SidebarLink
              href="/products"
              icon={ShoppingBag}
              label="الأصناف والمخزن"
              isCollapsed={isSidebarCollapsed}
            />
          )}

          {canAccessScreen('/sales') && (
            <SidebarLink
              href="/sales"
              icon={ShoppingCart}
              label="المبيعات"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/accountant') && (
            <SidebarLink
              href="/accountant"
              icon={CreditCard}
              label="مساحة عمل المحاسب"
              isCollapsed={isSidebarCollapsed}
              badgeCount={pendingCount}
            />
          )}
          {canAccessScreen('/treasury') && (
            <SidebarLink
              href="/treasury"
              icon={Wallet}
              label="حركات الخزينة"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/general-receipts') && (
            <SidebarLink
              href="/general-receipts"
              icon={ArrowRightLeft}
              label="إيصالات خارجية"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/payroll') && (
            <SidebarLink
              href="/payroll"
              icon={UsersRound}
              label="المرتبات والموظفين"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/bad-debts') && (
            <SidebarLink
              href="/bad-debts"
              icon={Receipt}
              label="المصروفات المعدومة"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/customer-accounts') && (
            <SidebarLink
              href="/customer-accounts"
              icon={Wallet}
              label="حسابات العملاء"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/supplier-accounts') && (
            <SidebarLink
              href="/supplier-accounts"
              icon={CircleDollarSign}
              label="حسابات الموردين"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/warehouse-dispatch') && (
            <SidebarLink
              href="/warehouse-dispatch"
              icon={Layout}
              label="أوامر صرف المخزن"
              isCollapsed={isSidebarCollapsed}
              badgeCount={totalPendingWarehouseOrders}
            />
          )}


          {/* إخفاء شاشة "المبيعات من الشركة الأم" من الشركة الأم نفسها */}
          {!isParentCompany && canAccessScreen('/complex-inter-company-sales') && (
            <SidebarLink
              href="/complex-inter-company-sales"
              icon={ArrowRightLeft}
              label="المبيعات من الشركة الام"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/sale-returns') && (
            <SidebarLink
              href="/sale-returns"
              icon={Returns}
              label="المردودات"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/purchases') && (
            <SidebarLink
              href="/purchases"
              icon={CreditCard}
              label="المشتريات"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/payment-receipts') && (
            <SidebarLink
              href="/payment-receipts"
              icon={Receipt}
              label="إيصالات الدفع"
              isCollapsed={isSidebarCollapsed}
              badgeCount={pendingPaymentReceiptsCount}
            />
          )}

          {costCalculationMethod === 'manual' && canAccessScreen('/product-cost') && (
            <SidebarLink
              href="/product-cost"
              icon={BarChart3}
              label="تكلفة الأصناف"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {costCalculationMethod === 'invoice' && canAccessScreen('/invoice-cost') && (
            <SidebarLink
              href="/invoice-cost"
              icon={FileText}
              label="تكلفة الفاتورة"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/damage-reports') && (
            <SidebarLink
              href="/damage-reports"
              icon={FileText}
              label="محاضر الإتلاف"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/external-stores') && (
            <SidebarLink
              href="/external-stores"
              icon={Building2}
              label="المحلات الخارجية"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/external-store-invoices') && (
            <SidebarLink
              href="/external-store-invoices"
              icon={FileText}
              label="فواتير المحلات"
              isCollapsed={isSidebarCollapsed}
              badgeCount={pendingExternalInvoicesCount}
            />
          )}
          {canAccessScreen('/reports') && (
            <>
              <SidebarLink
                href="/reports"
                icon={BarChart3}
                label="التقارير"
                isCollapsed={isSidebarCollapsed}
              />

            </>
          )}
        </nav>

        {/* Settings Section */}
        <div className={`mt-8 ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
          <div className={`border-t border-slate-200 pt-4 transition-all duration-300 ${isSidebarCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
            }`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              الإعدادات
            </h3>
          </div>



          {canAccessScreen('/users') && (
            <SidebarLink
              href="/users"
              icon={UsersRound}
              label="إدارة المستخدمين"
              isCollapsed={isSidebarCollapsed}
            />
          )}
          {canAccessScreen('/notifications') && (
            <SidebarLink
              href="/notifications"
              icon={Bell}
              label="الإشعارات"
              isCollapsed={isSidebarCollapsed}
            />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className={`border-t border-slate-200 p-4 transition-all duration-300 ${isSidebarCollapsed ? "opacity-0 h-0 overflow-hidden p-0" : "opacity-100"
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-slate-600">CS</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              CeramiSys v1.0
            </p>
            <p className="text-xs text-slate-500 truncate">
              ARABTECH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;