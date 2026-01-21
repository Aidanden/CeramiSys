"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/app/redux";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  BarChart3,
  Wallet,
  Receipt,
  CircleDollarSign,
  Users,
  TrendingDown,
  FileText,
  Archive,
  CheckCircle2,
} from "lucide-react";
import {
  useGetSalesStatsQuery,
  useGetSalesByCompanyQuery
} from "@/state/salesApi";
import {
  useGetPurchaseStatsQuery
} from "@/state/purchaseApi";
import {
  useGetCreditSalesStatsQuery
} from "@/state/salePaymentApi";
import {
  useGetTopSellingProductsQuery,
  useGetLowStockProductsQuery
} from "@/state/productsApi";
import {
  useGetUsersSalesStatsQuery,
  useGetComprehensiveChartDataQuery
} from "@/state/dashboardApi";
import {
  useGetMonthlyTreasuryStatsQuery
} from "@/state/treasuryApi";
import { formatArabicNumber, formatArabicCurrency } from "@/utils/formatArabicNumbers";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ==========================================
// مكون البطاقات الإحصائية الرئيسية
// ==========================================
interface MainStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  isLoading?: boolean;
}

const MainStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  isLoading
}: MainStatCardProps) => {
  return (
    <div className="group bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary p-5 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <div className="flex items-center gap-5 relative z-10">
        <div className={`w-14 h-14 ${iconBgColor} rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform duration-500`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-text-primary">
              {isLoading ? (
                <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>
              ) : (
                value
              )}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs font-bold text-slate-500 dark:text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// مكون مبيعات الشركات
// ==========================================
const CompanySalesCards = () => {
  const { data: salesByCompanyData, isLoading } = useGetSalesByCompanyQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={`skeleton-${i}`} className="bg-white dark:bg-surface-primary rounded-3xl p-6 border border-slate-200 dark:border-border-primary animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
              <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const companySales = salesByCompanyData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
        <h2 className="text-xl font-black text-slate-900 dark:text-text-primary tracking-tight">
          أداء مبيعات الشركات
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {companySales.map((company, index) => {
          const gradients = [
            'from-blue-600 to-indigo-700',
            'from-emerald-500 to-teal-700',
            'from-purple-600 to-violet-800',
            'from-amber-500 to-orange-700',
          ];
          const lightGradients = [
            'bg-blue-50 dark:bg-blue-900/10',
            'bg-emerald-50 dark:bg-emerald-900/10',
            'bg-purple-50 dark:bg-purple-900/10',
            'bg-amber-50 dark:bg-amber-900/10',
          ];
          const textColors = [
            'text-blue-600 dark:text-blue-400',
            'text-emerald-600 dark:text-emerald-400',
            'text-purple-600 dark:text-purple-400',
            'text-amber-600 dark:text-amber-400',
          ];
          const gradient = gradients[index % gradients.length];
          const lightBg = lightGradients[index % lightGradients.length];
          const textColor = textColors[index % textColors.length];

          return (
            <div
              key={company.companyId}
              className="group bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-5 hover:shadow-2xl hover:shadow-slate-200 dark:hover:shadow-none transition-all duration-500 relative overflow-hidden active:scale-95"
            >
              <div className="flex items-center gap-4 mb-6 pt-2">
                <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/10 group-hover:rotate-3 transition-transform`}>
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-text-primary leading-tight">{company.companyName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-tighter">{company.companyCode}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className={`${lightBg} rounded-2xl p-3 border border-slate-100 dark:border-white/5`}>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-text-tertiary uppercase mb-1">إجمالي المبيعات</p>
                  <p className={`text-lg font-black ${textColor}`}>
                    {formatArabicCurrency(company.totalRevenue)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-surface-secondary rounded-2xl p-3 border border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-bold text-slate-500 dark:text-text-tertiary uppercase mb-1">الشهر الحالي</p>
                  <p className="text-base font-black text-slate-700 dark:text-text-primary">
                    {formatArabicCurrency(company.monthRevenue)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// مكون الخزائن (المدفوعات والإيداعات)
// ==========================================
const TreasuryCards = () => {
  const { data: treasuryMonthlyStats, isLoading } = useGetMonthlyTreasuryStatsQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={`skeleton-${i}`} className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 animate-pulse">
            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={`item-${j}`} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const payments = treasuryMonthlyStats?.data?.payments || { total: 0, breakdown: [] };
  const revenues = treasuryMonthlyStats?.data?.revenues || { total: 0, breakdown: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
        <h2 className="text-xl font-black text-slate-900 dark:text-text-primary tracking-tight">
          الخزائن والحسابات المصرفية (هذا الشهر)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المدفوعات (مسحوبات) */}
        <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary overflow-hidden shadow-sm hover:shadow-xl hover:shadow-red-500/5 transition-all duration-500 relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="bg-gradient-to-l from-red-500 to-rose-600 px-6 py-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">إجمالي المدفوعات</h3>
                <p className="text-white/70 text-xs font-medium">إجمالي المسحوبات والمصروفات</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5">
                  <TrendingDown className="w-4 h-4 text-white" />
                  <span className="text-base font-black text-white">{formatArabicCurrency(payments.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 relative z-10">
            {payments.breakdown.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {payments.breakdown.map((item, index) => (
                  <div
                    key={`payment-${item.treasuryId}-${index}`}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-white/5 hover:border-red-200 dark:hover:border-red-900/30 hover:bg-red-50/50 dark:hover:bg-red-900/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-surface-primary shadow-sm rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5">
                        {item.type === 'BANK' ? (
                          <CircleDollarSign className="w-5 h-5 text-red-500" />
                        ) : (
                          <Wallet className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-text-primary text-sm">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-wider">{item.type === 'BANK' ? 'حساب مصرفي' : 'خزينة'}</p>
                      </div>
                    </div>
                    <p className="font-black text-red-600 dark:text-red-400 text-sm">{formatArabicCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-text-tertiary text-sm font-medium">لا توجد عمليات صرف مسجلة</p>
              </div>
            )}
          </div>
        </div>

        {/* الإيرادات (إيداعات) */}
        <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="bg-gradient-to-l from-emerald-500 to-teal-600 px-6 py-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">إجمالي الإيرادات</h3>
                <p className="text-white/70 text-xs font-medium">إجمالي الإيداعات والتحصيلات</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span className="text-base font-black text-white">{formatArabicCurrency(revenues.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 relative z-10">
            {revenues.breakdown.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {revenues.breakdown.map((item, index) => (
                  <div
                    key={`revenue-${item.treasuryId}-${index}`}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-white/5 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-surface-primary shadow-sm rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5">
                        {item.type === 'BANK' ? (
                          <CircleDollarSign className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Wallet className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-text-primary text-sm">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-wider">{item.type === 'BANK' ? 'حساب مصرفي' : 'خزينة'}</p>
                      </div>
                    </div>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatArabicCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-text-tertiary text-sm font-medium">لا توجد عمليات إيداع مسجلة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// مكون بطاقة العمليات (يومية/شهرية)
// ==========================================
interface OperationCardProps {
  title: string;
  period: "يوم" | "شهر";
  stats: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }[];
  headerColor: string;
  isLoading?: boolean;
}

const OperationCard = ({
  title,
  period,
  stats,
  headerColor,
  isLoading
}: OperationCardProps) => {
  return (
    <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
      {/* Header */}
      <div className={`${headerColor} px-6 py-5 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
        <div className="flex items-center justify-between relative z-10">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5">
            {period === "يوم" ? (
              <Clock className="w-4 h-4 text-white" />
            ) : (
              <Calendar className="w-4 h-4 text-white" />
            )}
            <span className="text-sm font-black text-white uppercase tracking-tighter">
              {period === "يوم" ? "اليوم" : "هذا الشهر"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-surface-secondary rounded-2xl p-4 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-surface-primary hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 bg-white dark:bg-surface-primary rounded-lg border border-slate-100 dark:border-white/5">
                  <stat.icon className={`w-4 h-4 ${stat.color || 'text-blue-600 dark:text-blue-400'}`} />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                ) : (
                  <span className="text-xl font-black text-slate-800 dark:text-text-primary">{stat.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// مكون الأصناف الأكثر مبيعاً
// ==========================================
const TopSellingProducts = () => {
  const { data: topProductsData, isLoading } = useGetTopSellingProductsQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 animate-pulse">
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const topProducts = topProductsData?.data || [];

  return (
    <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-text-primary uppercase tracking-tight">الأصناف الأكثر مبيعاً</h3>
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={`product-${product.productId}-${index}`}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-surface-primary hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div>
                  <p className="font-black text-slate-800 dark:text-text-primary text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{product.productName}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-wider">{product.sku}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-text-primary text-sm">{formatArabicNumber(product.totalQuantitySold)} {product.unit}</p>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{formatArabicCurrency(product.totalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-surface-secondary rounded-3xl border border-dashed border-slate-200 dark:border-border-primary">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-text-tertiary font-bold text-sm">لا توجد بيانات مبيعات حالية</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// مكون الأصناف منخفضة المخزون
// ==========================================
const LowStockProducts = () => {
  const { data: lowStockData, isLoading } = useGetLowStockProductsQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 animate-pulse">
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const lowStockProducts = lowStockData?.data || [];

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
      case 'CRITICAL':
        return 'bg-orange-500 text-white shadow-lg shadow-orange-500/20';
      case 'LOW':
        return 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-text-tertiary';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK': return 'نفد';
      case 'CRITICAL': return 'حرج جداً';
      case 'LOW': return 'منخفض';
      default: return 'عادي';
    }
  };

  return (
    <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-text-primary uppercase tracking-tight">تنبيهات المخزون</h3>
        </div>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="space-y-3">
          {lowStockProducts.map((product, index) => (
            <div
              key={`low-stock-${product.productId}-${index}`}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-surface-primary hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white dark:bg-surface-primary shadow-sm rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/10 transition-colors">
                  <Package className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-black text-slate-800 dark:text-text-primary text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{product.productName}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-wider">{product.sku}</p>
                </div>
              </div>
              <div className="text-left flex flex-col items-end gap-1">
                <span className="font-black text-slate-900 dark:text-text-primary text-sm">
                  {formatArabicNumber(product.currentStock)} {product.unit}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStockStatusColor(product.stockStatus)}`}>
                  {getStockStatusText(product.stockStatus)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-dashed border-emerald-200 dark:border-emerald-900/30">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 dark:text-emerald-900/30 mx-auto mb-3" />
          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">المخزون في حالة ممتازة</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// مكون مبيعات المستخدمين
// ==========================================
const UsersSalesCard = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: usersData, isLoading } = useGetUsersSalesStatsQuery({
    year: selectedYear,
    month: selectedMonth
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
  ];

  return (
    <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative group">
      <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-text-primary uppercase tracking-tight">مبيعات الموظفين</h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary">تحليل أداء فريق العمل</p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-slate-50 dark:bg-surface-secondary rounded-2xl border border-slate-100 dark:border-white/5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 bg-transparent text-xs font-black text-slate-700 dark:text-text-primary border-none focus:ring-0 cursor-pointer"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value} className="dark:bg-surface-primary">{month.label}</option>
            ))}
          </select>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 self-center"></div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-transparent text-xs font-black text-slate-700 dark:text-text-primary border-none focus:ring-0 cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year} className="dark:bg-surface-primary">{formatArabicNumber(year)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Chips */}
      {usersData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 relative z-10">
          <div className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-2xl p-4 border border-purple-100/50 dark:border-purple-500/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase mb-1">إجمالي المبيعات</p>
              <p className="text-base font-black text-purple-900 dark:text-purple-300">{formatArabicCurrency(usersData.data.summary.totalRevenue)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-200 dark:text-purple-900/30" />
          </div>
          <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-500/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">إجمالي الفواتير</p>
              <p className="text-base font-black text-blue-900 dark:text-blue-300">{formatArabicNumber(usersData.data.summary.totalInvoices)}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-200 dark:text-blue-900/30" />
          </div>
          <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 rounded-2xl p-4 border border-emerald-100/50 dark:border-emerald-500/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">الموظفين النشطين</p>
              <p className="text-base font-black text-emerald-900 dark:text-emerald-300">{formatArabicNumber(usersData.data.summary.activeUsers)}</p>
            </div>
            <Users className="w-8 h-8 text-emerald-200 dark:text-emerald-900/30" />
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={`skeleton-${i}`} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : usersData?.data?.users && usersData.data.users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {usersData.data.users.map((user, index) => (
              <div
                key={`user-${user.userId}-${index}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-surface-primary hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg group-hover:scale-110 transition-transform">
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-text-primary text-sm line-clamp-1">{user.fullName}</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-text-tertiary uppercase tracking-tighter">{user.companyName}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-purple-600 dark:text-purple-400 text-sm">{formatArabicCurrency(user.totalSales)}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-text-tertiary uppercase">{formatArabicNumber(user.salesCount)} فاتورة</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-surface-secondary rounded-3xl border border-dashed border-slate-200 dark:border-border-primary">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-text-tertiary font-bold text-sm">لم يتم تسجيل مبيعات في هذه الفترة</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// مكون الرسم البياني الشامل
// ==========================================
const ComprehensiveChart = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: chartData, isLoading } = useGetComprehensiveChartDataQuery({ year: selectedYear });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="bg-white dark:bg-surface-primary rounded-3xl border border-slate-200 dark:border-border-primary p-6 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden group">
      <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-text-primary uppercase tracking-tight">نظرة شاملة على العمليات</h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-text-tertiary">تحليل المبيعات والمصروفات سنوياً</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-surface-secondary px-4 py-2 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-xs font-black text-slate-700 dark:text-text-primary border-none focus:ring-0 cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year} className="dark:bg-surface-primary">
                {formatArabicNumber(year)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Mini Cards */}
      {chartData?.data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8 relative z-10">
          {[
            { label: 'المبيعات', val: chartData.data.yearTotals.sales, color: 'emerald', icon: TrendingUp },
            { label: 'المشتريات', val: chartData.data.yearTotals.purchases, color: 'purple', icon: ShoppingCart },
            { label: 'المصروفات', val: chartData.data.yearTotals.badDebts, color: 'orange', icon: CircleDollarSign },
            { label: 'التالف', val: chartData.data.yearTotals.damages, color: 'red', icon: Archive },
            { label: 'المردودات', val: chartData.data.yearTotals.returns, color: 'amber', icon: TrendingDown },
          ].map((item, i) => (
            <div key={i} className={`bg-${item.color}-500/5 rounded-2xl p-3 border border-${item.color}-500/10 flex flex-col gap-1`}>
              <div className="flex items-center gap-1.5 opacity-70">
                <item.icon className={`w-3 h-3 text-${item.color}-600 dark:text-${item.color}-400`} />
                <p className="text-[9px] font-black text-slate-500 dark:text-text-tertiary uppercase tracking-wider">{item.label}</p>
              </div>
              <p className={`text-xs font-black text-${item.color}-700 dark:text-${item.color}-300`}>{formatArabicCurrency(item.val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="h-80 bg-slate-50 dark:bg-surface-secondary animate-pulse rounded-2xl"></div>
        ) : chartData?.data ? (
          <div className="h-80 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis
                  dataKey="monthName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '11px',
                    fontWeight: 800,
                    direction: 'rtl'
                  }}
                  formatter={(value: any) => [formatArabicCurrency(value), '']}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="المبيعات" barSize={12} />
                <Bar dataKey="purchases" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="المشتريات" barSize={12} />
                <Bar dataKey="badDebts" fill="#f97316" radius={[4, 4, 0, 0]} name="المصروفات" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-text-tertiary font-bold">لا يوجد بيانات للرسم البياني</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// الصفحة الرئيسية
// ==========================================
const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);

  // جلب البيانات من APIs
  const { data: salesStats, isLoading: salesLoading } = useGetSalesStatsQuery();
  const { data: purchaseStats, isLoading: purchaseLoading } = useGetPurchaseStatsQuery({});
  const { data: creditStats, isLoading: creditLoading } = useGetCreditSalesStatsQuery();
  const { data: treasuryMonthlyStats, isLoading: treasuryLoading } = useGetMonthlyTreasuryStatsQuery();

  // تحضير بيانات عمليات اليوم
  const dailyOperationsStats = [
    {
      label: "إجمالي المبيعات",
      value: formatArabicCurrency(salesStats?.data?.todayRevenue || 0),
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      label: "عدد الفواتير",
      value: formatArabicNumber(salesStats?.data?.todaySales || 0),
      icon: Receipt,
      color: "text-indigo-600"
    },
  ];

  // تحضير بيانات عمليات الشهر
  const monthlyOperationsStats = [
    {
      label: "إجمالي المشتريات",
      value: formatArabicCurrency(purchaseStats?.data?.totalInvoicesValue || 0),
      icon: ShoppingCart,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      label: "عدد الفواتير",
      value: formatArabicNumber(purchaseStats?.data?.totalInvoices || 0),
      icon: Receipt,
      color: "text-blue-600 dark:text-blue-400"
    },
  ];

  const creditOpsStats = [
    {
      label: "تحصيلات اليوم",
      value: formatArabicCurrency(creditStats?.data?.todayPayments || 0),
      icon: CircleDollarSign,
      color: "text-emerald-600 dark:text-emerald-400"
    },
    {
      label: "مبيعات آجل (اليوم)",
      value: formatArabicCurrency(creditStats?.data?.todayCreditSales || 0),
      icon: CreditCard,
      color: "text-amber-600 dark:text-amber-400"
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8 bg-[#f8fafc] dark:bg-slate-950 min-h-screen">
      {/* Hero Welcome Section */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-600/5 dark:to-indigo-600/5 rounded-[40px] blur-3xl transition-all duration-1000 group-hover:duration-500 group-hover:from-blue-600/20 group-hover:to-indigo-600/20"></div>
        <div className="relative bg-white dark:bg-surface-primary rounded-[32px] p-8 border border-slate-200 dark:border-border-primary shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mt-32"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mb-32"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-500/20 mb-6">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ">لوحة التحكم النشطة</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-text-primary mb-4 leading-tight">
                أهلاً بك مجدداً، <br />
                <span className="bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {user?.firstName || "المستخدم"}
                </span> 👋
              </h1>
              <p className="text-slate-500 dark:text-text-secondary font-bold text-lg max-w-xl leading-relaxed">
                CeramiSys يوفر لك نظرة شاملة وتحليلات دقيقة لمبيعاتك ومخزونك لحظة بلحظة.
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-4 min-w-[240px]">
              <div className="bg-slate-50 dark:bg-surface-secondary p-5 rounded-3xl border border-slate-100 dark:border-white/5 w-full">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-white dark:bg-surface-primary rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/10">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-text-tertiary uppercase tracking-widest leading-none">تاريخ اليوم</p>
                    <p className="font-black text-slate-900 dark:text-text-primary text-base">
                      {new Date().toLocaleDateString('ar-LY', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-text-tertiary text-center lg:text-right">
                  {new Date().toLocaleDateString('ar-LY', { year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MainStatCard
          title="مبيعات اليوم"
          value={formatArabicCurrency(salesStats?.data?.todayRevenue || 0)}
          subtitle={`${formatArabicNumber(salesStats?.data?.todaySales || 0)} فاتورة مسجلة`}
          icon={TrendingUp}
          iconBgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
          isLoading={salesLoading}
        />
        <MainStatCard
          title="تحصيلات النقدية"
          value={formatArabicCurrency(creditStats?.data?.todayPayments || 0)}
          subtitle="إجمالي المقبوضات اليوم"
          icon={CircleDollarSign}
          iconBgColor="bg-gradient-to-br from-blue-500 to-indigo-600"
          isLoading={creditLoading}
        />
        <MainStatCard
          title="المبيعات الآجلة"
          value={formatArabicCurrency(creditStats?.data?.todayCreditSales || 0)}
          subtitle="الذمم المدينة المسجلة اليوم"
          icon={CreditCard}
          iconBgColor="bg-gradient-to-br from-amber-500 to-orange-600"
          isLoading={creditLoading}
        />
        <MainStatCard
          title="إجمالي المشتريات"
          value={formatArabicCurrency(purchaseStats?.data?.totalInvoicesValue || 0)}
          subtitle={`${formatArabicNumber(purchaseStats?.data?.totalInvoices || 0)} فاتورة مشتريات`}
          icon={ShoppingCart}
          iconBgColor="bg-gradient-to-br from-purple-500 to-violet-600"
          isLoading={purchaseLoading}
        />
      </div>

      {/* مبيعات الشركات */}
      <CompanySalesCards />

      {/* الخزائن (المدفوعات والإيداعات) */}
      <TreasuryCards />

      {/* كروت العمليات اليومية والشهرية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationCard
          title="تتبع المبيعات اليومية"
          period="يوم"
          stats={dailyOperationsStats}
          headerColor="bg-gradient-to-l from-blue-600 to-indigo-700"
          isLoading={salesLoading}
        />
        <OperationCard
          title="ملخص المشتريات للشهر"
          period="شهر"
          stats={monthlyOperationsStats}
          headerColor="bg-gradient-to-l from-indigo-600 to-purple-700"
          isLoading={salesLoading || treasuryLoading}
        />
      </div>

      {/* مبيعات المستخدمين */}
      <UsersSalesCard />

      {/* الرسم البياني الشامل */}
      <ComprehensiveChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingProducts />
        <LowStockProducts />
      </div>
    </div>
  );
};

export default Dashboard;
