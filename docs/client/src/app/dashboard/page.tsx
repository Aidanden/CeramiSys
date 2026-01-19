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
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-text-primary">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-text-tertiary mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center shadow-sm`}>
          <Icon className="w-7 h-7 text-white" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={`skeleton-${i}`} className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const companySales = salesByCompanyData?.data || [];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-text-primary mb-4 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        إجمالي المبيعات لكل شركة
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companySales.map((company, index) => {
          const colors = [
            { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', border: 'border-blue-200', text: 'text-blue-600' },
            { bg: 'bg-gradient-to-br from-emerald-500 to-green-600', border: 'border-emerald-200', text: 'text-emerald-600' },
            { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', border: 'border-purple-200', text: 'text-purple-600' },
            { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', border: 'border-orange-200', text: 'text-orange-600' },
          ];
          const color = colors[index % colors.length];

          return (
            <div
              key={company.companyId}
              className={`bg-white dark:bg-surface-primary rounded-2xl shadow-sm border ${color.border} dark:border-border-primary p-6 hover:shadow-md transition-all duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-text-secondary mb-1">الشركة</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-text-primary">{company.companyName}</p>
                  <p className="text-xs text-slate-400 dark:text-text-tertiary">{company.companyCode}</p>
                </div>
                <div className={`w-12 h-12 ${color.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-surface-secondary rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-text-tertiary mb-1">إجمالي المبيعات</p>
                  <p className={`text-xl font-bold ${color.text}`}>
                    {formatArabicCurrency(company.totalRevenue)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-surface-secondary rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-text-tertiary mb-1">مبيعات الشهر الحالي</p>
                  <p className="text-lg font-semibold text-slate-700 dark:text-text-primary">
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
          <div key={`skeleton-${i}`} className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={`item-${j}`} className="h-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
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
    <div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-text-primary mb-4 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        الخزائن والحسابات المصرفية (هذا الشهر)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المدفوعات (مسحوبات) */}
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="bg-gradient-to-l from-red-500 to-red-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">إجمالي المدفوعات (مسحوبات)</h3>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                <TrendingDown className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">{formatArabicCurrency(payments.total)}</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            {payments.breakdown.length > 0 ? (
              <div className="space-y-2">
                {payments.breakdown.map((item, index) => (
                  <div
                    key={`payment-${item.treasuryId}-${index}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        {item.type === 'BANK' ? (
                          <CircleDollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-text-primary text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-text-tertiary">{item.type === 'BANK' ? 'حساب مصرفي' : 'خزينة'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-red-600 dark:text-red-400 text-sm">{formatArabicCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-text-tertiary">لا توجد مدفوعات</p>
              </div>
            )}
          </div>
        </div>

        {/* الإيرادات (إيداعات) */}
        <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="bg-gradient-to-l from-emerald-500 to-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">إجمالي الإيرادات (إيداعات)</h3>
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">{formatArabicCurrency(revenues.total)}</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            {revenues.breakdown.length > 0 ? (
              <div className="space-y-2">
                {revenues.breakdown.map((item, index) => (
                  <div
                    key={`revenue-${item.treasuryId}-${index}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        {item.type === 'BANK' ? (
                          <CircleDollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-text-primary text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-text-tertiary">{item.type === 'BANK' ? 'حساب مصرفي' : 'خزينة'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatArabicCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-text-tertiary">لا توجد إيرادات</p>
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
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className={`${headerColor} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
            {period === "يوم" ? (
              <Clock className="w-4 h-4 text-white" />
            ) : (
              <Calendar className="w-4 h-4 text-white" />
            )}
            <span className="text-sm font-medium text-white">
              {period === "يوم" ? "اليوم" : "هذا الشهر"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-surface-secondary rounded-xl p-4 border border-slate-100 dark:border-border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-100 dark:hover:border-blue-800/20 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color || 'text-blue-600 dark:text-blue-400'}`} />
                <span className="text-xs font-medium text-slate-500 dark:text-text-secondary">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <span className="inline-block w-20 h-6 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></span>
                ) : (
                  <span className="text-lg font-bold text-slate-800 dark:text-text-primary">{stat.value}</span>
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
      <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">الأصناف الأكثر مبيعاً</h3>
          <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const topProducts = topProductsData?.data || [];

  return (
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">الأصناف الأكثر مبيعاً</h3>
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={`product-${product.productId}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-100 dark:hover:border-blue-800/20 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-text-primary text-sm">{product.productName}</p>
                  <p className="text-xs text-slate-500 dark:text-text-tertiary">{product.sku}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">{formatArabicNumber(product.totalQuantitySold)} {product.unit}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{formatArabicCurrency(product.totalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-text-tertiary">لا توجد بيانات مبيعات</p>
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
      <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">تنبيهات المخزون</h3>
          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const lowStockProducts = lowStockData?.data || [];

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30';
      case 'CRITICAL':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/30';
      case 'LOW':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30';
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-text-primary border-slate-200 dark:border-border-primary';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'نفد';
      case 'CRITICAL':
        return 'حرج';
      case 'LOW':
        return 'منخفض';
      default:
        return 'عادي';
    }
  };

  return (
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">تنبيهات المخزون</h3>
        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="space-y-3">
          {lowStockProducts.map((product, index) => (
            <div
              key={`low-stock-${product.productId}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-border-primary hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-100 dark:hover:border-amber-800/20 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-text-primary text-sm">{product.productName}</p>
                  <p className="text-xs text-slate-500 dark:text-text-tertiary">{product.sku}</p>
                </div>
              </div>
              <div className="text-left flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-text-primary text-sm">
                  {formatArabicNumber(product.currentStock)} {product.unit}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStockStatusColor(product.stockStatus)}`}>
                  {getStockStatusText(product.stockStatus)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Package className="w-12 h-12 text-green-300 dark:text-green-900/30 mx-auto mb-3" />
          <p className="text-green-600 dark:text-green-400 font-medium">جميع الأصناف متوفرة</p>
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
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  return (
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">مبيعات المستخدمين</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="flex-1 px-3 py-2 bg-white dark:bg-surface-secondary border border-gray-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-slate-800 dark:text-text-primary"
        >
          {years.map((year) => (
            <option key={year} value={year} className="dark:bg-surface-primary">
              {formatArabicNumber(year)}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="flex-1 px-3 py-2 bg-white dark:bg-surface-secondary border border-gray-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-slate-800 dark:text-text-primary"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value} className="dark:bg-surface-primary">
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {usersData?.data && (
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">إجمالي المبيعات</p>
            <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{formatArabicCurrency(usersData.data.summary.totalRevenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">عدد الفواتير</p>
            <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{formatArabicNumber(usersData.data.summary.totalInvoices)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">مستخدمين نشطين</p>
            <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{formatArabicNumber(usersData.data.summary.activeUsers)}</p>
          </div>
        </div>
      )}

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : usersData?.data?.users && usersData.data.users.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
          {usersData.data.users.map((user, index) => (
            <div
              key={`user-${user.userId}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-surface-secondary border border-slate-100 dark:border-border-primary hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-100 dark:hover:border-purple-800/20 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-text-primary text-sm">{user.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-text-tertiary">{user.companyName}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">{formatArabicCurrency(user.totalSales)}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{formatArabicNumber(user.salesCount)} فاتورة</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-text-tertiary">لا توجد بيانات مبيعات</p>
        </div>
      )}
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
    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary p-6 hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-text-primary">نظرة شاملة على العمليات</h3>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 bg-white dark:bg-surface-secondary border border-gray-300 dark:border-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 dark:text-text-primary"
        >
          {years.map((year) => (
            <option key={year} value={year} className="dark:bg-surface-primary">
              {formatArabicNumber(year)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {chartData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-100 dark:border-green-800/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">المبيعات</p>
            </div>
            <p className="text-sm font-bold text-green-900 dark:text-green-300">{formatArabicCurrency(chartData.data.yearTotals.sales)}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-100 dark:border-purple-800/20">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">المشتريات</p>
            </div>
            <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{formatArabicCurrency(chartData.data.yearTotals.purchases)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3 border border-orange-100 dark:border-orange-800/20">
            <div className="flex items-center gap-2 mb-1">
              <CircleDollarSign className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">المصروفات</p>
            </div>
            <p className="text-sm font-bold text-orange-900 dark:text-orange-300">{formatArabicCurrency(chartData.data.yearTotals.badDebts)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 border border-red-100 dark:border-red-800/20">
            <div className="flex items-center gap-2 mb-1">
              <Archive className="w-3 h-3 text-red-600 dark:text-red-400" />
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">التالف</p>
            </div>
            <p className="text-sm font-bold text-red-900 dark:text-red-300">{formatArabicCurrency(chartData.data.yearTotals.damages)}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-800/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">المردودات</p>
            </div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{formatArabicCurrency(chartData.data.yearTotals.returns)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="h-80 bg-slate-50 dark:bg-surface-secondary animate-pulse rounded-lg"></div>
      ) : chartData?.data ? (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData.data.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthName" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip
              formatter={(value: any) => formatArabicCurrency(value)}
              labelStyle={{ fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="sales" fill="#10b981" name="المبيعات" />
            <Bar dataKey="purchases" fill="#8b5cf6" name="المشتريات" />
            <Bar dataKey="badDebts" fill="#f97316" name="المصروفات المعدومة" />
            <Bar dataKey="damages" fill="#ef4444" name="التالف" />
            <Bar dataKey="returns" fill="#f59e0b" name="المردودات" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-10">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-text-tertiary">لا توجد بيانات</p>
        </div>
      )}
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
    <div className="flex flex-col gap-8 p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-text-primary mb-2">
            مرحباً بك، {user?.firstName || "المستخدم"} 👋
          </h1>
          <p className="text-slate-500 dark:text-text-secondary font-medium">
            إليك نظرة سريعة على أداء النظام والعمليات الحالية.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-surface-primary px-4 py-3 rounded-2xl shadow-sm border border-blue-100 dark:border-border-primary">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-text-tertiary">تاريخ اليوم</p>
            <p className="font-bold text-slate-800 dark:text-text-primary">
              {new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* مبيعات الشركات */}
      <CompanySalesCards />

      {/* الخزائن (المدفوعات والإيداعات) */}
      <TreasuryCards />

      {/* كروت العمليات اليومية والشهرية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperationCard
          title="عمليات اليوم"
          period="يوم"
          stats={dailyOperationsStats}
          headerColor="bg-gradient-to-l from-blue-500 to-blue-600"
          isLoading={salesLoading}
        />
        <OperationCard
          title="عمليات الشهر"
          period="شهر"
          stats={monthlyOperationsStats}
          headerColor="bg-gradient-to-l from-indigo-500 to-indigo-600"
          isLoading={salesLoading || treasuryLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الأصناف الأكثر مبيعاً */}
        <div className="space-y-6">
          <TopSellingProducts />
        </div>

        {/* تنبيهات المخزون */}
        <div className="space-y-6">
          <LowStockProducts />
        </div>
      </div>

      {/* مبيعات المستخدمين */}
      <UsersSalesCard />

      {/* الرسم البياني الشامل */}
      <ComprehensiveChart />
    </div>
  );
};

export default Dashboard;
