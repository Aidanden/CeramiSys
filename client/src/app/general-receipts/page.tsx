'use client';

import React, { useState } from 'react';
import {
    useGetFinancialContactsQuery,
    useGetGeneralReceiptsQuery,
    useCreateFinancialContactMutation,
    useCreateGeneralReceiptMutation,
    useGetContactStatementQuery,
} from '@/state/generalReceiptApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import {
    Plus,
    Search,
    UserPlus,
    RefreshCw,
    Wallet,
    Phone,
    FileText,
    Calendar,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Building2,
    ArrowRightLeft
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
    });
};

export default function GeneralReceiptsPage() {
    const [activeTab, setActiveTab] = useState<'receipts' | 'contacts'>('receipts');
    const [showContactModal, setShowContactModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptType, setReceiptType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
    const [showStatementModal, setShowStatementModal] = useState(false);

    // Queries & Mutations
    const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useGetFinancialContactsQuery();
    const { data: receipts, isLoading: receiptsLoading, refetch: refetchReceipts } = useGetGeneralReceiptsQuery({});
    const { data: treasuries } = useGetTreasuriesQuery({});
    const { data: statement } = useGetContactStatementQuery(selectedContactId || 0, { skip: !selectedContactId });

    const [createContact, { isLoading: isCreatingContact }] = useCreateFinancialContactMutation();
    const [createReceipt, { isLoading: isCreatingReceipt }] = useCreateGeneralReceiptMutation();

    // Form States
    const [contactForm, setContactForm] = useState({ name: '', phone: '', note: '' });
    const [receiptForm, setReceiptForm] = useState({
        contactId: '',
        treasuryId: '',
        amount: '',
        description: '',
        notes: ''
    });

    // Handlers
    const handleCreateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createContact(contactForm).unwrap();
            setShowContactModal(false);
            setContactForm({ name: '', phone: '', note: '' });
        } catch (err) {
            alert('فشل في إضافة جهة الاتصال');
        }
    };

    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createReceipt({
                ...receiptForm,
                contactId: Number(receiptForm.contactId),
                treasuryId: Number(receiptForm.treasuryId),
                amount: Number(receiptForm.amount),
                type: receiptType
            }).unwrap();
            setShowReceiptModal(false);
            setReceiptForm({ contactId: '', treasuryId: '', amount: '', description: '', notes: '' });
        } catch (err) {
            alert('فشل في تنفيذ العملية');
        }
    };

    const openStatement = (id: number) => {
        setSelectedContactId(id);
        setShowStatementModal(true);
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-tajawal" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-indigo-600" />
                        إيصالات وقروض عامة
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة العمليات المالية الخارجية والتبادل بين التجار</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setReceiptType('DEPOSIT'); setShowReceiptModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm transition-all shadow-green-600/20"
                    >
                        <TrendingUp className="w-5 h-5" />
                        إيصال قبض (نقد وارد)
                    </button>
                    <button
                        onClick={() => { setReceiptType('WITHDRAWAL'); setShowReceiptModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm transition-all shadow-red-600/20"
                    >
                        <TrendingDown className="w-5 h-5" />
                        إيصال صرف (نقد صادر)
                    </button>
                    <button
                        onClick={() => setShowContactModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition-all shadow-indigo-600/20"
                    >
                        <UserPlus className="w-5 h-5" />
                        إضافة شخص
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
                <button
                    onClick={() => setActiveTab('receipts')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'receipts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    سجل الإيصالات
                </button>
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'contacts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    جهات الاتصال والشركاء
                </button>
            </div>

            {activeTab === 'receipts' ? (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-500" />
                                آخر العمليات المسجلة
                            </h2>
                            <button onClick={() => refetchReceipts()} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 font-semibold">التاريخ</th>
                                        <th className="p-4 font-semibold">الجهة</th>
                                        <th className="p-4 font-semibold">النوع</th>
                                        <th className="p-4 font-semibold">المبلغ</th>
                                        <th className="p-4 font-semibold">البيان / الوصف</th>
                                        <th className="p-4 font-semibold">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receipts?.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    {formatDate(r.paymentDate)}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-slate-800">{r.contact?.name}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit border ${r.type === 'DEPOSIT' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {r.type === 'DEPOSIT' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {r.type === 'DEPOSIT' ? 'قبض' : 'صرف'}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-black text-base ${r.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(Number(r.amount))}
                                            </td>
                                            <td className="p-4 text-sm text-slate-500">{r.description || '-'}</td>
                                            <td className="p-4">
                                                <button className="text-indigo-600 hover:text-indigo-800 underline text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">تفاصيل</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!receipts || receipts.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center text-slate-300">
                                                <div className="flex flex-col items-center gap-4">
                                                    <RefreshCw className="w-16 h-16 opacity-10 animate-spin-slow" />
                                                    <span className="font-bold text-lg italic">لا توجد عمليات مسجلة حالياً</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contacts?.map((c) => (
                        <div key={c.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-inner border border-white">
                                    {c.name.charAt(0)}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${Number(c.currentBalance) >= 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    {Number(c.currentBalance) >= 0 ? 'له رصيد' : 'عليه رصيد'}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">{c.name}</h3>
                            <p className="text-sm text-slate-400 flex items-center gap-2 mb-6">
                                <Phone className="w-4 h-4 text-slate-300" />
                                {c.phone || 'بدون رقم هاتف'}
                            </p>

                            <div className="bg-slate-50/50 rounded-2xl p-5 mb-8 border border-slate-100 shadow-inner">
                                <p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-wider">الرصيد التحليلي (صافي)</p>
                                <p className={`text-3xl font-black tabular-nums ${Number(c.currentBalance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(Math.abs(Number(c.currentBalance || 0)))}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => openStatement(c.id)}
                                    className="flex-1 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                                >
                                    <RefreshCw className="w-4 h-4 text-indigo-500" />
                                    كشف حساب
                                </button>
                                <button
                                    onClick={() => {
                                        setReceiptForm({ ...receiptForm, contactId: c.id.toString() });
                                        setReceiptType('DEPOSIT');
                                        setShowReceiptModal(true);
                                    }}
                                    className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                                >
                                    <Plus className="w-6 h-6 font-black" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setShowContactModal(true)}
                        className="group relative bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-5 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-lg transition-all duration-500 relative z-10">
                            <UserPlus className="w-8 h-8 group-hover:text-indigo-600 group-hover:scale-110 transition-all" />
                        </div>
                        <span className="font-black text-sm relative z-10 group-hover:text-indigo-600 transition-colors">إضافة شخص أو تاجر جديد</span>
                    </button>
                </div>
            )}

            {/* Modal: Add Contact (Premium Styled) */}
            {showContactModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                            <h2 className="text-2xl font-black text-indigo-900">إضافة شخص للنظام</h2>
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:shadow-md transition-all"
                            >
                                <RefreshCw className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateContact} className="p-10 space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الاسم بالكامل</label>
                                <input
                                    required
                                    type="text"
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-900 font-bold outline-none shadow-inner"
                                    placeholder="مثال: صالح محمد الهاشمي"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رقم الهاتف النشط</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-900 font-bold outline-none shadow-inner ltr"
                                        placeholder="091 xxx xxxx"
                                    />
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">نبذة أو ملاحظة</label>
                                <textarea
                                    value={contactForm.note}
                                    onChange={(e) => setContactForm({ ...contactForm, note: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-900 font-bold outline-none shadow-inner min-h-[120px]"
                                    placeholder="تاجر سيراميك - مورد مواد صحية..."
                                />
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button
                                    type="submit"
                                    disabled={isCreatingContact}
                                    className="flex-1 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreatingContact ? 'جاري الحفظ...' : 'حفظ وتسجيل'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Receipt (Premium Styled) */}
            {showReceiptModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className={`p-10 border-b border-slate-100 flex items-center justify-between ${receiptType === 'DEPOSIT' ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                            <div>
                                <h2 className={`text-2xl font-black ${receiptType === 'DEPOSIT' ? 'text-green-800' : 'text-red-800'}`}>
                                    {receiptType === 'DEPOSIT' ? 'تسجيل إيصال قبض' : 'تسجيل إيصال صرف'}
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${receiptType === 'DEPOSIT' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${receiptType === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                                        {receiptType === 'DEPOSIT' ? 'سيتم زيادة رصيد الخزينة العامة' : 'سيتم سحب مبلغ من الخزينة'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${receiptType === 'DEPOSIT' ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                            >
                                <RefreshCw className="w-8 h-8 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateReceipt} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 italic">التاجر المستهدف</label>
                                    <select
                                        required
                                        value={receiptForm.contactId}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, contactId: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold outline-none"
                                    >
                                        <option value="">اختر التاجر...</option>
                                        {contacts?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 italic">الخزينة المنفذة</label>
                                    <select
                                        required
                                        value={receiptForm.treasuryId}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, treasuryId: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold outline-none"
                                    >
                                        <option value="">اختر الخزينة...</option>
                                        {treasuries?.map(t => <option key={t.id} value={t.id}>{t.name} [{formatCurrency(Number(t.balance))}]</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 italic">المبلغ المالي</label>
                                <div className="relative group">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={receiptForm.amount}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                                        className="w-full pr-8 pl-20 py-8 bg-slate-50 border border-slate-100 rounded-[32px] focus:ring-[16px] focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-5xl font-black text-slate-900 outline-none shadow-inner tabular-nums text-center"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">LYD</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 italic">وصف الحركة (للمحاسب)</label>
                                    <input
                                        type="text"
                                        value={receiptForm.description}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold outline-none"
                                        placeholder="مثال: تسديد دفعة من القرض الشخصي"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="submit"
                                    disabled={isCreatingReceipt}
                                    className={`flex-1 py-6 ${receiptType === 'DEPOSIT' ? 'bg-green-600 shadow-green-600/40' : 'bg-red-600 shadow-red-600/40'} text-white rounded-[32px] font-black text-lg shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50`}
                                >
                                    {isCreatingReceipt ? 'جاري المعالجة...' : 'تأكيد ودفع العملية'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Contact Statement (Already premium structured but fixing icons) */}
            {showStatementModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-600/30">
                                    {contacts?.find(c => c.id === selectedContactId)?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">كشف حساب مالي تحليلي</h2>
                                    <p className="text-indigo-600 font-black text-xl mt-1 underline decoration-indigo-200 underline-offset-8">
                                        {contacts?.find(c => c.id === selectedContactId)?.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowStatementModal(false)}
                                className="w-16 h-16 rounded-[24px] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center border border-slate-100"
                            >
                                <RefreshCw className="w-8 h-8 rotate-45" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm transition-transform hover:scale-105">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">حساب المقبوضات (له)</p>
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-6 h-6 text-green-500" />
                                        <p className="text-3xl font-black text-slate-800 tabular-nums">
                                            {formatCurrency(statement?.filter(s => s.transactionType === 'DEPOSIT').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm transition-transform hover:scale-105">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">حساب المدفوعات (عليه)</p>
                                    <div className="flex items-center gap-3">
                                        <TrendingDown className="w-6 h-6 text-red-500" />
                                        <p className="text-3xl font-black text-slate-800 tabular-nums">
                                            {formatCurrency(statement?.filter(s => s.transactionType === 'WITHDRAWAL').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`rounded-[32px] p-8 border shadow-lg shadow-indigo-500/5 transition-transform hover:scale-105 ${Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance) >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">الرصيد النهائي المتاح</p>
                                    <p className="text-4xl font-black tracking-tighter tabular-nums">
                                        {formatCurrency(Math.abs(Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance || 0)))}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden min-w-full">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                            <th className="p-6">التوقيت والموعد</th>
                                            <th className="p-6">التفاصيل والبيانات</th>
                                            <th className="p-6 text-green-600">القيمة الواردة (+)</th>
                                            <th className="p-6 text-red-600">القيمة المنصرفة (-)</th>
                                            <th className="p-6">توازن الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {statement?.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="p-6 text-xs font-black text-slate-400 group-hover:text-indigo-600">{formatDate(s.transactionDate)}</td>
                                                <td className="p-6 text-slate-700 font-bold">{s.description}</td>
                                                <td className="p-6 text-green-600 font-black text-lg py-8">{s.transactionType === 'DEPOSIT' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                                <td className="p-6 text-red-600 font-black text-lg py-8">{s.transactionType === 'WITHDRAWAL' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                                <td className="p-6">
                                                    <span className={`px-5 py-2.5 rounded-2xl font-black text-xs border ${Number(s.balance) >= 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                        {formatCurrency(Math.abs(Number(s.balance)))}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
