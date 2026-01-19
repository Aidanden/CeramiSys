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
    Print as PrinterIcon,
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

// أسماء الأشهر العربية
const arabicMonths = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// أنواع المكافآت
const bonusTypes = [
    { value: 'BONUS', label: 'مكافأة' },
    { value: 'RAISE', label: 'زيادة راتب' },
    { value: 'INCENTIVE', label: 'حافز' },
    { value: 'OVERTIME', label: 'بدل إضافي' }
];

export default function PayrollPage() {
    // State
    const [activeTab, setActiveTab] = useState<'employees' | 'salaries' | 'bonuses' | 'stats'>('employees');
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [showBatchPayModal, setShowBatchPayModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

    // Print state
    const printRef = useRef<HTMLDivElement>(null);
    const bonusesPrintRef = useRef<HTMLDivElement>(null);

    // Filters
    const currentDate = new Date();
    const [salaryMonth, setSalaryMonth] = useState(currentDate.getMonth() + 1);
    const [salaryYear, setSalaryYear] = useState(currentDate.getFullYear());
    const [bonusMonth, setBonusMonth] = useState(currentDate.getMonth() + 1);
    const [bonusYear, setBonusYear] = useState(currentDate.getFullYear());
    const [bonusTypeFilter, setBonusTypeFilter] = useState<string>('');
    const [bonusEmployeeFilter, setBonusEmployeeFilter] = useState<number | undefined>();
    const [statementEmployeeFilter, setStatementEmployeeFilter] = useState<number | undefined>();
    const [statsYear, setStatsYear] = useState(currentDate.getFullYear());

    // Form state
    const [employeeForm, setEmployeeForm] = useState({
        name: '',
        jobTitle: '',
        phone: '',
        email: '',
        baseSalary: '',
        hireDate: '',
        notes: '',
        companyId: ''
    });

    const [payForm, setPayForm] = useState({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        amount: '',
        type: 'PARTIAL' as 'PARTIAL' | 'FINAL', // Default to partial/advance
        treasuryId: '',
        notes: ''
    });

    const [bonusForm, setBonusForm] = useState({
        type: 'BONUS' as 'BONUS' | 'RAISE' | 'INCENTIVE' | 'OVERTIME',
        amount: '',
        reason: '',
        treasuryId: '',
        effectiveDate: '',
        notes: ''
    });

    // Queries
    const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useGetEmployeesQuery({
        companyId: selectedCompanyId,
        isActive: true,
        search: searchTerm || undefined
    });

    const { data: salaryData, isLoading: salaryLoading } = useGetSalaryPaymentsQuery({
        month: salaryMonth,
        year: salaryYear,
        companyId: selectedCompanyId
    });

    const { data: bonusesData, isLoading: bonusesLoading } = useGetBonusesQuery({
        month: bonusMonth,
        year: bonusYear,
        type: bonusTypeFilter || undefined,
        employeeId: bonusEmployeeFilter,
        companyId: selectedCompanyId
    });

    const { data: statsData } = useGetPayrollStatsQuery({
        companyId: selectedCompanyId,
        year: statsYear
    });

    const { data: treasuriesData } = useGetTreasuriesQuery({});
    const { data: companiesData } = useGetCompaniesQuery({});
    const { data: userData } = useGetCurrentUserQuery();

    // Mutations
    const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
    const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
    const [deleteEmployee] = useDeleteEmployeeMutation();
    const [paySalary, { isLoading: payingOne }] = usePaySalaryMutation();
    const [payMultipleSalaries, { isLoading: payingMultiple }] = usePayMultipleSalariesMutation();
    const [payBonus, { isLoading: payingBonus }] = usePayBonusMutation();

    const employees = employeesData?.data || [];
    const allSalaryPayments = salaryData?.data || [];
    const bonuses = bonusesData?.data || [];
    const treasuries = treasuriesData || [];
    const companies = companiesData?.data?.companies || [];
    const stats = statsData?.data;
    const user = userData?.data;

    // فلترة المدفوعات حسب الموظف المحدد
    const salaryPayments = React.useMemo(() => {
        if (!statementEmployeeFilter) return allSalaryPayments;
        return allSalaryPayments.filter(payment => payment.employeeId === statementEmployeeFilter);
    }, [allSalaryPayments, statementEmployeeFilter]);

    // تحديد اسم الشركة/الشركات واسم المستخدم للطباعة
    const getCompanyInfo = () => {
        if (user?.isSystemUser && companiesData?.data?.companies) {
            const allCompanies = companiesData.data.companies.map((c: any) => c.name).join(' - ');
            return {
                name: allCompanies || 'نظام إدارة السيراميك',
                userName: user.fullName || user.username || 'المدير'
            };
        } else if (user?.company) {
            return {
                name: user.company.name,
                userName: user.fullName || user.username || '-'
            };
        }
        return {
            name: 'الشركة',
            userName: '-'
        };
    };

    // طباعة التقرير الشهري
    const handlePrintMonthlyReport = () => {
        if (salaryPayments.length === 0) {
            alert('لا توجد بيانات للطباعة في هذا الشهر!');
            return;
        }

        setTimeout(() => {
            if (printRef.current) {
                const printWindow = window.open('', '_blank', 'width=1200,height=800');
                if (!printWindow) {
                    alert('تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة.');
                    return;
                }

                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>تقرير المرتبات الشهري - ${salaryMonth}/${salaryYear}</title>
                    </head>
                    <body>
                        ${printRef.current.innerHTML}
                        <script>
                            window.onload = function() {
                                setTimeout(() => {
                                    window.print();
                                }, 500);
                            };
                            window.onafterprint = function() {
                                setTimeout(() => {
                                    window.close();
                                }, 100);
                            };
                        </script>
                    </body>
                    </html>
                `;

                printWindow.document.write(htmlContent);
                printWindow.document.close();
            }
        }, 200);
    };

    // طباعة تقرير المكافآت
    const handlePrintBonusesReport = () => {
        if (bonuses.length === 0) {
            alert('لا توجد مكافآت للطباعة!');
            return;
        }

        setTimeout(() => {
            if (bonusesPrintRef.current) {
                const printWindow = window.open('', '_blank', 'width=1200,height=800');
                if (!printWindow) {
                    alert('تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة.');
                    return;
                }

                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>تقرير المكافآت - ${bonusMonth}/${bonusYear}</title>
                    </head>
                    <body>
                        ${bonusesPrintRef.current.innerHTML}
                        <script>
                            window.onload = function() {
                                setTimeout(() => {
                                    window.print();
                                }, 500);
                            };
                            window.onafterprint = function() {
                                setTimeout(() => {
                                    window.close();
                                }, 100);
                            };
                        </script>
                    </body>
                    </html>
                `;

                printWindow.document.write(htmlContent);
                printWindow.document.close();
            }
        }, 200);
    };

    // Handlers
    const handleCreateEmployee = async () => {
        const targetCompanyId = selectedCompanyId || (employeeForm.companyId ? parseInt(employeeForm.companyId) : undefined);

        if (!targetCompanyId) {
            alert('يرجى اختيار الشركة');
            return;
        }

        try {
            await createEmployee({
                name: employeeForm.name,
                jobTitle: employeeForm.jobTitle || undefined,
                phone: employeeForm.phone || undefined,
                email: employeeForm.email || undefined,
                baseSalary: parseFloat(employeeForm.baseSalary),
                companyId: selectedCompanyId || parseInt(employeeForm.companyId),
                hireDate: employeeForm.hireDate || undefined,
                notes: employeeForm.notes || undefined
            }).unwrap();

            setShowEmployeeModal(false);
            resetEmployeeForm();
            refetchEmployees();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء إنشاء الموظف');
        }
    };

    const handleUpdateEmployee = async () => {
        if (!editingEmployee) return;

        try {
            await updateEmployee({
                id: editingEmployee.id,
                data: {
                    name: employeeForm.name,
                    jobTitle: employeeForm.jobTitle || undefined,
                    phone: employeeForm.phone || undefined,
                    email: employeeForm.email || undefined,
                    baseSalary: parseFloat(employeeForm.baseSalary),
                    hireDate: employeeForm.hireDate || undefined,
                    notes: employeeForm.notes || undefined
                }
            }).unwrap();

            setShowEmployeeModal(false);
            setEditingEmployee(null);
            resetEmployeeForm();
            refetchEmployees();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء تحديث الموظف');
        }
    };

    const handleDeleteEmployee = async (employee: Employee) => {
        if (!confirm(`هل أنت متأكد من حذف الموظف "${employee.name}"؟`)) return;

        try {
            const result = await deleteEmployee(employee.id).unwrap();
            alert(result.message);
            refetchEmployees();
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء حذف الموظف');
        }
    };

    const handlePaySalary = async () => {
        if (!selectedEmployee || !payForm.treasuryId) {
            alert('يرجى اختيار الخزينة');
            return;
        }

        try {
            await paySalary({
                employeeId: selectedEmployee.id,
                month: payForm.month,
                year: payForm.year,
                amount: parseFloat(payForm.amount) || selectedEmployee.baseSalary,
                type: payForm.type,
                treasuryId: parseInt(payForm.treasuryId),
                notes: payForm.notes || undefined
            }).unwrap();

            setShowPayModal(false);
            setSelectedEmployee(null);
            resetPayForm();
            refetchEmployees();
            alert('تم صرف المبلغ بنجاح');
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء صرف المبلغ');
        }
    };

    const handlePayMultiple = async () => {
        if (selectedEmployees.length === 0) {
            alert('يرجى اختيار موظفين');
            return;
        }
        if (!payForm.treasuryId) {
            alert('يرجى اختيار الخزينة');
            return;
        }

        try {
            const result = await payMultipleSalaries({
                employeeIds: selectedEmployees,
                month: payForm.month,
                year: payForm.year,
                treasuryId: parseInt(payForm.treasuryId)
            }).unwrap();

            setShowBatchPayModal(false);
            setSelectedEmployees([]);
            resetPayForm();
            refetchEmployees();
            alert(`تم صرف ${result.data.totalPaid} مرتب${result.data.totalFailed > 0 ? ` وفشل ${result.data.totalFailed}` : ''}`);
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء صرف المرتبات');
        }
    };

    const handlePayBonus = async () => {
        if (!selectedEmployee || !bonusForm.treasuryId) {
            alert('يرجى اختيار الخزينة');
            return;
        }

        try {
            await payBonus({
                employeeId: selectedEmployee.id,
                type: bonusForm.type,
                amount: parseFloat(bonusForm.amount),
                reason: bonusForm.reason || undefined,
                treasuryId: parseInt(bonusForm.treasuryId),
                effectiveDate: bonusForm.effectiveDate || undefined,
                notes: bonusForm.notes || undefined
            }).unwrap();

            setShowBonusModal(false);
            setSelectedEmployee(null);
            resetBonusForm();
            refetchEmployees();
            alert('تم صرف المكافأة بنجاح');
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء صرف المكافأة');
        }
    };

    const resetEmployeeForm = () => {
        setEmployeeForm({
            name: '',
            jobTitle: '',
            phone: '',
            email: '',
            baseSalary: '',
            hireDate: '',
            notes: '',
            companyId: ''
        });
    };

    const resetPayForm = () => {
        setPayForm({
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            amount: '',
            type: 'PARTIAL',
            treasuryId: '',
            notes: ''
        });
    };

    const resetBonusForm = () => {
        setBonusForm({
            type: 'BONUS',
            amount: '',
            reason: '',
            treasuryId: '',
            effectiveDate: '',
            notes: ''
        });
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setEmployeeForm({
            name: employee.name,
            jobTitle: employee.jobTitle || '',
            phone: employee.phone || '',
            email: employee.email || '',
            baseSalary: employee.baseSalary.toString(),
            hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
            notes: employee.notes || '',
            companyId: employee.companyId.toString()
        });
        setShowEmployeeModal(true);
    };

    const openPayModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setPayForm({
            ...payForm,
            amount: employee.baseSalary.toString()
        });
        setShowPayModal(true);
    };

    const openBonusModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowBonusModal(true);
    };

    const toggleEmployeeSelection = (employeeId: number) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const selectAllEmployees = () => {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees.map(e => e.id));
        }
    };

    const openStatementModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowStatementModal(true);
    };

    const openAdvanceModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setPayForm({
            ...payForm,
            amount: '',
            type: 'PARTIAL'
        });
        setShowPayModal(true);
    };

    return (
        <div className="p-6 bg-slate-50 dark:bg-surface-secondary min-h-screen" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 إدارة المرتبات</h1>
                <p className="text-slate-600 dark:text-text-secondary">إدارة الموظفين وصرف المرتبات والمكافآت</p>
            </div>

            {/* Company Filter */}
            <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary p-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-text-secondary mb-2">الشركة</label>
                        <select
                            value={selectedCompanyId || ''}
                            onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="px-4 py-2.5 bg-white dark:bg-surface-secondary border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-900 dark:text-text-primary font-medium transition-all"
                        >
                            <option value="">جميع الشركات</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div >

            {/* Stats Cards */}
            {
                stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <MainStatCard
                            title="الموظفين النشطين"
                            value={stats.totalActiveEmployees.toString()}
                            icon={Users}
                            iconBgColor="bg-blue-500"
                        />
                        <MainStatCard
                            title="مرتبات هذا الشهر"
                            value={formatCurrency(stats.thisMonth.totalAmount)}
                            subtitle={`${stats.thisMonth.salariesPaid} موظف`}
                            icon={Calendar}
                            iconBgColor="bg-green-500"
                        />
                        <MainStatCard
                            title="إجمالي هذا العام"
                            value={formatCurrency(stats.thisYear.grandTotal)}
                            icon={BarChart3}
                            iconBgColor="bg-purple-500"
                        />
                        <MainStatCard
                            title="مكافآت هذا العام"
                            value={formatCurrency(stats.thisYear.totalBonuses)}
                            subtitle={`${stats.thisYear.bonusesPaid} مكافأة`}
                            icon={Calendar} // Replaced Gift
                            iconBgColor="bg-orange-500"
                        />
                    </div>
                )
            }

            {/* Tabs */}
            <div className="bg-white dark:bg-surface-primary rounded-3xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
                <nav className="flex gap-2 p-2 border-b border-slate-100 dark:border-border-primary">
                    {[
                        { key: 'employees', label: '👥 الموظفين', icon: '👥' },
                        { key: 'salaries', label: '💵 سجل المرتبات', icon: '💵' },
                        { key: 'bonuses', label: '🎁 المكافآت', icon: '🎁' },
                        { key: 'stats', label: '📊 الإحصائيات', icon: '📊' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover hover:text-blue-600 dark:hover:text-blue-400'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Employees Tab */}
                    {activeTab === 'employees' && (
                        <div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        placeholder="🔍 بحث عن موظف..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl w-64"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    {selectedEmployees.length > 0 && (
                                        <button
                                            onClick={() => setShowBatchPayModal(true)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
                                        >
                                            💰 صرف مرتبات ({selectedEmployees.length})
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            resetEmployeeForm();
                                            setEditingEmployee(null);
                                            setShowEmployeeModal(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        ➕ إضافة موظف
                                    </button>
                                </div>
                            </div>

                            {/* Employees Table */}
                            {employeesLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : employees.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-text-tertiary">لا يوجد موظفين</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-surface-secondary">
                                            <tr>
                                                <th className="px-4 py-3 text-right">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmployees.length === employees.length}
                                                        onChange={selectAllEmployees}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-border-primary"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-black text-slate-600 dark:text-text-secondary uppercase tracking-wide">الاسم</th>
                                                <th className="px-4 py-3 text-right text-sm font-black text-slate-600 dark:text-text-secondary uppercase tracking-wide">المسمى الوظيفي</th>
                                                <th className="px-4 py-3 text-right text-sm font-black text-slate-600 dark:text-text-secondary uppercase tracking-wide">الراتب الأساسي</th>
                                                <th className="px-4 py-3 text-right text-sm font-black text-slate-600 dark:text-text-secondary uppercase tracking-wide">الشركة</th>
                                                <th className="px-4 py-3 text-right text-sm font-black text-slate-600 dark:text-text-secondary uppercase tracking-wide">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-border-primary">
                                            {employees.map(employee => (
                                                <tr key={employee.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors">
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmployees.includes(employee.id)}
                                                            onChange={() => toggleEmployeeSelection(employee.id)}
                                                            className="w-4 h-4"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{employee.name}</p>
                                                            {employee.phone && <p className="text-xs text-slate-500 dark:text-text-tertiary">{employee.phone}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">{employee.jobTitle || '-'}</td>
                                                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(employee.baseSalary)}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">{employee.company?.name}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openPayModal(employee)}
                                                                className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="صرف مرتب نهائي"
                                                            >
                                                                <CircleDollarSign className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openAdvanceModal(employee)}
                                                                className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="صرف سلفة / دفعة"
                                                            >
                                                                <ArrowRightLeft className="w-5 h-5 rotate-90" />
                                                            </button>
                                                            <button
                                                                onClick={() => openStatementModal(employee)}
                                                                className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="كشف حركة المرتب"
                                                            >
                                                                <FileText className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openBonusModal(employee)}
                                                                className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="صرف مكافأة"
                                                            >
                                                                <Layout className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(employee)}
                                                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="تعديل"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmployee(employee)}
                                                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md group"
                                                                title="حذف"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Salaries Tab */}
                    {activeTab === 'salaries' && (
                        <div>
                            {/* Filters and Print Button */}
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary mb-6">
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                        <select
                                            value={salaryMonth}
                                            onChange={(e) => setSalaryMonth(parseInt(e.target.value))}
                                            className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            {arabicMonths.slice(1).map((month, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                                        <select
                                            value={salaryYear}
                                            onChange={(e) => setSalaryYear(parseInt(e.target.value))}
                                            className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            {[2022, 2023, 2024, 2025, 2026, 2027].map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                                        <select
                                            value={statementEmployeeFilter || ''}
                                            onChange={(e) => setStatementEmployeeFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">جميع الموظفين</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.jobTitle || 'موظف'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handlePrintMonthlyReport}
                                        disabled={salaryPayments.length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="طباعة التقرير الشهري"
                                    >
                                        <PrinterIcon className="w-4 h-4" />
                                        طباعة التقرير
                                    </button>
                                </div>
                            </div>

                            {/* Salary Payments Table */}
                            {salaryLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : salaryPayments.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-text-tertiary">لا يوجد مرتبات مصروفة لهذا الشهر</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">رقم الإيصال</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">الموظف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">المبلغ</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">تاريخ الصرف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">ملاحظات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {salaryPayments.map(payment => (
                                                <tr key={payment.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-text-secondary">{payment.receiptNumber}</td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{payment.employee?.name}</p>
                                                            {payment.employee?.jobTitle && (
                                                                <p className="text-xs text-slate-500 dark:text-text-tertiary">{payment.employee.jobTitle}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">
                                                        {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 dark:text-text-tertiary text-sm">{payment.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bonuses Tab - Placeholder */}
                    {activeTab === 'bonuses' && (
                        <div>
                            {/* Filters for Bonuses */}
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary mb-6">
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                        <select
                                            value={bonusMonth}
                                            onChange={(e) => setBonusMonth(parseInt(e.target.value))}
                                            className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            {arabicMonths.slice(1).map((month, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                                        <select
                                            value={bonusYear}
                                            onChange={(e) => setBonusYear(parseInt(e.target.value))}
                                            className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            {[2022, 2023, 2024, 2025, 2026, 2027].map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع المكافأة</label>
                                        <select
                                            value={bonusTypeFilter}
                                            onChange={(e) => setBonusTypeFilter(e.target.value)}
                                            className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">جميع الأنواع</option>
                                            {bonusTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                                        <select
                                            value={bonusEmployeeFilter || ''}
                                            onChange={(e) => setBonusEmployeeFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">جميع الموظفين</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.jobTitle || 'موظف'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handlePrintBonusesReport}
                                        disabled={bonuses.length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="طباعة تقرير المكافآت"
                                    >
                                        <PrinterIcon className="w-4 h-4" />
                                        طباعة التقرير
                                    </button>
                                </div>
                            </div>

                            {/* Bonuses Table */}
                            {bonusesLoading ? (
                                <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary">جاري التحميل...</div>
                            ) : bonuses.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-text-tertiary bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary">
                                    <p className="text-lg font-medium mb-2">لا توجد مكافآت مسجلة</p>
                                    <p className="text-sm">اختر الفترة والفلاتر المطلوبة لعرض البيانات</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-orange-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">رقم الإيصال</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">الموظف</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">النوع</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">المبلغ</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">التاريخ</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 dark:text-text-secondary">السبب</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {bonuses.map(bonus => (
                                                    <tr key={bonus.id} className="hover:bg-orange-50/30">
                                                        <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-text-secondary">{bonus.receiptNumber}</td>
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{bonus.employee?.name}</p>
                                                                {bonus.employee?.jobTitle && (
                                                                    <p className="text-xs text-slate-500 dark:text-text-tertiary">{bonus.employee.jobTitle}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bonus.type === 'BONUS' ? 'bg-green-100 text-green-800' :
                                                                bonus.type === 'RAISE' ? 'bg-blue-100 text-blue-800' :
                                                                    bonus.type === 'INCENTIVE' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                {bonus.typeName}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-orange-600">{formatCurrency(bonus.amount)}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-text-secondary">
                                                            {new Date(bonus.paymentDate).toLocaleDateString('ar-LY')}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-text-tertiary text-sm">{bonus.reason || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Summary */}
                                    <div className="bg-orange-50 px-6 py-4 border-t border-slate-200 dark:border-border-primary">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">الإجمالي الكلي:</span>
                                            <span className="text-lg font-bold text-orange-600">
                                                {formatCurrency(bonuses.reduce((sum, b) => sum + Number(b.amount), 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats Tab */}
                    {activeTab === 'stats' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Filters for Stats */}
                            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary">
                                <label className="text-sm font-medium text-gray-700">السنة:</label>
                                <select
                                    value={statsYear}
                                    onChange={(e) => setStatsYear(parseInt(e.target.value))}
                                    className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {[2022, 2023, 2024, 2025, 2026, 2027].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                {selectedCompanyId && (
                                    <button
                                        onClick={() => setSelectedCompanyId(undefined)}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                    >
                                        عرض جميع الشركات
                                    </button>
                                )}
                            </div>

                            {/* Summary Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <TrendingUp className="w-8 h-8 opacity-50" />
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">سنوي</span>
                                    </div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">إجمالي المنصرف (رواتب ومكافآت)</p>
                                    <p className="text-3xl font-bold">{formatCurrency(stats?.thisYear.grandTotal || 0)}</p>
                                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                                        <span>عدد الدفعات: {stats?.thisYear.salariesPaid}</span>
                                        <span>+ {stats?.thisYear.bonusesPaid} مكافأة</span>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-green-100 p-2 rounded-xl">
                                            <LucideBarChart className="w-5 h-5 text-green-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-800">توزيع المصروفات</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500">المرتبات الأساسية</span>
                                                <span className="font-bold text-slate-700">{Math.round((stats?.thisYear.totalSalaries || 0) / (stats?.thisYear.grandTotal || 1) * 100)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats?.thisYear.totalSalaries || 0) / (stats?.thisYear.grandTotal || 1) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500">المكافآت والزيادات</span>
                                                <span className="font-bold text-slate-700">{Math.round((stats?.thisYear.totalBonuses || 0) / (stats?.thisYear.grandTotal || 1) * 100)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats?.thisYear.totalBonuses || 0) / (stats?.thisYear.grandTotal || 1) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-purple-100 p-2 rounded-xl">
                                            <Layout className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-800">التوزيع حسب الخزينة</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {stats?.treasuryDistribution.map((t, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600">{t.name}</span>
                                                <span className="font-bold text-slate-800">{formatCurrency(t.amount)}</span>
                                            </div>
                                        ))}
                                        {(!stats?.treasuryDistribution || stats.treasuryDistribution.length === 0) && (
                                            <p className="text-slate-400 text-xs text-center py-4 italic">لا توجد بيانات توزيع</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800">التحليل الشهري للمصروفات</h4>
                                            <p className="text-sm text-slate-500">عرض إجمالي المرتبات والمكافآت لكل شهر من السنة الحالية</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                                مرتبات
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                                                مكافآت
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[400px] w-full" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats?.monthlyBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="monthName"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                                    tickFormatter={(value) => `${value}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                    cursor={{ fill: '#f8fafc' }}
                                                />
                                                <Bar dataKey="salaries" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40} />
                                                <Bar dataKey="bonuses" stackId="a" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Modal */}
            {
                showEmployeeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                                <h3 className="text-lg font-bold">{editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}</h3>
                                <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="text-white hover:text-gray-200">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                {!selectedCompanyId && !editingEmployee && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الشركة *</label>
                                        <select
                                            value={employeeForm.companyId}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, companyId: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                            required
                                        >
                                            <option value="">اختر الشركة</option>
                                            {companies.map(company => (
                                                <option key={company.id} value={company.id}>{company.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                                    <input
                                        type="text"
                                        value={employeeForm.name}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
                                    <input
                                        type="text"
                                        value={employeeForm.jobTitle}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                                        <input
                                            type="tel"
                                            value={employeeForm.phone}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                                        <input
                                            type="email"
                                            value={employeeForm.email}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الأساسي *</label>
                                        <input
                                            type="number"
                                            value={employeeForm.baseSalary}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, baseSalary: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                                        <input
                                            type="date"
                                            value={employeeForm.hireDate}
                                            onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                    <textarea
                                        value={employeeForm.notes}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }}
                                    className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
                                    disabled={creating || updating}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {editingEmployee ? 'تحديث' : 'إضافة'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pay Salary Modal */}
            {
                showPayModal && selectedEmployee && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                                <h3 className="text-lg font-bold">💵 صرف مرتب - {selectedEmployee.name}</h3>
                                <button onClick={() => { setShowPayModal(false); setSelectedEmployee(null); }} className="text-white hover:text-gray-200">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center mb-4">
                                    <div>
                                        <p className="text-xs text-blue-600">الراتب الأساسي</p>
                                        <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedEmployee.baseSalary)}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-blue-600">توع الصرف</p>
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${payForm.type === 'FINAL' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {payForm.type === 'FINAL' ? 'تسوية نهائية' : 'دفعة / سلفة'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                        <select
                                            value={payForm.month}
                                            onChange={(e) => setPayForm({ ...payForm, month: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        >
                                            {arabicMonths.slice(1).map((month, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                                        <select
                                            value={payForm.year}
                                            onChange={(e) => setPayForm({ ...payForm, year: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        >
                                            {[2024, 2025, 2026].map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع العملية</label>
                                        <select
                                            value={payForm.type}
                                            onChange={(e) => setPayForm({ ...payForm, type: e.target.value as any, amount: e.target.value === 'FINAL' ? selectedEmployee.baseSalary.toString() : payForm.amount })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="PARTIAL">دفعة جزئية / سلفة</option>
                                            <option value="FINAL">تسوية نهائية (الراتب)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                                        <input
                                            type="number"
                                            value={payForm.amount}
                                            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                            placeholder={payForm.type === 'FINAL' ? selectedEmployee.baseSalary.toString() : "أدخل المبلغ..."}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                    <select
                                        value={payForm.treasuryId}
                                        onChange={(e) => setPayForm({ ...payForm, treasuryId: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">اختر الخزينة</option>
                                        {treasuries.map(treasury => (
                                            <option key={treasury.id} value={treasury.id}>
                                                {treasury.name} ({formatCurrency(treasury.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                    <textarea
                                        value={payForm.notes}
                                        onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-500"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowPayModal(false); setSelectedEmployee(null); }}
                                    className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handlePaySalary}
                                    disabled={payingOne}
                                    className={`px-6 py-2 text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 ${payForm.type === 'FINAL' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                >
                                    {payForm.type === 'FINAL' ? 'إتمام التسوية النهائية' : 'صرف الدفعة / السلفة'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bonus Modal */}
            {
                showBonusModal && selectedEmployee && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="bg-orange-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                                <h3 className="text-lg font-bold">🎁 صرف مكافأة - {selectedEmployee.name}</h3>
                                <button onClick={() => { setShowBonusModal(false); setSelectedEmployee(null); }} className="text-white hover:text-gray-200">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع المكافأة</label>
                                    <select
                                        value={bonusForm.type}
                                        onChange={(e) => setBonusForm({ ...bonusForm, type: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                    >
                                        {bonusTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                                    <input
                                        type="number"
                                        value={bonusForm.amount}
                                        onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
                                    <input
                                        type="text"
                                        value={bonusForm.reason}
                                        onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                    <select
                                        value={bonusForm.treasuryId}
                                        onChange={(e) => setBonusForm({ ...bonusForm, treasuryId: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        required
                                    >
                                        <option value="">اختر الخزينة</option>
                                        {treasuries.map(treasury => (
                                            <option key={treasury.id} value={treasury.id}>
                                                {treasury.name} ({formatCurrency(treasury.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowBonusModal(false); setSelectedEmployee(null); }}
                                    className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handlePayBonus}
                                    disabled={payingBonus}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50"
                                >
                                    صرف المكافأة
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Batch Pay Modal */}
            {
                showBatchPayModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                                <h3 className="text-lg font-bold">💰 صرف مرتبات جماعي ({selectedEmployees.length} موظف)</h3>
                                <button onClick={() => setShowBatchPayModal(false)} className="text-white hover:text-gray-200">✕</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                        <select
                                            value={payForm.month}
                                            onChange={(e) => setPayForm({ ...payForm, month: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        >
                                            {arabicMonths.slice(1).map((month, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                                        <select
                                            value={payForm.year}
                                            onChange={(e) => setPayForm({ ...payForm, year: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        >
                                            {[2024, 2025, 2026].map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                    <select
                                        value={payForm.treasuryId}
                                        onChange={(e) => setPayForm({ ...payForm, treasuryId: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl"
                                        required
                                    >
                                        <option value="">اختر الخزينة</option>
                                        {treasuries.map(treasury => (
                                            <option key={treasury.id} value={treasury.id}>
                                                {treasury.name} ({formatCurrency(treasury.balance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <p className="text-blue-800 text-sm">
                                        سيتم صرف الراتب الأساسي لكل موظف من الخزينة المختارة.
                                    </p>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 dark:bg-surface-secondary rounded-b-xl flex justify-end gap-3">
                                <button
                                    onClick={() => setShowBatchPayModal(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-gray-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handlePayMultiple}
                                    disabled={payingMultiple}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                                >
                                    صرف المرتبات
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Salary Statement Modal */}
            {
                showStatementModal && selectedEmployee && (
                    <SalaryStatementModal
                        employeeId={selectedEmployee.id}
                        month={payForm.month}
                        year={payForm.year}
                        onClose={() => setShowStatementModal(false)}
                    />
                )
            }


            {/* Hidden div for printing - للطباعة فقط (مخفي) */}
            <div ref={printRef} style={{ display: 'none' }}>
                <PayrollMonthlyReport
                    month={salaryMonth}
                    year={salaryYear}
                    payments={salaryPayments}
                    bonuses={[]}
                    companyName={getCompanyInfo().name}
                    userName={getCompanyInfo().userName}
                />
            </div>

            {/* Hidden div for bonuses printing - للطباعة المكافآت (مخفي) */}
            <div ref={bonusesPrintRef} style={{ display: 'none' }}>
                <BonusesReport
                    bonuses={bonuses}
                    month={bonusMonth}
                    year={bonusYear}
                    type={bonusTypeFilter}
                    companyName={getCompanyInfo().name}
                    userName={getCompanyInfo().userName}
                />
            </div>
        </div >
    );
}

// ========== Salary Statement Modal Component ==========
function SalaryStatementModal({ employeeId, month: initialMonth, year: initialYear, onClose }: { employeeId: number; month: number; year: number; onClose: () => void }) {
    const [filterMonth, setFilterMonth] = React.useState(initialMonth);
    const [filterYear, setFilterYear] = React.useState(initialYear);

    const { data, isLoading } = useGetSalaryStatementQuery({ employeeId, month: filterMonth, year: filterYear });
    const statement = data?.data;
    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current) return;

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            alert('تم حظر النافذة المنبثقة. الرجاء السماح بالنوافذ المنبثقة.');
            return;
        }

        const htmlContent = `
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>كشف حركة المرتب - ${statement?.employee.name}</title>
                                <style>
                                    * {
                                        margin: 0;
                                    padding: 0;
                                    box-sizing: border-box;
                    }

                                    body {
                                        font - family: 'Arial', 'Segoe UI', sans-serif;
                                    direction: rtl;
                                    background: white;
                                    padding: 20px;
                    }

                                    @media print {
                                        body {
                                        padding: 0;
                        }

                                    @page {
                                        size: A4;
                                    margin: 15mm;
                        }
                    }

                                    .print-content {
                                        max - width: 210mm;
                                    margin: 0 auto;
                                    background: white;
                    }

                                    table {
                                        width: 100%;
                                    border-collapse: collapse;
                    }

                                    th, td {
                                        border: 1px solid #e2e8f0;
                                    padding: 12px 8px;
                                    text-align: right;
                    }

                                    th {
                                        background - color: #f8fafc;
                                    font-weight: bold;
                                    color: #475569;
                                    font-size: 12px;
                    }

                                    .badge {
                                        display: inline-block;
                                    padding: 4px 8px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: bold;
                    }

                                    .badge-green {
                                        background - color: #dcfce7;
                                    color: #166534;
                                    border: 1px solid #86efac;
                    }

                                    .badge-amber {
                                        background - color: #fef3c7;
                                    color: #92400e;
                                    border: 1px solid #fbbf24;
                    }

                                    -webkit-print-color-adjust: exact;
                                    print-color-adjust: exact;
                                </style>
                            </head>
                            <body>
                                <div class="print-content">
                                    ${printRef.current.innerHTML}
                                </div>
                                <script>
                                    window.onload = function() {
                                        setTimeout(() => {
                                            window.print();
                                        }, 500);
                    };
                                    window.onafterprint = function() {
                                        setTimeout(() => {
                                            window.close();
                                        }, 100);
                    };
                                </script>
                            </body>
                        </html>
                        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    if (isLoading) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl">جاري تحميل كشف الحركة...</div>
        </div>
    );

    if (!statement) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl">حدث خطأ في تحميل البيانات</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print-root">
                <div className="bg-purple-600 text-white px-8 py-5 flex justify-between items-center no-print">
                    <h3 className="text-xl font-bold flex items-center gap-2 font-cairo">
                        <FileText className="w-6 h-6" />
                        كشف حركة المرتب التفصيلي
                    </h3>
                    <div className="flex gap-4">
                        <button onClick={handlePrint} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium border border-white/30">
                            <Plus className="w-4 h-4 rotate-45" /> {/* Just to use an icon if Printer fails */}
                            طباعة الكشف
                        </button>
                        <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Filters Section - داخل المودال */}
                <div className="px-8 pt-4 pb-0 no-print bg-slate-50 dark:bg-surface-secondary border-b border-slate-200 dark:border-border-primary">
                    <div className="flex gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-purple-500"
                            >
                                {arabicMonths.slice(1).map((month, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{month}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                className="px-4 py-2 border border-slate-300 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-purple-500"
                            >
                                {[2022, 2023, 2024, 2025, 2026, 2027].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-text-secondary px-4 py-2">
                            يتم تحديث الكشف تلقائياً عند تغيير الفلاتر
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 print:overflow-visible print:max-h-none" id="print-section" dir="rtl">
                    {/* Header for Print */}
                    <div className="text-center mb-8 border-b-2 border-purple-100 pb-6 print:border-slate-300">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">كشف حركة المرتب الشهرية</h2>
                        <div className="flex justify-center gap-8 text-slate-600 font-medium mb-2">
                            <p>الشهر: <span className="text-purple-700">{statement.monthName}</span></p>
                            <p>السنة: <span className="text-purple-700">{statement.year}</span></p>
                        </div>
                        <div className="hidden print:block text-xs text-slate-500 mt-3">
                            <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}</p>
                        </div>
                    </div>

                    {/* Employee Info Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-right">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">بيانات الموظف</h4>
                            <p className="text-xl font-bold text-slate-800 mb-1">{statement.employee.name}</p>
                            <p className="text-slate-500">{statement.employee.jobTitle || 'موظف'}</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 grid grid-cols-3 gap-4 text-right">
                            <div className="text-center">
                                <p className="text-xs text-purple-600 mb-1">الراتب الأساسي</p>
                                <p className="text-lg font-bold text-slate-800">{new Intl.NumberFormat('ar-LY').format(statement.summary.baseSalary)}</p>
                            </div>
                            <div className="text-center border-x border-purple-200">
                                <p className="text-xs text-purple-600 mb-1">إجمالي المنصرف</p>
                                <p className="text-lg font-bold text-green-600">{new Intl.NumberFormat('ar-LY').format(statement.summary.totalPaid)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-purple-600 mb-1">المتبقي</p>
                                <p className={`text-lg font-bold ${statement.summary.remaining > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {new Intl.NumberFormat('ar-LY').format(statement.summary.remaining)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Movements Table */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                            📊 سجل الحركات المالية
                        </h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm print:border-0 print:shadow-none">
                            <table className="w-full text-right border-collapse print:border print:border-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">تاريخ الحركة</th>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">نوع الحركة</th>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">المبلغ</th>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">الخزينة</th>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">الإيصال</th>
                                        <th className="px-4 py-4 text-xs font-bold text-slate-500 border-b">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statement.movements.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic">لاتوجد حركات مسجلة لهذا الشهر</td>
                                        </tr>
                                    ) : (
                                        statement.movements.map((move, idx) => (
                                            <tr key={move.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                <td className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">
                                                    {new Date(move.date).toLocaleDateString('ar-LY')}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${move.type === 'تسوية نهائية'
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        }`}>
                                                        {move.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm font-bold text-slate-800">
                                                    {new Intl.NumberFormat('ar-LY').format(move.amount)} د.ل
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-600">{move.treasury}</td>
                                                <td className="px-4 py-4 text-xs font-mono text-slate-500">{move.receiptNumber || '-'}</td>
                                                <td className="px-4 py-4 text-xs text-slate-500">{move.notes || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-100/50 font-bold border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-4 text-slate-700">إجمالي مدفوعات الشهر</td>
                                        <td className="px-4 py-4 text-green-700 text-lg">
                                            {new Intl.NumberFormat('ar-LY').format(statement.summary.totalPaid)} د.ل
                                        </td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Footer for print */}
                    <div className="mt-12 hidden print:grid grid-cols-2 gap-12 text-center items-end">
                        <div className="space-y-12">
                            <p className="font-bold border-b border-slate-300 pb-2">توقيع الموظف</p>
                            <p className="text-slate-400 text-xs text-center">________________________</p>
                        </div>
                        <div className="space-y-12">
                            <p className="font-bold border-b border-slate-300 pb-2">ختم وتوقيع الإدارة المالية</p>
                            <p className="text-slate-400 text-xs text-center">________________________</p>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end no-print">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-medium">
                        إغلاق الكشف
                    </button>
                </div>
            </div>

            {/* Hidden div for printing */}
            <div ref={printRef} style={{ display: 'none' }}>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '30px', borderBottom: '2px solid #cbd5e1', paddingBottom: '20px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>
                            كشف حركة المرتب الشهرية
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', fontSize: '14px', color: '#64748b' }}>
                            <p>الشهر: <strong style={{ color: '#7c3aed' }}>{statement.monthName}</strong></p>
                            <p>السنة: <strong style={{ color: '#7c3aed' }}>{statement.year}</strong></p>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
                            تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')} - {new Date().toLocaleTimeString('ar-LY')}
                        </p>
                    </div>

                    {/* Employee Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', textAlign: 'right' }}>
                        <div style={{ padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px' }}>بيانات الموظف</h4>
                            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>{statement.employee.name}</p>
                            <p style={{ fontSize: '14px', color: '#64748b' }}>{statement.employee.jobTitle || 'موظف'}</p>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#7c3aed', marginBottom: '5px' }}>الراتب الأساسي</p>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{new Intl.NumberFormat('ar-LY').format(statement.summary.baseSalary)}</p>
                                </div>
                                <div style={{ borderLeft: '1px solid #e9d5ff', borderRight: '1px solid #e9d5ff' }}>
                                    <p style={{ fontSize: '11px', color: '#7c3aed', marginBottom: '5px' }}>إجمالي المنصرف</p>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{new Intl.NumberFormat('ar-LY').format(statement.summary.totalPaid)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#7c3aed', marginBottom: '5px' }}>المتبقي</p>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: statement.summary.remaining > 0 ? '#f59e0b' : '#1e293b' }}>
                                        {new Intl.NumberFormat('ar-LY').format(statement.summary.remaining)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Movements Table */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textAlign: 'right' }}>
                            📊 سجل الحركات المالية
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>تاريخ الحركة</th>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>نوع الحركة</th>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>المبلغ</th>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>الخزينة</th>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>الإيصال</th>
                                    <th style={{ padding: '12px 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statement.movements.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                                            لا توجد حركات مسجلة لهذا الشهر
                                        </td>
                                    </tr>
                                ) : (
                                    statement.movements.map((move, idx) => (
                                        <tr key={move.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#475569', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                                {new Date(move.date).toLocaleDateString('ar-LY')}
                                            </td>
                                            <td style={{ padding: '12px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                                <span className={move.type === 'تسوية نهائية' ? 'badge badge-green' : 'badge badge-amber'}>
                                                    {move.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                                {new Intl.NumberFormat('ar-LY').format(move.amount)} د.ل
                                            </td>
                                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#475569', border: '1px solid #e2e8f0', textAlign: 'right' }}>{move.treasury}</td>
                                            <td style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>{move.receiptNumber || '-'}</td>
                                            <td style={{ padding: '12px 8px', fontSize: '11px', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'right' }}>{move.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                                    <td colSpan={2} style={{ padding: '12px 8px', color: '#334155', border: '1px solid #e2e8f0', textAlign: 'right' }}>إجمالي مدفوعات الشهر</td>
                                    <td style={{ padding: '12px 8px', fontSize: '16px', color: '#16a34a', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                        {new Intl.NumberFormat('ar-LY').format(statement.summary.totalPaid)} د.ل
                                    </td>
                                    <td colSpan={3} style={{ border: '1px solid #e2e8f0' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '60px', textAlign: 'center' }}>
                        <div>
                            <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '40px' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>توقيع الموظف</p>
                            </div>
                        </div>
                        <div>
                            <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '40px' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>ختم وتوقيع الإدارة المالية</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
