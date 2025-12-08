"use client";

import React from "react";
import { useAppSelector } from "@/app/redux";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  CreditCard,
  Package,
  Bell,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Eye,
  AlertTriangle,
  Star,
  TrendingUp as TrendingUpIcon,
  BarChart3,
  Activity
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
import { 
  useGetRecentActivitiesQuery
} from "@/state/activityApi";
import { formatArabicNumber, formatArabicCurrency, convertToArabicNumbers } from "@/utils/formatArabicNumbers";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const StatCard = ({ title, value, change, changeType, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6 hover:shadow-lg hover:border-border-secondary transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary mb-2">{title}</p>
          <p className="text-2xl font-bold text-text-primary mb-2">{value}</p>
          <div className="flex items-center gap-1">
            {changeType === "increase" ? (
              <ArrowUpRight className="w-4 h-4 text-success-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-error-500" />
            )}
            <span
              className={`text-sm font-medium ${
                changeType === "increase" ? "text-success-600" : "text-error-600"
              }`}
            >
              {change}
            </span>
            <span className="text-sm text-text-tertiary">من الشهر الماضي</span>
          </div>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

interface ActivityItem {
  id: number;
  type: "sale" | "purchase" | "payment" | "user";
  title: string;
  description: string;
  time: string;
  amount?: string;
}

const ActivityFeed = () => {
  const { data: activitiesData, isLoading } = useGetRecentActivitiesQuery({ limit: 10 });
  
  if (isLoading) {
    return (
      <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">الأنشطة الأخيرة</h3>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors duration-200">
            عرض الكل
          </button>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={`activity-skeleton-${i}`} className="animate-pulse">
              <div className="flex items-start gap-3 p-3 rounded-lg">
                <div className="w-8 h-8 bg-background-tertiary rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-background-tertiary rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-background-tertiary rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-background-tertiary rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activities = activitiesData?.data || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <ShoppingCart className="w-4 h-4 text-green-600" />;
      case "purchase":
        return <Package className="w-4 h-4 text-blue-600" />;
      case "payment":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "user":
        return <Users className="w-4 h-4 text-purple-600" />;
      case "product":
        return <Package className="w-4 h-4 text-orange-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">الأنشطة الأخيرة</h3>
        <button className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors duration-200">
          عرض الكل
        </button>
      </div>
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-background-hover transition-all duration-200">
            <div className="w-8 h-8 bg-background-secondary rounded-lg flex items-center justify-center flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{activity.title}</p>
              <p className="text-sm text-text-secondary">{activity.description}</p>
              <p className="text-xs text-text-tertiary mt-1">{activity.time}</p>
            </div>
            {activity.amount && (
              <span
                className={`text-sm font-medium ${
                  activity.amount.startsWith("+") ? "text-success-600" : "text-error-600"
                }`}
              >
                {convertToArabicNumbers(activity.amount)}
              </span>
            )}
          </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">لا توجد أنشطة حديثة</p>
          </div>
        )}
      </div>
    </div>
  );
};

// مكون الأصناف الأكثر مبيعاً
const TopSellingProducts = () => {
  const { data: topProductsData, isLoading } = useGetTopSellingProductsQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">الأصناف الأكثر مبيعاً</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={`top-products-skeleton-${i}`} className="animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-background-tertiary rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const topProducts = topProductsData?.data || [];

  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">الأصناف الأكثر مبيعاً</h3>
        <Star className="w-5 h-5 text-warning-500" />
      </div>
      <div className="space-y-4">
        {topProducts.length > 0 ? (
          topProducts.map((product, index) => (
            <div key={`top-product-${product.productId}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary hover:bg-background-hover transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-warning-600">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">{product.productName}</p>
                  <p className="text-sm text-text-secondary">{product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-text-primary">{formatArabicNumber(product.totalQuantitySold)} {product.unit}</p>
                <p className="text-sm text-success-600">{formatArabicCurrency(product.totalRevenue)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">لا توجد بيانات مبيعات</p>
          </div>
        )}
      </div>
    </div>
  );
};

// مكون الأصناف التي ستنتهي قريباً
const LowStockProducts = () => {
  const { data: lowStockData, isLoading } = useGetLowStockProductsQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">الأصناف التي ستنتهي قريباً</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={`low-stock-skeleton-${i}`} className="animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-background-tertiary rounded w-1/2"></div>
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
        return 'text-red-600 bg-red-100';
      case 'CRITICAL':
        return 'text-orange-600 bg-orange-100';
      case 'LOW':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'نفد المخزون';
      case 'CRITICAL':
        return 'حرج';
      case 'LOW':
        return 'منخفض';
      default:
        return 'عادي';
    }
  };

  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">الأصناف التي ستنتهي قريباً</h3>
        <AlertTriangle className="w-5 h-5 text-warning-500" />
      </div>
      <div className="space-y-4">
        {lowStockProducts.length > 0 ? (
          lowStockProducts.map((product, index) => (
            <div key={`low-stock-product-${product.productId}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary hover:bg-background-hover transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-warning-600" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">{product.productName}</p>
                  <p className="text-sm text-text-secondary">{product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-text-primary">{formatArabicNumber(product.currentStock)} {product.unit}</p>
                {product.unit !== 'صندوق' && product.unitsPerBox > 1 && (
                  <p className="text-xs text-text-tertiary">
                    ({formatArabicNumber(product.totalUnits)} {product.unit})
                  </p>
                )}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(product.stockStatus)}`}>
                  {getStockStatusText(product.stockStatus)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">جميع الأصناف متوفرة</p>
          </div>
        )}
      </div>
    </div>
  );
};

const QuickActions = () => {
  const actions = [
    { title: "عملية بيع جديدة", icon: ShoppingCart, color: "bg-success-500", href: "/sales/new" },
    { title: "إضافة عميل", icon: Users, color: "bg-primary-500", href: "/customers/new" },
    { title: "إدخال مصروف", icon: TrendingDown, color: "bg-error-500", href: "/expenses/new" },
    { title: "حركة خزينة", icon: DollarSign, color: "bg-info-500", href: "/treasury/new" }
  ];

  return (
    <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-6">الإجراءات السريعة</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            className="flex items-center gap-3 p-4 rounded-lg border border-border-primary hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
          >
            <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-md`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary group-hover:text-primary-700 transition-colors duration-200">
              {action.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  // جلب البيانات من APIs
  const { data: salesStats, isLoading: salesLoading } = useGetSalesStatsQuery();
  const { data: purchaseStats, isLoading: purchaseLoading } = useGetPurchaseStatsQuery({});
  const { data: creditStats, isLoading: creditLoading } = useGetCreditSalesStatsQuery();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              مرحباً، {user?.name || "المستخدم"}
            </h1>
            <p className="text-primary-100 dark:text-primary-200">
              إليك ملخص أنشطة اليوم في نظام إدارة السيراميك والبورسلين
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-primary-100 dark:text-primary-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">
                {new Date().toLocaleDateString("ar-LY", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm">
                {new Date().toLocaleTimeString("ar-LY", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="مبيعات اليوم"
          value={salesLoading ? "جاري التحميل..." : formatArabicCurrency(salesStats?.data?.todayRevenue || 0)}
          change=""
          changeType="increase"
          icon={TrendingUp}
          color="bg-gradient-to-r from-green-500 to-emerald-500"
        />
        <StatCard
          title="مبيعات الشهر"
          value={salesLoading ? "جاري التحميل..." : formatArabicCurrency(salesStats?.data?.monthRevenue || 0)}
          change=""
          changeType="increase"
          icon={BarChart3}
          color="bg-gradient-to-r from-blue-500 to-indigo-500"
        />
        <StatCard
          title="مبيعات السنة"
          value={salesLoading ? "جاري التحميل..." : formatArabicCurrency(salesStats?.data?.yearRevenue || 0)}
          change=""
          changeType="increase"
          icon={Activity}
          color="bg-gradient-to-r from-purple-500 to-pink-500"
        />
        <StatCard
          title="المبيعات الآجلة"
          value={creditLoading ? "جاري التحميل..." : formatArabicCurrency(creditStats?.data?.totalRemaining || 0)}
          change=""
          changeType="increase"
          icon={CreditCard}
          color="bg-gradient-to-r from-orange-500 to-red-500"
        />
      </div>

      {/* Purchase Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المشتريات"
          value={purchaseLoading ? "جاري التحميل..." : formatArabicCurrency(purchaseStats?.totalAmount || 0)}
          change=""
          changeType="increase"
          icon={ShoppingCart}
          color="bg-gradient-to-r from-indigo-500 to-purple-500"
        />
        <StatCard
          title="المبلغ المدفوع"
          value={purchaseLoading ? "جاري التحميل..." : formatArabicCurrency(purchaseStats?.totalPaid || 0)}
          change=""
          changeType="increase"
          icon={DollarSign}
          color="bg-gradient-to-r from-emerald-500 to-teal-500"
        />
        <StatCard
          title="المبلغ المتبقي"
          value={purchaseLoading ? "جاري التحميل..." : formatArabicCurrency(purchaseStats?.totalRemaining || 0)}
          change=""
          changeType="increase"
          icon={AlertTriangle}
          color="bg-gradient-to-r from-yellow-500 to-orange-500"
        />
        <StatCard
          title="عدد المشتريات"
          value={purchaseLoading ? "جاري التحميل..." : formatArabicNumber(purchaseStats?.totalPurchases || 0)}
          change=""
          changeType="increase"
          icon={Package}
          color="bg-gradient-to-r from-cyan-500 to-blue-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products - Takes 1 column */}
        <div>
          <TopSellingProducts />
        </div>

        {/* Low Stock Products - Takes 1 column */}
        <div>
          <LowStockProducts />
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1">
        <ActivityFeed />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart Placeholder */}
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">مبيعات الشهر</h3>
            <button className="p-2 hover:bg-background-hover rounded-lg transition-all duration-200">
              <MoreVertical className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <div className="h-64 bg-background-secondary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">رسم بياني للمبيعات</p>
              <p className="text-sm text-text-tertiary">سيتم إضافة الرسوم البيانية قريباً</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-surface-primary rounded-xl shadow-sm border border-border-primary p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-primary">الإيرادات الشهرية</h3>
            <button className="p-2 hover:bg-background-hover rounded-lg transition-all duration-200">
              <Eye className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <div className="h-64 bg-background-secondary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">رسم بياني للإيرادات</p>
              <p className="text-sm text-text-tertiary">سيتم إضافة الرسوم البيانية قريباً</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

