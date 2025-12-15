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
    PiggyBank,
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
            return <Wallet className="w-5 h-5 text-gray-600" />;
    }
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-blue-600" />
                        حركات الخزينة
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        إدارة الخزائن والحسابات المصرفية وحركات الأموال
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={openDepositModal}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <ArrowDownCircle className="w-5 h-5" />
                        إيداع
                    </button>
                    <button
                        onClick={openWithdrawModal}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <ArrowUpCircle className="w-5 h-5" />
                        سحب
                    </button>
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        تحويل
                    </button>
                    <button
                        onClick={() => setShowCreateTreasuryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        خزينة جديدة
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">إجمالي الرصيد</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalBalance)}</p>
                            </div>
                            <DollarSign className="w-12 h-12 text-blue-200 opacity-80" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">خزائن الشركات</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCompanyBalance)}</p>
                            </div>
                            <Building2 className="w-12 h-12 text-green-200 opacity-80" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-yellow-100 text-sm">الخزينة العامة</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalGeneralBalance)}</p>
                            </div>
                            <PiggyBank className="w-12 h-12 text-yellow-200 opacity-80" />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">الحسابات المصرفية</p>
                                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalBankBalance)}</p>
                            </div>
                            <CreditCard className="w-12 h-12 text-purple-200 opacity-80" />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'overview'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        نظرة عامة
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'transactions'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        الحركات
                    </button>
                    <button
                        onClick={() => setActiveTab('treasuries')}
                        className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'treasuries'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        الخزائن
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Company Treasuries */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            خزائن الشركات
                        </h3>
                        <div className="space-y-3">
                            {stats?.companyTreasuries?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{treasury.name}</p>
                                        <p className="text-sm text-gray-500">{treasury.company?.name}</p>
                                    </div>
                                    <p className="font-bold text-blue-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.companyTreasuries || stats.companyTreasuries.length === 0) && (
                                <p className="text-gray-500 text-center py-4">لا توجد خزائن شركات</p>
                            )}
                        </div>
                    </div>

                    {/* General Treasuries */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-green-600" />
                            الخزائن العامة
                        </h3>
                        <div className="space-y-3">
                            {stats?.generalTreasuries?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{treasury.name}</p>
                                    </div>
                                    <p className="font-bold text-green-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.generalTreasuries || stats.generalTreasuries.length === 0) && (
                                <p className="text-gray-500 text-center py-4">لا توجد خزائن عامة</p>
                            )}
                        </div>
                    </div>

                    {/* Bank Accounts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Landmark className="w-5 h-5 text-purple-600" />
                            الحسابات المصرفية
                        </h3>
                        <div className="space-y-3">
                            {stats?.bankAccounts?.map((treasury: Treasury) => (
                                <div key={treasury.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{treasury.name}</p>
                                        <p className="text-sm text-gray-500">{treasury.bankName} - {treasury.accountNumber}</p>
                                    </div>
                                    <p className="font-bold text-purple-600">{formatCurrency(treasury.balance)}</p>
                                </div>
                            ))}
                            {(!stats?.bankAccounts || stats.bankAccounts.length === 0) && (
                                <p className="text-gray-500 text-center py-4">لا توجد حسابات مصرفية</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    {/* Filters */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <select
                                value={selectedTreasury || ''}
                                onChange={(e) => setSelectedTreasury(e.target.value ? Number(e.target.value) : null)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">جميع الخزائن</option>
                                {treasuries?.map((t: Treasury) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <select
                                value={transactionTypeFilter}
                                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="من تاريخ"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="إلى تاريخ"
                            />
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الخزينة</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">النوع</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المصدر</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الرصيد بعد</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الوصف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {transactionsData?.transactions?.map((transaction: TreasuryTransaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {formatDate(transaction.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {transaction.treasury?.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                transaction.type === 'DEPOSIT'
                                                    ? 'bg-green-100 text-green-800'
                                                    : transaction.type === 'WITHDRAWAL'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-purple-100 text-purple-800'
                                            }`}>
                                                {getTransactionTypeLabel(transaction.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {getTransactionSourceLabel(transaction.source)}
                                        </td>
                                        <td className={`px-4 py-3 text-sm font-medium ${
                                            transaction.type === 'DEPOSIT' || transaction.source === 'TRANSFER_IN'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}>
                                            {transaction.type === 'DEPOSIT' || transaction.source === 'TRANSFER_IN' ? '+' : '-'}
                                            {formatCurrency(Number(transaction.amount))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(Number(transaction.balanceAfter))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {transaction.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactionsData?.pagination && transactionsData.pagination.pages > 1 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                صفحة {transactionsData.pagination.page} من {transactionsData.pagination.pages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border rounded-lg disabled:opacity-50"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(transactionsData.pagination.pages, p + 1))}
                                    disabled={page === transactionsData.pagination.pages}
                                    className="p-2 border rounded-lg disabled:opacity-50"
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
                        <div key={treasury.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <TreasuryTypeIcon type={treasury.type} />
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{treasury.name}</h3>
                                        <p className="text-sm text-gray-500">{getTreasuryTypeLabel(treasury.type)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTreasury(treasury.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {treasury.company && (
                                <p className="text-sm text-gray-500 mt-2">الشركة: {treasury.company.name}</p>
                            )}
                            {treasury.bankName && (
                                <p className="text-sm text-gray-500 mt-2">البنك: {treasury.bankName}</p>
                            )}
                            {treasury.accountNumber && (
                                <p className="text-sm text-gray-500">رقم الحساب: {treasury.accountNumber}</p>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500">الرصيد الحالي</p>
                                <p className={`text-2xl font-bold ${
                                    treasury.balance >= 0 ? 'text-green-600' : 'text-red-600'
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">إنشاء خزينة جديدة</h3>
                            <button onClick={() => setShowCreateTreasuryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTreasuryModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingTreasury}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {transactionType === 'DEPOSIT' ? 'إيداع مبلغ' : 'سحب مبلغ'}
                            </h3>
                            <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransactionModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingTransaction}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                                        transactionType === 'DEPOSIT'
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">تحويل بين الخزائن</h3>
                            <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isTransferring}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
