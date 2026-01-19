'use client';

/**
 * صفحة المرتبات والموظفين
 * Payroll & Employees Management Page
 */

import React, { useState, useRef } from 'react';
import {
    useGetEmployeesQuery,
    useGetEmployeeQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useDeleteEmployeeMutation,
    usePaySalaryMutation,
    usePayMultipleSalariesMutation,
    useGetSalaryPaymentsQuery,
    useGetSalaryStatementQuery,
    useGetBonusesQuery,
    usePayBonusMutation,
    useGetPayrollStatsQuery,
    Employee,
    SalaryPayment,
    SalaryStatement
} from '@/state/payrollApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { PayrollMonthlyReport } from '@/components/payroll/PayrollMonthlyReport';
import BonusesReport from '@/components/payroll/BonusesReport';
// Lucide icons aligned with project identity (Sidebar & Other screens)
// Lucide icons aligned with project identity
import {
    Users,
    Calendar,
    BarChart3,
    FileText,
    Edit,
    Trash2,
    Plus,
    Search,
    Wallet,
    X,
    Layout,
    ShoppingBag,
    ArrowRightLeft,
    CircleDollarSign,
    CreditCard,
    TrendingUp,
    Printer,
    BarChart3 as LucideBarChart // Renamed to avoid confusion with BarChart from recharts
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';

interface MainStatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    iconBgColor: string;
}

const MainStatCard = ({ title, value, subtitle, icon: Icon, iconBgColor }: MainStatCardProps) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>
        </div>
    );
};

// تنسيق العملة
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 2
    }).format(amount);
};

