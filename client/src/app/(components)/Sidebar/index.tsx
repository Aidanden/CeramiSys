"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import {
  Layout,
  LucideIcon,
  Menu,
  RepeatIcon,
  CircleDollarSign,
  SquareUserRound,
  DollarSign,
  UsersRound,
  ShoppingCart,
  TrendingDown,
  CreditCard,
  FileText,
  Shield,
  Home,
  Building2,
  ShoppingBag,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Wallet,
  TrendingDown as Returns,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import Link from "next/link";
interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href}>
      <div
        className={`relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group hover:bg-blue-50 ${
          isActive
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
            : "text-slate-700 hover:text-blue-700"
        } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? label : ""}
      >
        <Icon
          className={`h-5 w-5 transition-colors shrink-0 ${
            isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"
          }`}
        />
        <span
          className={`font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          } ${isActive ? "text-white" : "text-slate-700 group-hover:text-blue-700"}`}
        >
          {label}
        </span>
        {isActive && !isCollapsed && (
          <div className="absolute left-2 w-1 h-8 bg-white rounded-full"></div>
        )}
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const sidebarClassNames = `fixed right-0 top-0 flex flex-col bg-white transition-all duration-300 h-screen shadow-xl border-l border-slate-200 z-40 ${
    isSidebarCollapsed ? "w-16" : "w-64"
  }`;

  return (
    <div className={sidebarClassNames}>
      {/* TOP LOGO & HEADER */}
      <div className="relative">
        <div
          className={`flex items-center transition-all duration-300 pt-5 pb-5 border-b border-slate-200 ${
            isSidebarCollapsed ? "px-2 flex-col gap-3" : "px-5 gap-3"
          }`}
        >
          {/* Logo */}
          <div className={`transition-all duration-300 shrink-0 ${
            isSidebarCollapsed ? "w-12 h-12" : "w-11 h-11"
          }`}>
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10"></div>
              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Text - يختفي عند التصغير */}
          <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden ${
            isSidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
          }`}>
            <h1 className="font-bold text-lg text-slate-800 truncate leading-tight">
              نظام إدارة
            </h1>
            <p className="text-xs text-slate-500 truncate mt-0.5">CeramiSys</p>
          </div>
        </div>

        {/* زر التصغير/التكبير - موضع ثابت */}
        <button
          className={`group absolute top-1/2 -translate-y-1/2 transition-all duration-300 flex items-center justify-center z-10 ${
            isSidebarCollapsed ? "left-1/2 -translate-x-1/2 w-12 h-12" : "left-4 w-8 h-8"
          }`}
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
        >
          <div className={`flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 shadow-sm hover:shadow-md ${
            isSidebarCollapsed ? "w-10 h-10" : "w-8 h-8"
          }`}>
            <svg 
              className={`text-slate-600 group-hover:text-blue-600 transition-all duration-300 pointer-events-none ${
                isSidebarCollapsed ? "w-5 h-5 rotate-180" : "w-4 h-4"
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
          <SidebarLink
            href="/dashboard"
            icon={Home}
            label="الرئيسية"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/companies"
            icon={Building2}
            label="إدارة الشركات"
            isCollapsed={isSidebarCollapsed}
          />
         
          <SidebarLink
            href="/products"
            icon={ShoppingBag}
            label="الأصناف والمخزن"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/sales"
            icon={ShoppingCart}
            label="المبيعات"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/accountant"
            icon={CreditCard}
            label="مساحة عمل المحاسب"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/warehouse-dispatch"
            icon={Layout}
            label="أوامر صرف المخزن"
            isCollapsed={isSidebarCollapsed}
          />
        {/*  <SidebarLink
            href="/inter-company-sales"
            icon={ArrowRightLeft}
            label="مبيعات بين الشركات"
            isCollapsed={isSidebarCollapsed}
          /> */}
          
          <SidebarLink
            href="/complex-inter-company-sales"
            //href="/inter-company-sales"
            icon={ArrowRightLeft}
            label="المبيعات من الشركة الام"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/sale-returns"
            icon={Returns}
            label="المردودات"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/purchases"
            icon={CreditCard}
            label="المشتريات"
            isCollapsed={isSidebarCollapsed}
          />
        
          <SidebarLink
            href="/customers"
            icon={SquareUserRound}
            label="العملاء"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/suppliers"
            icon={UsersRound}
            label="الموردين"
            isCollapsed={isSidebarCollapsed}
          />
       
          <SidebarLink
            href="/reports"
            icon={BarChart3}
            label="التقارير"
            isCollapsed={isSidebarCollapsed}
          />
        </nav>

        {/* Settings Section */}
        <div className={`mt-8 ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
          <div className={`border-t border-slate-200 pt-4 transition-all duration-300 ${
            isSidebarCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          }`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              الإعدادات
            </h3>
          </div>
          <SidebarLink
            href="/users"
            icon={UsersRound}
            label="إدارة المستخدمين"
            isCollapsed={isSidebarCollapsed}
          />
           <SidebarLink
            href="/notifications"
            icon={Bell}
            label="الإشعارات"
            isCollapsed={isSidebarCollapsed}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className={`border-t border-slate-200 p-4 transition-all duration-300 ${
        isSidebarCollapsed ? "opacity-0 h-0 overflow-hidden p-0" : "opacity-100"
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