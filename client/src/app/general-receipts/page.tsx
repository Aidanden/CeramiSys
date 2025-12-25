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
    X,
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

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 space-y-6 bg-background-secondary min-h-screen font-tajawal text-text-primary" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-primary-600" />
                        إيصالات خارجية
                    </h1>
                    <p className="text-text-secondary mt-1">إدارة العمليات المالية الخارجية والتبادل المالي</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setReceiptType('DEPOSIT'); setShowReceiptModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-success-600 text-white rounded-xl hover:bg-success-700 shadow-sm transition-all shadow-success-600/20"
                    >
                        <TrendingUp className="w-5 h-5" />
                        إيصال قبض (نقد وارد)
                    </button>
                    <button
                        onClick={() => { setReceiptType('WITHDRAWAL'); setShowReceiptModal(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-error-600 text-white rounded-xl hover:bg-error-700 shadow-sm transition-all shadow-error-600/20"
                    >
                        <TrendingDown className="w-5 h-5" />
                        إيصال صرف (نقد صادر)
                    </button>
                    <button
                        onClick={() => setShowContactModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-sm transition-all shadow-primary-600/20"
                    >
                        <UserPlus className="w-5 h-5" />
                        إضافة شخص
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-primary p-1 rounded-2xl shadow-sm border border-border-primary w-fit">
                <button
                    onClick={() => setActiveTab('receipts')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'receipts' ? 'bg-primary-600 text-white shadow-md' : 'text-text-secondary hover:bg-background-secondary'}`}
                >
                    سجل الإيصالات
                </button>
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'contacts' ? 'bg-primary-600 text-white shadow-md' : 'text-text-secondary hover:bg-background-secondary'}`}
                >
                    جهات الاتصال والشركاء
                </button>
            </div>

            {activeTab === 'receipts' ? (
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-surface-primary rounded-3xl shadow-sm border border-border-primary overflow-hidden">
                        <div className="p-6 border-b border-border-primary flex items-center justify-between">
                            <h2 className="font-bold text-text-primary flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-500" />
                                آخر العمليات المسجلة
                            </h2>
                            <button onClick={() => refetchReceipts()} className="p-2 text-text-muted hover:text-primary-600 transition-colors">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-background-secondary text-text-tertiary text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 font-semibold">التاريخ</th>
                                        <th className="p-4 font-semibold">الجهة</th>
                                        <th className="p-4 font-semibold text-success-600">له (قبض +)</th>
                                        <th className="p-4 font-semibold text-error-600">عليه (صرف -)</th>
                                        <th className="p-4 font-semibold">البيان / الوصف</th>
                                        <th className="p-4 font-semibold">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-primary">
                                    {receipts?.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 text-sm text-text-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-text-muted" />
                                                    {formatDate(r.paymentDate)}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-text-primary">{r.contact?.name}</td>
                                            <td className="p-4 font-black text-base text-success-600">
                                                {r.type === 'DEPOSIT' ? formatCurrency(Number(r.amount)) : '-'}
                                            </td>
                                            <td className="p-4 font-black text-base text-error-600">
                                                {r.type === 'WITHDRAWAL' ? formatCurrency(Number(r.amount)) : '-'}
                                            </td>
                                            <td className="p-4 text-sm text-text-tertiary">{r.description || '-'}</td>
                                            <td className="p-4">
                                                <button className="text-primary-600 hover:text-primary-800 underline text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">تفاصيل</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!receipts || receipts.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center text-text-disabled">
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
                        <div key={c.id} className="bg-surface-primary rounded-3xl shadow-sm border border-border-primary p-6 hover:shadow-xl transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl flex items-center justify-center text-primary-600 font-bold text-2xl shadow-inner border border-surface-primary">
                                    {c.name.charAt(0)}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${Number(c.currentBalance) >= 0 ? 'bg-success-50 text-success-700 border-success-100' : 'bg-error-50 text-error-700 border-error-100'}`}>
                                    {Number(c.currentBalance) >= 0 ? 'له رصيد' : 'عليه رصيد'}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-text-primary mb-1">{c.name}</h3>
                            <p className="text-sm text-text-muted flex items-center gap-2 mb-6">
                                <Phone className="w-4 h-4 text-text-disabled" />
                                {c.phone || 'بدون رقم هاتف'}
                            </p>

                            <div className="bg-background-secondary rounded-2xl p-5 mb-8 border border-border-primary shadow-inner space-y-4">
                                <div>
                                    <p className="text-[10px] text-text-tertiary font-black mb-1 uppercase tracking-wider">إجمالي ما له (دائن)</p>
                                    <p className="text-lg font-bold text-success-600 tabular-nums">
                                        {formatCurrency(Number(c.totalDeposit || 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-text-tertiary font-black mb-1 uppercase tracking-wider">إجمالي ما عليه (مدين)</p>
                                    <p className="text-lg font-bold text-error-600 tabular-nums">
                                        {formatCurrency(Number(c.totalWithdrawal || 0))}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-border-primary">
                                    <p className="text-[10px] text-text-tertiary font-black mb-1 uppercase tracking-wider">الرصيد التحليلي (صافي)</p>
                                    <p className={`text-3xl font-black tabular-nums ${Number(c.currentBalance) >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                                        {formatCurrency(Math.abs(Number(c.currentBalance || 0)))}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => openStatement(c.id)}
                                    className="flex-1 py-3.5 bg-surface-primary border border-border-primary rounded-2xl text-xs font-black text-text-secondary hover:bg-background-secondary flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                                >
                                    <RefreshCw className="w-4 h-4 text-primary-500" />
                                    كشف حساب
                                </button>
                                <button
                                    onClick={() => {
                                        setReceiptForm({ ...receiptForm, contactId: c.id.toString() });
                                        setReceiptType('DEPOSIT');
                                        setShowReceiptModal(true);
                                    }}
                                    className="p-3.5 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                                >
                                    <Plus className="w-6 h-6 font-black" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setShowContactModal(true)}
                        className="group relative bg-surface-primary border-2 border-dashed border-border-primary rounded-3xl p-10 flex flex-col items-center justify-center gap-5 text-text-disabled hover:border-primary-400 hover:bg-primary-50/20 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-3xl bg-background-secondary flex items-center justify-center group-hover:bg-surface-primary group-hover:shadow-lg transition-all duration-500 relative z-10">
                            <UserPlus className="w-8 h-8 group-hover:text-primary-600 group-hover:scale-110 transition-all" />
                        </div>
                        <span className="font-black text-sm relative z-10 group-hover:text-primary-600 transition-colors">إضافة شخص أو تاجر جديد</span>
                    </button>
                </div>
            )}

            {/* Modal: Add Contact (Standard Project Styled) */}
            {showContactModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-white">
                            <h2 className="text-xl font-bold text-text-primary">إضافة جهة اتصال جديدة</h2>
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="p-2 text-text-muted hover:bg-background-secondary rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateContact} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary">الاسم بالكامل *</label>
                                <input
                                    required
                                    type="text"
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-text-primary font-medium outline-none"
                                    placeholder="أدخل الاسم بالكامل"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary">رقم الهاتف</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-text-primary font-medium outline-none ltr text-left"
                                        placeholder="09x-xxxxxxx"
                                    />
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary">ملاحظات</label>
                                <textarea
                                    value={contactForm.note}
                                    onChange={(e) => setContactForm({ ...contactForm, note: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-text-primary font-medium outline-none min-h-[100px]"
                                    placeholder="أي ملاحظات إضافية..."
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowContactModal(false)}
                                    className="flex-1 py-2.5 border border-border-primary text-text-secondary rounded-xl font-bold hover:bg-background-secondary transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingContact}
                                    className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50"
                                >
                                    {isCreatingContact ? 'جاري الحفظ...' : 'حفظ البيانات'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Receipt (Standard Project Styled) */}
            {showReceiptModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-white text-text-primary">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {receiptType === 'DEPOSIT' ? <TrendingUp className="w-6 h-6 text-success-600" /> : <TrendingDown className="w-6 h-6 text-error-600" />}
                                {receiptType === 'DEPOSIT' ? 'تسجيل إيصال قبض' : 'تسجيل إيصال صرف'}
                            </h2>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="p-2 text-text-muted hover:bg-background-secondary rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateReceipt} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-text-secondary italic">جهة الاتصال / التاجر</label>
                                    <select
                                        required
                                        value={receiptForm.contactId}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, contactId: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium outline-none text-text-primary"
                                    >
                                        <option value="">اختر الاسم...</option>
                                        {contacts?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-text-secondary italic">الخزينة</label>
                                    <select
                                        required
                                        value={receiptForm.treasuryId}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, treasuryId: e.target.value })}
                                        className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium outline-none text-text-primary"
                                    >
                                        <option value="">اختر الخزينة...</option>
                                        {treasuries?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary italic">المبلغ المالي</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={receiptForm.amount}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-2xl font-bold text-text-primary outline-none ltr text-left"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-disabled pointer-events-none">LYD</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary italic">الوصف / البيان</label>
                                <textarea
                                    required
                                    value={receiptForm.description}
                                    onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-border-primary rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium outline-none text-text-primary min-h-[80px]"
                                    placeholder="اكتب وصفاً مختصراً للعملية"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReceiptModal(false)}
                                    className="flex-1 py-3 border border-border-primary text-text-secondary rounded-xl font-bold hover:bg-background-secondary transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingReceipt}
                                    className={`flex-1 py-3 ${receiptType === 'DEPOSIT' ? 'bg-success-600 hover:bg-success-700 shadow-success-600/20' : 'bg-error-600 hover:bg-error-700 shadow-error-600/20'} text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50`}
                                >
                                    {isCreatingReceipt ? 'جاري التنفيذ...' : 'تسجيل العملية'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Contact Statement (Standard Project Styled) */}
            {showStatementModal && (
                <div id="printable-modal-root" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-border-primary flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-600/20">
                                    {contacts?.find(c => c.id === selectedContactId)?.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-text-primary">كشف حساب مالي</h2>
                                    <p className="text-primary-600 font-bold text-sm">
                                        {contacts?.find(c => c.id === selectedContactId)?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-bold text-sm"
                                >
                                    <FileText className="w-4 h-4" />
                                    طباعة الكشف
                                </button>
                                <button
                                    onClick={() => setShowStatementModal(false)}
                                    className="p-2 text-text-muted hover:bg-background-secondary rounded-lg transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Print Only Styles (Refined to prevent blank pages) */}
                        <style jsx global>{`
                            @media print {
                                /* 1. Default: Hide everything */
                                html, body {
                                    height: auto !important;
                                    overflow: visible !important;
                                    background: white !important;
                                }
                                body * {
                                    visibility: hidden !important;
                                }
                                
                                /* 2. Show only our target and its descendants */
                                #printable-modal-root, 
                                #printable-modal-root * {
                                    visibility: visible !important;
                                }
                                
                                /* 3. Force-position the target at the top of the print page */
                                #printable-modal-root {
                                    position: absolute !important;
                                    top: 0 !important;
                                    left: 0 !important;
                                    width: 100% !important;
                                    display: block !important;
                                    background: white !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    z-index: 999999 !important;
                                }

                                /* 4. Strip modal-specific constraints (scrollbars/shadows) */
                                #printable-modal-root > div {
                                    position: relative !important;
                                    max-height: none !important;
                                    height: auto !important;
                                    overflow: visible !important;
                                    width: 100% !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                    margin: 0 !important;
                                    transform: none !important;
                                }

                                #printable-statement {
                                    height: auto !important;
                                    overflow: visible !important;
                                    padding: 40px !important;
                                }

                                .no-print {
                                    display: none !important;
                                }

                                @page {
                                    margin: 2cm;
                                }
                            }
                        `}</style>

                        <div id="printable-statement" className="flex-1 overflow-y-auto p-8 bg-background-secondary/30 space-y-8 print:bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-xl p-6 border border-border-primary shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-xs text-text-tertiary font-bold mb-2">إجمالي المقبوضات (+)</p>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-success-500" />
                                        <p className="text-xl font-bold text-text-primary tabular-nums">
                                            {formatCurrency(statement?.filter(s => s.transactionType === 'DEPOSIT').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 border border-border-primary shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-xs text-text-tertiary font-bold mb-2">إجمالي المدفوعات (-)</p>
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="w-5 h-5 text-error-500" />
                                        <p className="text-xl font-bold text-text-primary tabular-nums">
                                            {formatCurrency(statement?.filter(s => s.transactionType === 'WITHDRAWAL').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-6 border shadow-lg transition-transform ${Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance) >= 0 ? 'bg-success-600 text-white' : 'bg-error-600 text-white'}`}>
                                    <p className="text-xs font-bold mb-2 opacity-80 text-white">الرصيد النهائي</p>
                                    <p className="text-2xl font-bold tabular-nums text-white">
                                        {formatCurrency(Math.abs(Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance || 0)))}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white border border-border-primary rounded-2xl shadow-sm overflow-hidden">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-background-secondary text-text-tertiary text-xs font-bold border-b border-border-primary">
                                            <th className="px-6 py-4">التوقيت</th>
                                            <th className="px-6 py-4">التفاصيل</th>
                                            <th className="px-6 py-4">الوارد (+)</th>
                                            <th className="px-6 py-4">المنصرف (-)</th>
                                            <th className="px-6 py-4">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-primary">
                                        {statement?.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-primary-50/30 transition-colors group">
                                                <td className="p-6 text-xs font-black text-text-muted group-hover:text-primary-600">{formatDate(s.transactionDate)}</td>
                                                <td className="p-6 text-text-primary font-bold">{s.description}</td>
                                                <td className="p-6 text-success-600 font-black text-lg py-8">{s.transactionType === 'DEPOSIT' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                                <td className="p-6 text-error-600 font-black text-lg py-8">{s.transactionType === 'WITHDRAWAL' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                                <td className="p-6">
                                                    <span className={`px-5 py-2.5 rounded-2xl font-black text-xs border ${Number(s.balance) >= 0 ? 'bg-success-50 text-success-700 border-success-100' : 'bg-error-50 text-error-700 border-error-100'}`}>
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
