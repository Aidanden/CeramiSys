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
        }`}
      >
        <Icon
          className={`h-5 w-5 transition-colors ${
            isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"
          }`}
        />
        <span
          className={`font-medium transition-all duration-200 ${
            isCollapsed ? "hidden" : "block"
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

  const sidebarClassNames = `fixed right-0 top-0 flex flex-col ${
    isSidebarCollapsed ? "w-0 md:w-16" : "w-72 md:w-64"
  } bg-white transition-all duration-300 overflow-hidden h-screen shadow-xl border-l border-slate-200 z-40`;

  return (
    <div className={sidebarClassNames}>
      {/* TOP LOGO */}
      <div
        className={`flex gap-3 justify-between md:justify-normal items-center pt-6 pb-6 border-b border-slate-100 ${
          isSidebarCollapsed ? "px-3" : "px-6"
        }`}
      >
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className={`${isSidebarCollapsed ? "hidden" : "block"} flex-1`}>
          <h1 className="font-bold text-lg text-slate-900">
            نظام إدارة
          </h1>
          <p className="text-xs text-slate-500">CeramiSys</p>
        </div>
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <div className="flex-grow py-6">
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
            href="/provisional-sales"
            icon={Wallet}
            label="الفواتير المبدئية"
            isCollapsed={isSidebarCollapsed}
          />
          <SidebarLink
            href="/credit-sales"
            icon={FileText}
            label="المبيعات الآجلة"
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
            icon={ArrowRightLeft}
            label="المبيعات من الشركة الام"
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
          <div className={`border-t border-slate-200 pt-4 ${isSidebarCollapsed ? "hidden" : "block"}`}>
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
          <SidebarLink
            href="/settings"
            icon={Shield}
            label="الإعدادات"
            isCollapsed={isSidebarCollapsed}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className={`border-t border-slate-200 p-4 ${isSidebarCollapsed ? "hidden" : "block"}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
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