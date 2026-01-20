'use client';

import React, { useState, useEffect } from 'react';
import {
    useGetTreasuriesQuery,
    useGetTreasuryStatsQuery,
    useGetAllTransactionsQuery,
    useCreateTreasuryMutation,
    useCreateTransactionMutation,
    useTransferBetweenTreasuriesMutation,
    useDeleteTreasuryMutation,
    Treasury,
    TreasuryTransaction,
} from '@/state/treasuryApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
import {
    Wallet,
    Building2,
    Landmark,
    Plus,
    ArrowDownCircle,
    ArrowUpCircle,
    ArrowLeftRight,
    Search,
    Filter,
    RefreshCw,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Printer,
} from 'lucide-react';

// تنسيق العملة
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' د.ل';
};

// تنسيق التاريخ
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ترجمة نوع الخزينة
const getTreasuryTypeLabel = (type: string) => {
    switch (type) {
        case 'COMPANY': return 'خزينة شركة';
        case 'GENERAL': return 'خزينة عامة';
        case 'BANK': return 'حساب مصرفي';
        default: return type;
    }
};

// ترجمة نوع الحركة
const getTransactionTypeLabel = (type: string) => {
    switch (type) {
        case 'DEPOSIT': return 'إيداع';
        case 'WITHDRAWAL': return 'سحب';
        case 'TRANSFER': return 'تحويل';
        default: return type;
    }
};

// ترجمة مصدر الحركة
const getTransactionSourceLabel = (source: string) => {
    switch (source) {
        case 'RECEIPT': return 'إيصال قبض';
        case 'PAYMENT': return 'إيصال صرف';
        case 'MANUAL': return 'يدوي';
        case 'TRANSFER_IN': return 'تحويل وارد';
        case 'TRANSFER_OUT': return 'تحويل صادر';
        case 'OPENING_BALANCE': return 'رصيد افتتاحي';
        case 'SALARY': return 'رواتب';
        case 'BONUS': return 'مكافآت';
        case 'BAD_DEBT': return 'مصروفات معدومة';
        case 'SALE': return 'مبيعات';
        default: return source;
    }
};

// أيقونة نوع الخزينة
const TreasuryTypeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'COMPANY':
            return <Building2 className="w-5 h-5 text-blue-600" />;
        case 'GENERAL':
            return <Wallet className="w-5 h-5 text-green-600" />;
        case 'BANK':
            return <Landmark className="w-5 h-5 text-purple-600" />;
        default:
            return <Wallet className="w-5 h-5 text-slate-600 dark:text-text-secondary" />;
    }
};

interface MainStatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    iconBgColor: string;
}

const MainStatCard = ({ title, value, subtitle, icon: Icon, iconBgColor }: MainStatCardProps) => {
    return (
        <div className="bg-white dark:bg-surface-primary p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center text-white`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-text-tertiary">{title}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-text-primary">{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 dark:text-text-muted mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
};

export default function TreasuryPage() {
    // State
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'treasuries'>('overview');
    const [showCreateTreasuryModal, setShowCreateTreasuryModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');

    // Filters
    const [selectedTreasury, setSelectedTreasury] = useState<number | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('');
    const [page, setPage] = useState(1);

    // Form State
    const [treasuryForm, setTreasuryForm] = useState({
        name: '',
        type: 'GENERAL' as 'COMPANY' | 'GENERAL' | 'BANK',
        companyId: '',
        bankName: '',
        accountNumber: '',
        openingBalance: '',
    });

    const [transactionForm, setTransactionForm] = useState({
        treasuryId: '',
        amount: '',
        description: '',
    });

    const [transferForm, setTransferForm] = useState({
        fromTreasuryId: '',
        toTreasuryId: '',
        amount: '',
        description: '',
    });

    // Queries
    const { data: treasuries, isLoading: treasuriesLoading, refetch: refetchTreasuries } = useGetTreasuriesQuery({});
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetTreasuryStatsQuery();
    const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useGetAllTransactionsQuery({
        treasuryId: selectedTreasury || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        type: transactionTypeFilter || undefined,
        page,
        limit: 20,
    });
    const { data: companiesData } = useGetCompaniesQuery({});
    const companies = companiesData?.data?.companies || [];

    // Mutations
    const [createTreasury, { isLoading: isCreatingTreasury }] = useCreateTreasuryMutation();
    const [createTransaction, { isLoading: isCreatingTransaction }] = useCreateTransactionMutation();
    const [transferBetweenTreasuries, { isLoading: isTransferring }] = useTransferBetweenTreasuriesMutation();
    const [deleteTreasury] = useDeleteTreasuryMutation();

    // Handlers
    const handleCreateTreasury = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTreasury({
                name: treasuryForm.name,
                type: treasuryForm.type,
                companyId: treasuryForm.companyId ? Number(treasuryForm.companyId) : undefined,
                bankName: treasuryForm.bankName || undefined,
                accountNumber: treasuryForm.accountNumber || undefined,
                openingBalance: treasuryForm.openingBalance ? Number(treasuryForm.openingBalance) : undefined,
            }).unwrap();
            setShowCreateTreasuryModal(false);
            setTreasuryForm({
                name: '',
                type: 'GENERAL',
                companyId: '',
                bankName: '',
                accountNumber: '',
                openingBalance: '',
            });
            refetchTreasuries();
            refetchStats();
        } catch (error: any) {
            console.error('Error creating treasury:', JSON.stringify(error, null, 2));
            console.error('Error status:', error?.status);
            console.error('Error data:', error?.data);
            const errorMessage = error?.data?.error || error?.data?.message || error?.data?.details || error?.message || 'فشل في إنشاء الخزينة';
            alert(`خطأ: ${errorMessage}`);
        }
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTransaction({
                treasuryId: Number(transactionForm.treasuryId),
                type: transactionType,
                amount: Number(transactionForm.amount),
                description: transactionForm.description || undefined,
            }).unwrap();
            setShowTransactionModal(false);
            setTransactionForm({
                treasuryId: '',
                amount: '',
                description: '',
            });
            refetchTreasuries();
            refetchStats();
            refetchTransactions();
        } catch (error: any) {
            console.error('Error creating transaction:', error);
            alert(error.data?.error || 'فشل في إنشاء الحركة');
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await transferBetweenTreasuries({
                fromTreasuryId: Number(transferForm.fromTreasuryId),
                toTreasuryId: Number(transferForm.toTreasuryId),
                amount: Number(transferForm.amount),
                description: transferForm.description || undefined,
            }).unwrap();
            setShowTransferModal(false);
            setTransferForm({
                fromTreasuryId: '',
                toTreasuryId: '',
                amount: '',
                description: '',
            });
            refetchTreasuries();
            refetchStats();
            refetchTransactions();
        } catch (error: any) {
            console.error('Error transferring:', error);
            alert(error.data?.error || 'فشل في التحويل');
        }
    };

    const handleDeleteTreasury = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذه الخزينة؟')) return;
        try {
            await deleteTreasury(id).unwrap();
            refetchTreasuries();
            refetchStats();
        } catch (error) {
            console.error('Error deleting treasury:', error);
            alert('فشل في حذف الخزينة');
        }
    };

    const openDepositModal = () => {
        setTransactionType('DEPOSIT');
        setShowTransactionModal(true);
    };

    const openWithdrawModal = () => {
        setTransactionType('WITHDRAWAL');
        setShowTransactionModal(true);
    };

    // طباعة حركات الخزينة
    const handlePrintTransactions = () => {
        const transactions = transactionsData?.transactions || [];
        if (transactions.length === 0) {
            alert('لا توجد حركات للطباعة');
            return;
        }

        // الحصول على اسم الخزينة المختارة
        const selectedTreasuryName = selectedTreasury
            ? treasuries?.find((t: Treasury) => t.id === selectedTreasury)?.name
            : 'جميع الخزائن';

        // ترجمة نوع الحركة للفلتر
        const getTypeFilterLabel = (type: string) => {
            switch (type) {
                case 'DEPOSIT': return 'إيداع';
                case 'WITHDRAWAL': return 'سحب';
                case 'TRANSFER': return 'تحويل';
                default: return 'جميع الأنواع';
            }
        };

        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>تقرير حركات الخزينة</title>
                <style>
                    body {
                        font-family: 'Arial', 'Tahoma', sans-serif;
                        padding: 20px;
                        direction: rtl;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #1e40af;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #1e40af;
                        margin: 0 0 10px 0;
                        font-size: 28px;
                    }
                    .filters-info {
                        background: #f3f4f6;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    .filters-info p {
                        margin: 5px 0;
                        font-size: 14px;
                    }
                    .filters-info strong {
                        color: #1e40af;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th {
                        background: #1e40af;
                        color: white;
                        padding: 12px 8px;
                        text-align: right;
                        font-size: 13px;
                    }
                    td {
                        border: 1px solid #ddd;
                        padding: 10px 8px;
                        font-size: 12px;
                    }
                    tr:nth-child(even) {
                        background: #f9fafb;
                    }
                    .amount-deposit {
                        color: #059669;
                        font-weight: bold;
                    }
                    .amount-withdrawal {
                        color: #dc2626;
                        font-weight: bold;
                    }
                    .type-badge {
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .type-deposit {
                        background: #dcfce7;
                        color: #166534;
                    }
                    .type-withdrawal {
                        background: #fee2e2;
                        color: #991b1b;
                    }
                    .type-transfer {
                        background: #e9d5ff;
                        color: #6b21a8;
                    }
                    .print-date {
                        text-align: left;
                        font-size: 12px;
                        color: #666;
                        margin-top: 30px;
                    }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏦 تقرير حركات الخزينة</h1>
                </div>
                
                <div class="filters-info">
                    <p><strong>الخزينة:</strong> ${selectedTreasuryName}</p>
                    <p><strong>نوع الحركة:</strong> ${getTypeFilterLabel(transactionTypeFilter)}</p>
                    <p><strong>الفترة:</strong> ${dateFrom ? 'من ' + dateFrom : 'من البداية'} ${dateTo ? ' إلى ' + dateTo : ' إلى الآن'}</p>
                    <p><strong>عدد الحركات:</strong> ${transactions.length}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>التاريخ</th>
                            <th>الخزينة</th>
                            <th>النوع</th>
                            <th>المصدر</th>
                            <th>المبلغ</th>
                            <th>الرصيد بعد</th>
                            <th>الوصف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map((t: TreasuryTransaction, index: number) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDate(t.createdAt)}</td>
                                <td>${t.treasury?.name || '-'}</td>
                                <td>
                                    <span class="type-badge type-${t.type.toLowerCase()}">
                                        ${getTransactionTypeLabel(t.type)}
                                    </span>
                                </td>
                                <td>${getTransactionSourceLabel(t.source)}</td>
                                <td class="${t.type === 'DEPOSIT' || t.source === 'TRANSFER_IN' ? 'amount-deposit' : 'amount-withdrawal'}">
                                    ${t.type === 'DEPOSIT' || t.source === 'TRANSFER_IN' ? '+' : '-'}${formatCurrency(Number(t.amount))}
                                </td>
                                <td>${formatCurrency(Number(t.balanceAfter))}</td>
                                <td>${t.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <p class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    return (
        <div className="max-w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-text-primary tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        حركات الخزينة
                    </h1>
                    <p className="text-slate-500 dark:text-text-secondary font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        إدارة الخزائن والحسابات المصرفية وحركات الأموال
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={openDepositModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <ArrowDownCircle className="w-5 h-5" />
                        إيداع
                    </button>
                    <button
                        onClick={openWithdrawModal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <ArrowUpCircle className="w-5 h-5" />
                        سحب
                    </button>
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        تحويل
                    </button>
                    <button
                        onClick={() => setShowCreateTreasuryModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        خزينة جديدة
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MainStatCard
                        title="إجمالي الرصيد"
                        value={formatCurrency(stats.totalBalance)}
                        icon={DollarSign}
                        iconBgColor="bg-blue-500"
                    />
                    <MainStatCard
                        title="خزائن الشركات"
                        value={formatCurrency(stats.totalCompanyBalance)}
                        icon={Building2}
                        iconBgColor="bg-green-500"
                    />
                    <MainStatCard
                        title="الخزينة العامة"
                        value={formatCurrency(stats.totalGeneralBalance)}
                        icon={Wallet}
                        iconBgColor="bg-yellow-500"
                    />
                    <MainStatCard
                        title="الحسابات المصرفية"
                        value={formatCurrency(stats.totalBankBalance)}
                        icon={CreditCard}
                        iconBgColor="bg-purple-500"
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-border-primary self-start w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview'
                        ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'
                        }`}
                >
                    نظرة عامة
                </button>
                <button
                    onClick={() => setActiveTab('transactions')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'transactions'
                        ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'
                        }`}
                >
                    الحركات
                </button>
                <button
                    onClick={() => setActiveTab('treasuries')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'treasuries'
                        ? 'bg-white dark:bg-surface-selected shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-text-tertiary hover:text-slate-700 dark:hover:text-text-secondary'
                        }`}
                >
                    الخزائن
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Company Treasuries */}
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary dark:border-border-primary p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            خزائن الشركات
                        </h3>
                        <div className="space-y-3">
                            {stats?.companyTreasuries?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-text-primary dark:text-white">{treasury.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-text-tertiary">{treasury.company?.name}</p>
                                    </div>
                                    <p className="font-bold text-blue-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.companyTreasuries || stats.companyTreasuries.length === 0) && (
                                <p className="text-slate-500 dark:text-text-tertiary text-center py-4">لا توجد خزائن شركات</p>
                            )}
                        </div>
                    </div>

                    {/* General Treasuries */}
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary dark:border-border-primary p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-green-600" />
                            الخزائن العامة
                        </h3>
                        <div className="space-y-3">
                            {stats?.generalTreasuries?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-text-primary dark:text-white">{treasury.name}</p>
                                    </div>
                                    <p className="font-bold text-green-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.generalTreasuries || stats.generalTreasuries.length === 0) && (
                                <p className="text-slate-500 dark:text-text-tertiary text-center py-4">لا توجد خزائن عامة</p>
                            )}
                        </div>
                    </div>

                    {/* Bank Accounts */}
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary dark:border-border-primary p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white flex items-center gap-2 mb-4">
                            <Landmark className="w-5 h-5 text-purple-600" />
                            الحسابات المصرفية
                        </h3>
                        <div className="space-y-3">
                            {stats?.bankAccounts?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-text-primary dark:text-white">{treasury.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-text-tertiary">{treasury.bankName} - {treasury.accountNumber}</p>
                                    </div>
                                    <p className="font-bold text-purple-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.bankAccounts || stats.bankAccounts.length === 0) && (
                                <p className="text-slate-500 dark:text-text-tertiary text-center py-4">لا توجد حسابات مصرفية</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary dark:border-border-primary">
                    {/* Filters */}
                    <div className="p-4 border-b border-slate-200 dark:border-border-primary dark:border-border-primary">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <select
                                value={selectedTreasury || ''}
                                onChange={(e) => setSelectedTreasury(e.target.value ? Number(e.target.value) : null)}
                                className="px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                            >
                                <option value="">جميع الخزائن</option>
                                {treasuries?.map((t: Treasury) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <select
                                value={transactionTypeFilter}
                                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                            >
                                <option value="">جميع الأنواع</option>
                                <option value="DEPOSIT">إيداع</option>
                                <option value="WITHDRAWAL">سحب</option>
                                <option value="TRANSFER">تحويل</option>
                            </select>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                placeholder="من تاريخ"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                placeholder="إلى تاريخ"
                            />
                            <button
                                onClick={handlePrintTransactions}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                                title="طباعة الحركات"
                            >
                                <Printer className="w-5 h-5" />
                                <span>طباعة</span>
                            </button>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-surface-secondary dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">التاريخ</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">الخزينة</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">النوع</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">المصدر</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">المبلغ</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">الرصيد بعد</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-tertiary dark:text-gray-400">الوصف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {transactionsData?.transactions?.map((transaction: TreasuryTransaction) => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 dark:bg-surface-secondary dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-text-primary dark:text-white">
                                            {formatDate(transaction.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-text-primary dark:text-white">
                                            {transaction.treasury?.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'DEPOSIT'
                                                ? 'bg-green-100 text-green-800'
                                                : transaction.type === 'WITHDRAWAL'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {getTransactionTypeLabel(transaction.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-text-tertiary">
                                            {getTransactionSourceLabel(transaction.source)}
                                        </td>
                                        <td className={`px-4 py-3 text-sm font-medium ${transaction.type === 'DEPOSIT' || transaction.source === 'TRANSFER_IN'
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`}>
                                            {transaction.type === 'DEPOSIT' || transaction.source === 'TRANSFER_IN' ? '+' : '-'}
                                            {formatCurrency(Number(transaction.amount))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-text-primary dark:text-white">
                                            {formatCurrency(Number(transaction.balanceAfter))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-text-tertiary">
                                            {transaction.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactionsData?.pagination && transactionsData.pagination.pages > 1 && (
                        <div className="p-4 border-t border-slate-200 dark:border-border-primary dark:border-border-primary flex items-center justify-between">
                            <p className="text-sm text-slate-500 dark:text-text-tertiary">
                                صفحة {transactionsData.pagination.page} من {transactionsData.pagination.pages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border rounded-xl disabled:opacity-50"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(transactionsData.pagination.pages, p + 1))}
                                    disabled={page === transactionsData.pagination.pages}
                                    className="p-2 border rounded-xl disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'treasuries' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {treasuries?.map((treasury: Treasury) => (
                        <div key={treasury.id} className="bg-white dark:bg-surface-primary rounded-2xl shadow-sm border border-slate-200 dark:border-border-primary dark:border-border-primary p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <TreasuryTypeIcon type={treasury.type} />
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-text-primary dark:text-white">{treasury.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-text-tertiary">{getTreasuryTypeLabel(treasury.type)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTreasury(treasury.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {treasury.company && (
                                <p className="text-sm text-slate-500 dark:text-text-tertiary mt-2">الشركة: {treasury.company.name}</p>
                            )}
                            {treasury.bankName && (
                                <p className="text-sm text-slate-500 dark:text-text-tertiary mt-2">البنك: {treasury.bankName}</p>
                            )}
                            {treasury.accountNumber && (
                                <p className="text-sm text-slate-500 dark:text-text-tertiary">رقم الحساب: {treasury.accountNumber}</p>
                            )}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-border-primary dark:border-border-primary">
                                <p className="text-sm text-slate-500 dark:text-text-tertiary">الرصيد الحالي</p>
                                <p className={`text-2xl font-bold ${treasury.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatCurrency(treasury.balance)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Treasury Modal */}
            {showCreateTreasuryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-primary dark:border-border-primary">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white">إنشاء خزينة جديدة</h3>
                            <button onClick={() => setShowCreateTreasuryModal(false)} className="p-2 hover:bg-slate-100 dark:bg-surface-hover rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTreasury} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    اسم الخزينة *
                                </label>
                                <input
                                    type="text"
                                    value={treasuryForm.name}
                                    onChange={(e) => setTreasuryForm({ ...treasuryForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    نوع الخزينة *
                                </label>
                                <select
                                    value={treasuryForm.type}
                                    onChange={(e) => setTreasuryForm({ ...treasuryForm, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                >
                                    <option value="GENERAL">خزينة عامة</option>
                                    <option value="COMPANY">خزينة شركة</option>
                                    <option value="BANK">حساب مصرفي</option>
                                </select>
                            </div>
                            {treasuryForm.type === 'COMPANY' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        الشركة *
                                    </label>
                                    <select
                                        value={treasuryForm.companyId}
                                        onChange={(e) => setTreasuryForm({ ...treasuryForm, companyId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                        required
                                    >
                                        <option value="">اختر الشركة</option>
                                        {companies.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {treasuryForm.type === 'BANK' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            اسم البنك *
                                        </label>
                                        <input
                                            type="text"
                                            value={treasuryForm.bankName}
                                            onChange={(e) => setTreasuryForm({ ...treasuryForm, bankName: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            رقم الحساب
                                        </label>
                                        <input
                                            type="text"
                                            value={treasuryForm.accountNumber}
                                            onChange={(e) => setTreasuryForm({ ...treasuryForm, accountNumber: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الرصيد الافتتاحي
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={treasuryForm.openingBalance}
                                    onChange={(e) => setTreasuryForm({ ...treasuryForm, openingBalance: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTreasuryModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-border-primary text-gray-700 dark:text-text-secondary rounded-xl hover:bg-gray-50 dark:hover:bg-surface-hover outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingTreasury}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isCreatingTreasury ? 'جاري الإنشاء...' : 'إنشاء'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {showTransactionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-primary dark:border-border-primary">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white">
                                {transactionType === 'DEPOSIT' ? 'إيداع مبلغ' : 'سحب مبلغ'}
                            </h3>
                            <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-slate-100 dark:bg-surface-hover rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الخزينة *
                                </label>
                                <select
                                    value={transactionForm.treasuryId}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, treasuryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                >
                                    <option value="">اختر الخزينة</option>
                                    {treasuries?.filter((t: Treasury) => t.isActive).map((t: Treasury) => (
                                        <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    المبلغ *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={transactionForm.amount}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الوصف
                                </label>
                                <textarea
                                    value={transactionForm.description}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransactionModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-border-primary text-gray-700 dark:text-text-secondary rounded-xl hover:bg-gray-50 dark:hover:bg-surface-hover outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingTransaction}
                                    className={`flex-1 px-4 py-2 text-white rounded-xl disabled:opacity-50 ${transactionType === 'DEPOSIT'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {isCreatingTransaction ? 'جاري التنفيذ...' : transactionType === 'DEPOSIT' ? 'إيداع' : 'سحب'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-primary dark:border-border-primary">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-text-primary dark:text-white">تحويل بين الخزائن</h3>
                            <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-100 dark:bg-surface-hover rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleTransfer} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    من الخزينة *
                                </label>
                                <select
                                    value={transferForm.fromTreasuryId}
                                    onChange={(e) => setTransferForm({ ...transferForm, fromTreasuryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                >
                                    <option value="">اختر الخزينة</option>
                                    {treasuries?.filter((t: Treasury) => t.isActive).map((t: Treasury) => (
                                        <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    إلى الخزينة *
                                </label>
                                <select
                                    value={transferForm.toTreasuryId}
                                    onChange={(e) => setTransferForm({ ...transferForm, toTreasuryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                >
                                    <option value="">اختر الخزينة</option>
                                    {treasuries?.filter((t: Treasury) => t.isActive && t.id.toString() !== transferForm.fromTreasuryId).map((t: Treasury) => (
                                        <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.balance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    المبلغ *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={transferForm.amount}
                                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الوصف
                                </label>
                                <textarea
                                    value={transferForm.description}
                                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-border-primary rounded-xl bg-white dark:bg-surface-secondary text-slate-800 dark:text-text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-border-primary text-gray-700 dark:text-text-secondary rounded-xl hover:bg-gray-50 dark:hover:bg-surface-hover outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isTransferring}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isTransferring ? 'جاري التحويل...' : 'تحويل'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
