'use client';

/**
 * صفحة المرتبات والموظفين
 * Payroll & Employees Management Page
 */

import React, { useState } from 'react';
import {
    useGetEmployeesQuery,
    useGetEmployeeQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useDeleteEmployeeMutation,
    usePaySalaryMutation,
    usePayMultipleSalariesMutation,
    useGetSalaryPaymentsQuery,
    usePayBonusMutation,
    useGetPayrollStatsQuery,
    Employee,
    SalaryPayment,
} from '@/state/payrollApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import { Users, Calendar, BarChart3, Gift } from 'lucide-react';

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
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

    // Salary filter
    const currentDate = new Date();
    const [salaryMonth, setSalaryMonth] = useState(currentDate.getMonth() + 1);
    const [salaryYear, setSalaryYear] = useState(currentDate.getFullYear());

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

    const { data: statsData } = useGetPayrollStatsQuery({
        companyId: selectedCompanyId,
        year: currentDate.getFullYear()
    });

    const { data: treasuriesData } = useGetTreasuriesQuery({});
    const { data: companiesData } = useGetCompaniesQuery({});

    // Mutations
    const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
    const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
    const [deleteEmployee] = useDeleteEmployeeMutation();
    const [paySalary, { isLoading: payingOne }] = usePaySalaryMutation();
    const [payMultipleSalaries, { isLoading: payingMultiple }] = usePayMultipleSalariesMutation();
    const [payBonus, { isLoading: payingBonus }] = usePayBonusMutation();

    const employees = employeesData?.data || [];
    const salaryPayments = salaryData?.data || [];
    const treasuries = treasuriesData || [];
    const companies = companiesData?.data?.companies || [];
    const stats = statsData?.data;

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
                treasuryId: parseInt(payForm.treasuryId),
                notes: payForm.notes || undefined
            }).unwrap();

            setShowPayModal(false);
            setSelectedEmployee(null);
            resetPayForm();
            refetchEmployees();
            alert('تم صرف المرتب بنجاح');
        } catch (error: any) {
            alert(error.data?.message || 'حدث خطأ أثناء صرف المرتب');
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

    return (
        <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 إدارة المرتبات</h1>
                <p className="text-gray-600">إدارة الموظفين وصرف المرتبات والمكافآت</p>
            </div>

            {/* Company Filter */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">جميع الشركات</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
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
                        icon={Gift}
                        iconBgColor="bg-orange-500"
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md mb-6">
                <div className="border-b border-gray-200">
                    <div className="flex">
                        {[
                            { key: 'employees', label: '👥 الموظفين', icon: '👥' },
                            { key: 'salaries', label: '💵 سجل المرتبات', icon: '💵' },
                            { key: 'bonuses', label: '🎁 المكافآت', icon: '🎁' },
                            { key: 'stats', label: '📊 الإحصائيات', icon: '📊' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-6 py-4 font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

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
                                        className="px-4 py-2 border border-gray-300 rounded-lg w-64"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    {selectedEmployees.length > 0 && (
                                        <button
                                            onClick={() => setShowBatchPayModal(true)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
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
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        ➕ إضافة موظف
                                    </button>
                                </div>
                            </div>

                            {/* Employees Table */}
                            {employeesLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : employees.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">لا يوجد موظفين</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-right">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmployees.length === employees.length}
                                                        onChange={selectAllEmployees}
                                                        className="w-4 h-4"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الاسم</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">المسمى الوظيفي</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الراتب الأساسي</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الشركة</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {employees.map(employee => (
                                                <tr key={employee.id} className="hover:bg-gray-50">
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
                                                            {employee.phone && <p className="text-xs text-gray-500">{employee.phone}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{employee.jobTitle || '-'}</td>
                                                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(employee.baseSalary)}</td>
                                                    <td className="px-4 py-3 text-gray-600">{employee.company?.name}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openPayModal(employee)}
                                                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                                                                title="صرف مرتب"
                                                            >
                                                                💵
                                                            </button>
                                                            <button
                                                                onClick={() => openBonusModal(employee)}
                                                                className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
                                                                title="صرف مكافأة"
                                                            >
                                                                🎁
                                                            </button>
                                                            <button
                                                                onClick={() => openEditModal(employee)}
                                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                                                title="تعديل"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmployee(employee)}
                                                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                                                title="حذف"
                                                            >
                                                                🗑️
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
                            {/* Filters */}
                            <div className="flex gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                    <select
                                        value={salaryMonth}
                                        onChange={(e) => setSalaryMonth(parseInt(e.target.value))}
                                        className="px-4 py-2 border border-gray-300 rounded-lg"
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
                                        className="px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        {[2024, 2025, 2026].map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Salary Payments Table */}
                            {salaryLoading ? (
                                <div className="text-center py-10">جاري التحميل...</div>
                            ) : salaryPayments.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">لا يوجد مرتبات مصروفة لهذا الشهر</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">رقم الإيصال</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الموظف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">المبلغ</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">تاريخ الصرف</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ملاحظات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {salaryPayments.map(payment => (
                                                <tr key={payment.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{payment.receiptNumber}</td>
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{payment.employee?.name}</p>
                                                            {payment.employee?.jobTitle && (
                                                                <p className="text-xs text-gray-500">{payment.employee.jobTitle}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {new Date(payment.paymentDate).toLocaleDateString('ar-LY')}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-sm">{payment.notes || '-'}</td>
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
                        <div className="text-center py-10 text-gray-500">
                            سجل المكافآت والزيادات - قيد التطوير
                        </div>
                    )}

                    {/* Stats Tab - Placeholder */}
                    {activeTab === 'stats' && (
                        <div className="text-center py-10 text-gray-500">
                            إحصائيات تفصيلية - قيد التطوير
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Modal */}
            {showEmployeeModal && (
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
                                <input
                                    type="text"
                                    value={employeeForm.jobTitle}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                                    <input
                                        type="tel"
                                        value={employeeForm.phone}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        value={employeeForm.email}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                                    <input
                                        type="date"
                                        value={employeeForm.hireDate}
                                        onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                <textarea
                                    value={employeeForm.notes}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
                                disabled={creating || updating}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {editingEmployee ? 'تحديث' : 'إضافة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Salary Modal */}
            {showPayModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="bg-green-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                            <h3 className="text-lg font-bold">💵 صرف مرتب - {selectedEmployee.name}</h3>
                            <button onClick={() => { setShowPayModal(false); setSelectedEmployee(null); }} className="text-white hover:text-gray-200">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                                    <select
                                        value={payForm.month}
                                        onChange={(e) => setPayForm({ ...payForm, month: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        {[2024, 2025, 2026].map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    placeholder={`الراتب الأساسي: ${formatCurrency(selectedEmployee.baseSalary)}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                <select
                                    value={payForm.treasuryId}
                                    onChange={(e) => setPayForm({ ...payForm, treasuryId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowPayModal(false); setSelectedEmployee(null); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handlePaySalary}
                                disabled={payingOne}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                صرف المرتب
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bonus Modal */}
            {showBonusModal && selectedEmployee && (
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
                                <input
                                    type="text"
                                    value={bonusForm.reason}
                                    onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الخزينة *</label>
                                <select
                                    value={bonusForm.treasuryId}
                                    onChange={(e) => setBonusForm({ ...bonusForm, treasuryId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => { setShowBonusModal(false); setSelectedEmployee(null); }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handlePayBonus}
                                disabled={payingBonus}
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                صرف المكافأة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Pay Modal */}
            {showBatchPayModal && (
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-blue-800 text-sm">
                                    سيتم صرف الراتب الأساسي لكل موظف من الخزينة المختارة.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setShowBatchPayModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handlePayMultiple}
                                disabled={payingMultiple}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                صرف المرتبات
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
