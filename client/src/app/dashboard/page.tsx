"use client";

import React from "react";
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
} from "lucide-react";
import {
  useGetSalesStatsQuery
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
import { formatArabicNumber, formatArabicCurrency } from "@/utils/formatArabicNumbers";

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
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-slate-200 animate-pulse rounded"></span>
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
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
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden hover:shadow-md transition-all duration-300">
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
              className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color || 'text-blue-600'}`} />
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <span className="inline-block w-20 h-6 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  <span className="text-lg font-bold text-slate-800">{stat.value}</span>
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
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800">الأصناف الأكثر مبيعاً</h3>
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const topProducts = topProductsData?.data || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-800">الأصناف الأكثر مبيعاً</h3>
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={`product-${product.productId}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{product.productName}</p>
                  <p className="text-xs text-slate-500">{product.sku}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600 text-sm">{formatArabicNumber(product.totalQuantitySold)} {product.unit}</p>
                <p className="text-xs text-green-600">{formatArabicCurrency(product.totalRevenue)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">لا توجد بيانات مبيعات</p>
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
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800">تنبيهات المخزون</h3>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
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
        return 'bg-red-100 text-red-700 border-red-200';
      case 'CRITICAL':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'LOW':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-800">تنبيهات المخزون</h3>
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="space-y-3">
          {lowStockProducts.map((product, index) => (
            <div
              key={`low-stock-${product.productId}-${index}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:border-amber-100 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{product.productName}</p>
                  <p className="text-xs text-slate-500">{product.sku}</p>
                </div>
              </div>
              <div className="text-left flex items-center gap-2">
                <span className="font-bold text-slate-700 text-sm">
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
          <Package className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-green-600 font-medium">جميع الأصناف متوفرة</p>
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
      label: "إجمالي المبيعات",
      value: formatArabicCurrency(salesStats?.data?.monthRevenue || 0),
      icon: BarChart3,
      color: "text-blue-600"
    },
    {
      label: "عدد الفواتير",
      value: formatArabicNumber(salesStats?.data?.monthSales || 0),
      icon: Receipt,
      color: "text-indigo-600"
    },
    {
      label: "إجمالي المشتريات",
      value: formatArabicCurrency(purchaseStats?.totalAmount || 0),
      icon: Package,
      color: "text-purple-600"
    },
    {
      label: "المدفوعات",
      value: formatArabicCurrency(purchaseStats?.totalPaid || 0),
      icon: Wallet,
      color: "text-emerald-600"
    },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* ترحيب - Header */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              مرحباً، {user?.name || "المستخدم"} 👋
            </h1>
            <p className="text-blue-100 text-sm">
              نظام إدارة السيراميك والبورسلين - لوحة التحكم الرئيسية
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date().toLocaleDateString("ar-LY", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <Clock className="w-4 h-4" />
              <span>
                {new Date().toLocaleTimeString("ar-LY", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* الإحصائيات الرئيسية - Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MainStatCard
          title="إجمالي المبيعات (سنوياً)"
          value={formatArabicCurrency(salesStats?.data?.yearRevenue || 0)}
          subtitle={`${formatArabicNumber(salesStats?.data?.yearSales || 0)} فاتورة`}
          icon={TrendingUp}
          iconBgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          isLoading={salesLoading}
        />
        <MainStatCard
          title="إجمالي المشتريات"
          value={formatArabicCurrency(purchaseStats?.totalAmount || 0)}
          subtitle={`${formatArabicNumber(purchaseStats?.totalPurchases || 0)} عملية شراء`}
          icon={ShoppingCart}
          iconBgColor="bg-gradient-to-br from-indigo-500 to-indigo-600"
          isLoading={purchaseLoading}
        />
        <MainStatCard
          title="المبيعات الآجلة المتبقية"
          value={formatArabicCurrency(creditStats?.data?.totalRemaining || 0)}
          icon={CreditCard}
          iconBgColor="bg-gradient-to-br from-amber-500 to-orange-500"
          isLoading={creditLoading}
        />
        <MainStatCard
          title="المبلغ المدفوع للموردين"
          value={formatArabicCurrency(purchaseStats?.totalPaid || 0)}
          subtitle={`المتبقي: ${formatArabicCurrency(purchaseStats?.totalRemaining || 0)}`}
          icon={CircleDollarSign}
          iconBgColor="bg-gradient-to-br from-emerald-500 to-green-600"
          isLoading={purchaseLoading}
        />
      </div>

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
          isLoading={salesLoading || purchaseLoading}
        />
      </div>

      {/* الأصناف الأكثر مبيعاً وتنبيهات المخزون */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingProducts />
        <LowStockProducts />
      </div>
    </div>
  );
};

export default Dashboard;
