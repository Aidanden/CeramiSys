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
  Eye
} from "lucide-react";

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mb-2">{value}</p>
          <div className="flex items-center gap-1">
            {changeType === "increase" ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                changeType === "increase" ? "text-green-600" : "text-red-600"
              }`}
            >
              {change}
            </span>
            <span className="text-sm text-slate-500">من الشهر الماضي</span>
          </div>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
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
  const activities: ActivityItem[] = [
    {
      id: 1,
      type: "sale",
      title: "عملية بيع جديدة",
      description: "تم بيع منتجات بقيمة 15,000 دينار",
      time: "منذ 5 دقائق",
      amount: "+15,000 د.ل"
    },
    {
      id: 2,
      type: "user",
      title: "مستخدم جديد",
      description: "انضم أحمد محمد إلى النظام",
      time: "منذ 30 دقيقة"
    },
    {
      id: 3,
      type: "payment",
      title: "دفعة مستلمة",
      description: "تم استلام دفعة من العميل محمد علي",
      time: "منذ ساعة",
      amount: "+25,000 د.ل"
    },
    {
      id: 4,
      type: "purchase",
      title: "طلبية شراء",
      description: "تم شراء مواد خام بقيمة 8,000 دينار",
      time: "منذ ساعتين",
      amount: "-8,000 د.ل"
    }
  ];

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
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">الأنشطة الأخيرة</h3>
        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          عرض الكل
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{activity.title}</p>
              <p className="text-sm text-slate-600">{activity.description}</p>
              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
            </div>
            {activity.amount && (
              <span
                className={`text-sm font-medium ${
                  activity.amount.startsWith("+") ? "text-green-600" : "text-red-600"
                }`}
              >
                {activity.amount}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions = () => {
  const actions = [
    { title: "عملية بيع جديدة", icon: ShoppingCart, color: "bg-green-500", href: "/sales/new" },
    { title: "إضافة عميل", icon: Users, color: "bg-blue-500", href: "/customers/new" },
    { title: "إدخال مصروف", icon: TrendingDown, color: "bg-red-500", href: "/expenses/new" },
    { title: "حركة خزينة", icon: DollarSign, color: "bg-emerald-500", href: "/treasury/new" }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">الإجراءات السريعة</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              مرحباً، {user?.name || "المستخدم"}
            </h1>
            <p className="text-blue-100">
              إليك ملخص أنشطة اليوم في نظام إدارة السيراميك والبورسلين
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-blue-100">
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
          title="إجمالي المبيعات"
          value="450,000 دينار"
          change="+12.5%"
          changeType="increase"
          icon={TrendingUp}
          color="bg-gradient-to-r from-green-500 to-emerald-500"
        />
        <StatCard
          title="عدد العملاء"
          value="1,250"
          change="+8.2%"
          changeType="increase"
          icon={Users}
          color="bg-gradient-to-r from-blue-500 to-indigo-500"
        />
        <StatCard
          title="المشتريات"
          value="180,000 دينار"
          change="-3.1%"
          changeType="decrease"
          icon={ShoppingCart}
          color="bg-gradient-to-r from-purple-500 to-pink-500"
        />
        <StatCard
          title="رصيد الخزينة"
          value="75,000 دينار"
          change="+15.7%"
          changeType="increase"
          icon={DollarSign}
          color="bg-gradient-to-r from-emerald-500 to-teal-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">مبيعات الشهر</h3>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">رسم بياني للمبيعات</p>
              <p className="text-sm text-slate-500">سيتم إضافة الرسوم البيانية قريباً</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">الإيرادات الشهرية</h3>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Eye className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">رسم بياني للإيرادات</p>
              <p className="text-sm text-slate-500">سيتم إضافة الرسوم البيانية قريباً</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

