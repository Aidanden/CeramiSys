'use client';

import React, { useState, useRef } from 'react';
import {
    useGetFinancialContactsQuery,
    useGetGeneralReceiptsQuery,
    useCreateFinancialContactMutation,
    useCreateGeneralReceiptMutation,
    useGetContactStatementQuery,
} from '@/state/generalReceiptApi';
import { useGetTreasuriesQuery } from '@/state/treasuryApi';
import { useGetCustomersQuery } from '@/state/salesApi';
import { useGetSuppliersQuery } from '@/state/purchaseApi';
import { useGetEmployeesQuery } from '@/state/payrollApi';
import { useGetCurrentUserQuery } from '@/state/authApi';
import { useGetCompaniesQuery } from '@/state/companyApi';
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
    ArrowRightLeft,
    Filter,
    Eye,
    Printer,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { GeneralReceiptPrint } from '@/components/general-receipts/GeneralReceiptPrint';
import { ReceiptsReport } from '@/components/general-receipts/ReceiptsReport';

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
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [receiptToPrint, setReceiptToPrint] = useState<any>(null);
    const [receiptsToPrint, setReceiptsToPrint] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);
    
    // Filters and Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        type: '',
        entityType: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        treasuryId: '',
        companyId: ''
    });
    const itemsPerPage = 10;

    // Queries & Mutations
    const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useGetFinancialContactsQuery();
    const { data: receipts, isLoading: receiptsLoading, refetch: refetchReceipts } = useGetGeneralReceiptsQuery({});
    const { data: treasuries } = useGetTreasuriesQuery({});
    const { data: statement } = useGetContactStatementQuery(selectedContactId || 0, { skip: !selectedContactId });

    const [createContact, { isLoading: isCreatingContact }] = useCreateFinancialContactMutation();
    const [createReceipt, { isLoading: isCreatingReceipt }] = useCreateGeneralReceiptMutation();

    // Get current user and companies
    const { data: userData } = useGetCurrentUserQuery();
    const user = userData?.data;
    const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });

    // Form States
    const [contactForm, setContactForm] = useState({ name: '', phone: '', note: '' });
    const [entityType, setEntityType] = useState<'contact' | 'customer' | 'supplier' | 'employee'>('contact');
    const [receiptForm, setReceiptForm] = useState({
        contactId: '',
        customerId: '',
        supplierId: '',
        employeeId: '',
        treasuryId: '',
        amount: '',
        description: '',
        notes: ''
    });

    // Search states
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
    const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState('');
    const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState('');
    const [showContactSuggestions, setShowContactSuggestions] = useState(false);
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
    const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
    const [selectedContactName, setSelectedContactName] = useState('');
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [selectedSupplierName, setSelectedSupplierName] = useState('');
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

    // Debouncing للبحث - تأخير 300ms قبل البحث
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCustomerSearch(customerSearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearchTerm]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSupplierSearch(supplierSearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [supplierSearchTerm]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEmployeeSearch(employeeSearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [employeeSearchTerm]);

    // Additional queries - البحث الديناميكي بدلاً من تحميل كل البيانات
    const { data: customersData, isLoading: customersLoading } = useGetCustomersQuery(
        { limit: 50, search: debouncedCustomerSearch || undefined },
        { skip: !(entityType === 'customer' && showCustomerSuggestions) }
    );
    const { data: suppliersData, isLoading: suppliersLoading } = useGetSuppliersQuery(
        { limit: 50, search: debouncedSupplierSearch || undefined },
        { skip: !(entityType === 'supplier' && showSupplierSuggestions) }
    );
    const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery(
        { isActive: true, search: debouncedEmployeeSearch || undefined },
        { skip: !(entityType === 'employee' && showEmployeeSuggestions) }
    );
    
    const customers = customersData?.data?.customers || [];
    const suppliers = suppliersData?.data?.suppliers || [];
    const employees = employeesData?.data || [];

    // Refs for click outside
    const contactSearchRef = React.useRef<HTMLDivElement>(null);
    const customerSearchRef = React.useRef<HTMLDivElement>(null);
    const supplierSearchRef = React.useRef<HTMLDivElement>(null);
    const employeeSearchRef = React.useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
                setShowContactSuggestions(false);
            }
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
                setShowCustomerSuggestions(false);
            }
            if (supplierSearchRef.current && !supplierSearchRef.current.contains(event.target as Node)) {
                setShowSupplierSuggestions(false);
            }
            if (employeeSearchRef.current && !employeeSearchRef.current.contains(event.target as Node)) {
                setShowEmployeeSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            const receiptData: any = {
                treasuryId: Number(receiptForm.treasuryId),
                amount: Number(receiptForm.amount),
                type: receiptType,
                description: receiptForm.description,
                notes: receiptForm.notes
            };

            // إضافة المعرف المناسب حسب نوع الجهة
            if (entityType === 'contact' && receiptForm.contactId) {
                receiptData.contactId = Number(receiptForm.contactId);
            } else if (entityType === 'customer' && receiptForm.customerId) {
                receiptData.customerId = Number(receiptForm.customerId);
            } else if (entityType === 'supplier' && receiptForm.supplierId) {
                receiptData.supplierId = Number(receiptForm.supplierId);
            } else if (entityType === 'employee' && receiptForm.employeeId) {
                receiptData.employeeId = Number(receiptForm.employeeId);
            }

            const createdReceipt = await createReceipt(receiptData).unwrap();
            setShowReceiptModal(false);
            setReceiptForm({ contactId: '', customerId: '', supplierId: '', employeeId: '', treasuryId: '', amount: '', description: '', notes: '' });
            setContactSearchTerm('');
            setCustomerSearchTerm('');
            setSupplierSearchTerm('');
            setEmployeeSearchTerm('');
            setSelectedContactName('');
            setSelectedCustomerName('');
            setSelectedSupplierName('');
            setSelectedEmployeeName('');
            
            // طباعة الإيصال تلقائياً بعد الإنشاء
            setTimeout(() => {
                if (createdReceipt) {
                    printReceiptToWindow(createdReceipt);
                }
            }, 500);
        } catch (err: any) {
            alert(err?.data?.error || 'فشل في تنفيذ العملية');
        }
    };

    const openStatement = (id: number) => {
        setSelectedContactId(id);
        setShowStatementModal(true);
    };

    const handlePrint = () => {
        window.print();
    };

    // Filtered and paginated receipts
    const filteredReceipts = React.useMemo(() => {
        if (!receipts) return [];
        
        return receipts.filter(r => {
            // Filter by type
            if (filters.type && r.type !== filters.type) return false;
            
            // Filter by entity type
            if (filters.entityType) {
                if (filters.entityType === 'contact' && !r.contactId) return false;
                if (filters.entityType === 'customer' && !r.customerId) return false;
                if (filters.entityType === 'supplier' && !r.supplierId) return false;
                if (filters.entityType === 'employee' && !r.employeeId) return false;
            }
            
            // Filter by date range
            if (filters.startDate && new Date(r.paymentDate) < new Date(filters.startDate)) return false;
            if (filters.endDate && new Date(r.paymentDate) > new Date(filters.endDate)) return false;
            
            // Filter by amount range
            if (filters.minAmount && Number(r.amount) < Number(filters.minAmount)) return false;
            if (filters.maxAmount && Number(r.amount) > Number(filters.maxAmount)) return false;
            
            // Filter by treasury
            if (filters.treasuryId && r.treasuryId !== Number(filters.treasuryId)) return false;
            
            // Filter by company
            if (filters.companyId && r.treasury?.companyId !== Number(filters.companyId)) return false;
            
            return true;
        });
    }, [receipts, filters]);

    const paginatedReceipts = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage]);

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

    const handleFilterReset = () => {
        setFilters({
            type: '',
            entityType: '',
            startDate: '',
            endDate: '',
            minAmount: '',
            maxAmount: '',
            treasuryId: ''
        });
        setCurrentPage(1);
    };

    const handleReceiptPreview = (receipt: any) => {
        setSelectedReceipt(receipt);
        setShowReceiptPreview(true);
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    // تحديد اسم الشركة/الشركات واسم المستخدم للطباعة
    const getCompanyInfo = () => {
        if (user?.isSystemUser && companiesData?.data?.companies) {
            // مدير النظام - عرض أسماء جميع الشركات
            const allCompanies = companiesData.data.companies.map((c: any) => c.name).join(' - ');
            return {
                name: allCompanies || 'نظام إدارة السيراميك',
                userName: user.fullName || user.username || 'المدير'
            };
        } else if (user?.company) {
            // مستخدم عادي - عرض شركته فقط
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

    const handleDirectPrint = (receipt: any) => {
        // طباعة الإيصال بنفس تصميم شاشة المحاسب
        printReceiptToWindow(receipt);
    };

    // طباعة إيصال واحد في نافذة جديدة
    const printReceiptToWindow = (receipt: any) => {
        setReceiptToPrint(receipt);
        setReceiptsToPrint([]);
        
        setTimeout(() => {
            if (printRef.current) {
                const printWindow = window.open('', '_blank', 'width=800,height=600');
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
                        <title>إيصال ${receipt.type === 'DEPOSIT' ? 'قبض' : 'صرف'} - ${receipt.receiptNumber || receipt.id}</title>
                    </head>
                    <body>
                        ${printRef.current.innerHTML}
                        <script>
                            window.onload = function() {
                                setTimeout(() => {
                                    window.print();
                                }, 300);
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
                
                // تنظيف
                setTimeout(() => {
                    setReceiptToPrint(null);
                }, 1000);
            }
        }, 200);
    };

    // طباعة جميع السجلات المفلترة
    const printAllFilteredReceipts = () => {
        if (filteredReceipts.length === 0) {
            alert('لا توجد سجلات للطباعة!');
            return;
        }

        setReceiptsToPrint(filteredReceipts);
        setReceiptToPrint(null);

        setTimeout(() => {
            if (printRef.current) {
                const printWindow = window.open('', '_blank', 'width=800,height=600');
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
                        <title>طباعة الإيصالات (${filteredReceipts.length} إيصال)</title>
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
                
                // تنظيف
                setTimeout(() => {
                    setReceiptsToPrint([]);
                }, 1000);
            }
        }, 300);
    };

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

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
                    {/* Filters Section */}
                    <div className="bg-surface-primary rounded-2xl shadow-sm border border-border-primary p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary flex items-center gap-2">
                                <Filter className="w-5 h-5 text-primary-500" />
                                تصفية الإيصالات
                            </h3>
                            <button
                                onClick={handleFilterReset}
                                className="text-sm text-text-muted hover:text-primary-600 underline"
                            >
                                إعادة تعيين
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">نوع الإيصال</label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                >
                                    <option value="">الكل</option>
                                    <option value="DEPOSIT">قبض (وارد +)</option>
                                    <option value="WITHDRAWAL">صرف (صادر -)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">نوع الجهة</label>
                                <select
                                    value={filters.entityType}
                                    onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                >
                                    <option value="">الكل</option>
                                    <option value="contact">جهة اتصال</option>
                                    <option value="customer">عميل</option>
                                    <option value="supplier">مورد</option>
                                    <option value="employee">موظف</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">الشركة</label>
                                <select
                                    value={filters.companyId}
                                    onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                >
                                    <option value="">الكل</option>
                                    {companiesData?.data?.companies?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">الخزينة</label>
                                <select
                                    value={filters.treasuryId}
                                    onChange={(e) => setFilters({ ...filters, treasuryId: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                >
                                    <option value="">الكل</option>
                                    {treasuries?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">من تاريخ</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">من مبلغ</label>
                                <input
                                    type="number"
                                    value={filters.minAmount}
                                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-text-secondary mb-1 block">إلى مبلغ</label>
                                <input
                                    type="number"
                                    value={filters.maxAmount}
                                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                    placeholder="999999"
                                    className="w-full px-3 py-2 bg-white dark:bg-surface-secondary border border-border-primary rounded-lg text-sm text-slate-800 dark:text-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-900/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
                            <span className="font-bold">النتائج: {filteredReceipts.length} إيصال</span>
                            {Object.values(filters).some(v => v) && (
                                <span className="text-primary-600 font-bold">• فلاتر نشطة</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface-primary rounded-3xl shadow-sm border border-border-primary overflow-hidden">
                        <div className="p-6 border-b border-border-primary flex items-center justify-between">
                            <h2 className="font-bold text-text-primary flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-500" />
                                سجل الإيصالات ({filteredReceipts.length})
                            </h2>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={printAllFilteredReceipts}
                                    disabled={filteredReceipts.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="طباعة جميع الإيصالات المعروضة"
                                >
                                    <Printer className="w-4 h-4" />
                                    طباعة الكل ({filteredReceipts.length})
                                </button>
                                <button onClick={() => refetchReceipts()} className="p-2 text-text-muted hover:text-primary-600 transition-colors">
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>
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
                                    {paginatedReceipts?.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-surface-hover transition-colors group">
                                            <td className="p-4 text-sm text-text-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-text-muted" />
                                                    {formatDate(r.paymentDate)}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-text-primary">
                                                <div className="flex flex-col">
                                                    <span>{r.contact?.name || r.customer?.name || r.supplier?.name || r.employee?.name}</span>
                                                    <span className="text-xs text-text-muted font-normal">
                                                        {r.contact && '(جهة اتصال)'}
                                                        {r.customer && '(عميل)'}
                                                        {r.supplier && '(مورد)'}
                                                        {r.employee && '(موظف)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-black text-base text-success-600">
                                                {r.type === 'DEPOSIT' ? formatCurrency(Number(r.amount)) : '-'}
                                            </td>
                                            <td className="p-4 font-black text-base text-error-600">
                                                {r.type === 'WITHDRAWAL' ? formatCurrency(Number(r.amount)) : '-'}
                                            </td>
                                            <td className="p-4 text-sm text-text-tertiary">{r.description || '-'}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleReceiptPreview(r)}
                                                        className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors group/btn"
                                                        title="معاينة الإيصال"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDirectPrint(r)}
                                                        className="p-2 text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-hover rounded-lg transition-colors group/btn"
                                                        title="طباعة الإيصال مباشرة"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center text-text-disabled">
                                                <div className="flex flex-col items-center gap-4">
                                                    <FileText className="w-16 h-16 opacity-10" />
                                                    <span className="font-bold text-lg italic">
                                                        {filteredReceipts.length === 0 ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد عمليات مسجلة'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-border-primary flex items-center justify-between">
                                <div className="text-sm text-text-secondary">
                                    عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredReceipts.length)} من {filteredReceipts.length}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-border-primary hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-primary-600 text-white'
                                                        : 'text-text-secondary hover:bg-background-secondary'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-border-primary hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
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
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-white dark:bg-surface-primary">
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
                                    className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all text-slate-800 dark:text-text-primary font-medium outline-none"
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
                                        className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all text-slate-800 dark:text-text-primary font-medium outline-none ltr text-left"
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
                                    className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all text-slate-800 dark:text-text-primary font-medium outline-none min-h-[100px]"
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
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-white dark:bg-surface-primary text-text-primary">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {receiptType === 'DEPOSIT' ? <TrendingUp className="w-6 h-6 text-success-600 dark:text-success-400" /> : <TrendingDown className="w-6 h-6 text-error-600 dark:text-error-400" />}
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
                            {/* نوع الجهة */}
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-text-secondary italic">نوع الجهة</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntityType('contact');
                                            setReceiptForm({ ...receiptForm, contactId: '', customerId: '', supplierId: '', employeeId: '' });
                                            setContactSearchTerm('');
                                            setCustomerSearchTerm('');
                                            setSupplierSearchTerm('');
                                            setEmployeeSearchTerm('');
                                            setSelectedContactName('');
                                            setSelectedCustomerName('');
                                            setSelectedSupplierName('');
                                            setSelectedEmployeeName('');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                            entityType === 'contact' 
                                                ? 'bg-primary-600 text-white' 
                                                : 'bg-background-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-primary hover:bg-primary-100 dark:hover:bg-primary-900/20'
                                        }`}
                                    >
                                        جهة اتصال
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntityType('customer');
                                            setReceiptForm({ ...receiptForm, contactId: '', customerId: '', supplierId: '', employeeId: '' });
                                            setContactSearchTerm('');
                                            setCustomerSearchTerm('');
                                            setSupplierSearchTerm('');
                                            setEmployeeSearchTerm('');
                                            setSelectedContactName('');
                                            setSelectedCustomerName('');
                                            setSelectedSupplierName('');
                                            setSelectedEmployeeName('');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                            entityType === 'customer' 
                                                ? 'bg-success-600 text-white' 
                                                : 'bg-background-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-primary hover:bg-success-100 dark:hover:bg-success-900/20'
                                        }`}
                                    >
                                        عميل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntityType('supplier');
                                            setReceiptForm({ ...receiptForm, contactId: '', customerId: '', supplierId: '', employeeId: '' });
                                            setContactSearchTerm('');
                                            setCustomerSearchTerm('');
                                            setSupplierSearchTerm('');
                                            setEmployeeSearchTerm('');
                                            setSelectedContactName('');
                                            setSelectedCustomerName('');
                                            setSelectedSupplierName('');
                                            setSelectedEmployeeName('');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                            entityType === 'supplier' 
                                                ? 'bg-warning-600 text-white' 
                                                : 'bg-background-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-primary hover:bg-warning-100 dark:hover:bg-warning-900/20'
                                        }`}
                                    >
                                        مورد
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEntityType('employee');
                                            setReceiptForm({ ...receiptForm, contactId: '', customerId: '', supplierId: '', employeeId: '' });
                                            setContactSearchTerm('');
                                            setCustomerSearchTerm('');
                                            setSupplierSearchTerm('');
                                            setEmployeeSearchTerm('');
                                            setSelectedContactName('');
                                            setSelectedCustomerName('');
                                            setSelectedSupplierName('');
                                            setSelectedEmployeeName('');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-bold transition-all ${
                                            entityType === 'employee' 
                                                ? 'bg-purple-600 text-white' 
                                                : 'bg-background-secondary dark:bg-surface-secondary text-text-secondary dark:text-text-primary hover:bg-purple-100 dark:hover:bg-purple-900/20'
                                        }`}
                                    >
                                        موظف
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-text-secondary italic">
                                        {entityType === 'contact' && 'جهة الاتصال'}
                                        {entityType === 'customer' && 'العميل'}
                                        {entityType === 'supplier' && 'المورد'}
                                        {entityType === 'employee' && 'الموظف'}
                                    </label>
                                    
                                    {/* جهة الاتصال - بحث */}
                                    {entityType === 'contact' && (
                                        <div className="relative" ref={contactSearchRef}>
                                            <input
                                                type="text"
                                                value={selectedContactName || contactSearchTerm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setContactSearchTerm(value);
                                                    setSelectedContactName('');
                                                    setReceiptForm({ ...receiptForm, contactId: '' });
                                                    setShowContactSuggestions(true);
                                                }}
                                                onFocus={() => setShowContactSuggestions(true)}
                                                placeholder="ابحث عن جهة الاتصال بالاسم أو الهاتف..."
                                                className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary"
                                                required={!receiptForm.contactId}
                                            />
                                            {contactsLoading && (
                                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                                </div>
                                            )}
                                            {showContactSuggestions && !contactsLoading && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-elevated border border-gray-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {contacts
                                                        ?.filter((c: any) =>
                                                            c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                                                            c.phone?.includes(contactSearchTerm)
                                                        )
                                                        ?.map((c: any) => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setReceiptForm({ ...receiptForm, contactId: String(c.id) });
                                                                    setSelectedContactName(c.name);
                                                                    setContactSearchTerm('');
                                                                    setShowContactSuggestions(false);
                                                                }}
                                                                className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-gray-100 dark:border-border-primary last:border-b-0 transition-colors"
                                                            >
                                                                <div className="font-medium text-gray-900 dark:text-text-primary">{c.name}</div>
                                                                {c.phone && <div className="text-xs text-gray-500 dark:text-text-tertiary">📱 {c.phone}</div>}
                                                            </div>
                                                        ))}
                                                    {contacts?.filter((c: any) =>
                                                        c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                                                        c.phone?.includes(contactSearchTerm)
                                                    )?.length === 0 && (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm">لا توجد نتائج</div>
                                                    )}
                                                </div>
                                            )}
                                            {receiptForm.contactId && selectedContactName && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                                                    ✓ تم اختيار: {selectedContactName}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* العميل - بحث */}
                                    {entityType === 'customer' && (
                                        <div className="relative" ref={customerSearchRef}>
                                            <input
                                                type="text"
                                                value={selectedCustomerName || customerSearchTerm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setCustomerSearchTerm(value);
                                                    setSelectedCustomerName('');
                                                    setReceiptForm({ ...receiptForm, customerId: '' });
                                                    setShowCustomerSuggestions(true);
                                                }}
                                                onFocus={() => setShowCustomerSuggestions(true)}
                                                placeholder="ابحث عن العميل بالاسم أو الهاتف..."
                                                className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/50 focus:border-success-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary"
                                                required={!receiptForm.customerId}
                                            />
                                            {customersLoading && (
                                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success-600"></div>
                                                </div>
                                            )}
                                            {showCustomerSuggestions && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-elevated border border-gray-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {customersLoading ? (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm text-center">
                                                            جاري البحث...
                                                        </div>
                                                    ) : customers.length > 0 ? (
                                                        customers.map((c: any) => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setReceiptForm({ ...receiptForm, customerId: String(c.id) });
                                                                    setSelectedCustomerName(c.name);
                                                                    setCustomerSearchTerm('');
                                                                    setShowCustomerSuggestions(false);
                                                                }}
                                                                className="px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer border-b border-gray-100 dark:border-border-primary last:border-b-0 transition-colors"
                                                            >
                                                                <div className="font-medium text-gray-900 dark:text-text-primary">{c.name}</div>
                                                                {c.phone && <div className="text-xs text-gray-500 dark:text-text-tertiary">📱 {c.phone}</div>}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm">
                                                            {customerSearchTerm ? 'لا توجد نتائج للبحث' : 'اكتب للبحث عن العميل...'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {receiptForm.customerId && selectedCustomerName && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">
                                                    ✓ تم اختيار: {selectedCustomerName}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* المورد - بحث */}
                                    {entityType === 'supplier' && (
                                        <div className="relative" ref={supplierSearchRef}>
                                            <input
                                                type="text"
                                                value={selectedSupplierName || supplierSearchTerm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSupplierSearchTerm(value);
                                                    setSelectedSupplierName('');
                                                    setReceiptForm({ ...receiptForm, supplierId: '' });
                                                    setShowSupplierSuggestions(true);
                                                }}
                                                onFocus={() => setShowSupplierSuggestions(true)}
                                                placeholder="ابحث عن المورد بالاسم أو الهاتف..."
                                                className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/50 focus:border-warning-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary"
                                                required={!receiptForm.supplierId}
                                            />
                                            {suppliersLoading && (
                                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning-600"></div>
                                                </div>
                                            )}
                                            {showSupplierSuggestions && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-elevated border border-gray-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {suppliersLoading ? (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm text-center">
                                                            جاري البحث...
                                                        </div>
                                                    ) : suppliers.length > 0 ? (
                                                        suppliers.map((s: any) => (
                                                            <div
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setReceiptForm({ ...receiptForm, supplierId: String(s.id) });
                                                                    setSelectedSupplierName(s.name);
                                                                    setSupplierSearchTerm('');
                                                                    setShowSupplierSuggestions(false);
                                                                }}
                                                                className="px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer border-b border-gray-100 dark:border-border-primary last:border-b-0 transition-colors"
                                                            >
                                                                <div className="font-medium text-gray-900 dark:text-text-primary">{s.name}</div>
                                                                {s.phone && <div className="text-xs text-gray-500 dark:text-text-tertiary">📱 {s.phone}</div>}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm">
                                                            {supplierSearchTerm ? 'لا توجد نتائج للبحث' : 'اكتب للبحث عن المورد...'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {receiptForm.supplierId && selectedSupplierName && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">
                                                    ✓ تم اختيار: {selectedSupplierName}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* الموظف - بحث */}
                                    {entityType === 'employee' && (
                                        <div className="relative" ref={employeeSearchRef}>
                                            <input
                                                type="text"
                                                value={selectedEmployeeName || employeeSearchTerm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setEmployeeSearchTerm(value);
                                                    setSelectedEmployeeName('');
                                                    setReceiptForm({ ...receiptForm, employeeId: '' });
                                                    setShowEmployeeSuggestions(true);
                                                }}
                                                onFocus={() => setShowEmployeeSuggestions(true)}
                                                placeholder="ابحث عن الموظف بالاسم أو الهاتف..."
                                                className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 focus:border-purple-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary"
                                                required={!receiptForm.employeeId}
                                            />
                                            {employeesLoading && (
                                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                                </div>
                                            )}
                                            {showEmployeeSuggestions && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-elevated border border-gray-300 dark:border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {employeesLoading ? (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm text-center">
                                                            جاري البحث...
                                                        </div>
                                                    ) : employees.length > 0 ? (
                                                        employees.map((e: any) => (
                                                            <div
                                                                key={e.id}
                                                                onClick={() => {
                                                                    setReceiptForm({ ...receiptForm, employeeId: String(e.id) });
                                                                    setSelectedEmployeeName(e.name);
                                                                    setEmployeeSearchTerm('');
                                                                    setShowEmployeeSuggestions(false);
                                                                }}
                                                                className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer border-b border-gray-100 dark:border-border-primary last:border-b-0 transition-colors"
                                                            >
                                                                <div className="font-medium text-gray-900 dark:text-text-primary">{e.name}</div>
                                                                {e.phone && <div className="text-xs text-gray-500 dark:text-text-tertiary">📱 {e.phone}</div>}
                                                                {e.jobTitle && <div className="text-xs text-gray-400 dark:text-text-muted">💼 {e.jobTitle}</div>}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-gray-500 dark:text-text-tertiary text-sm">
                                                            {employeeSearchTerm ? 'لا توجد نتائج للبحث' : 'اكتب للبحث عن الموظف...'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {receiptForm.employeeId && selectedEmployeeName && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">
                                                    ✓ تم اختيار: {selectedEmployeeName}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-text-secondary italic">الخزينة</label>
                                    <select
                                        required
                                        value={receiptForm.treasuryId}
                                        onChange={(e) => setReceiptForm({ ...receiptForm, treasuryId: e.target.value })}
                                        className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary"
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
                                        className="w-full px-4 py-3 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all text-2xl font-bold text-slate-800 dark:text-text-primary outline-none ltr text-left"
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
                                    className="w-full px-4 py-2 bg-white dark:bg-surface-secondary border border-slate-200 dark:border-border-primary rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 focus:border-primary-500 transition-all font-medium outline-none text-slate-800 dark:text-text-primary min-h-[80px]"
                                    placeholder="اكتب وصفاً مختصراً للعملية"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReceiptModal(false)}
                                    className="flex-1 py-3 border border-slate-200 dark:border-border-primary text-text-secondary dark:text-text-primary rounded-xl font-bold hover:bg-background-secondary dark:hover:bg-surface-hover transition-all"
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
                    <div className="bg-white dark:bg-surface-primary rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-border-primary flex items-center justify-between bg-white dark:bg-surface-primary relative print-hide">
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
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-surface-secondary text-slate-700 dark:text-text-primary rounded-lg hover:bg-slate-200 dark:hover:bg-surface-hover transition-all font-bold text-sm"
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

                        {/* Print Only Styles */}
                        <style jsx global>{`
                            @media print {
                                /* إخفاء كل شيء ما عدا الكشف */
                                html, body {
                                    height: auto !important;
                                    overflow: visible !important;
                                    background: white !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                body * {
                                    visibility: hidden !important;
                                }
                                
                                /* إظهار منطقة الطباعة فقط */
                                #printable-modal-root, 
                                #printable-modal-root * {
                                    visibility: visible !important;
                                }
                                
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

                                #printable-modal-root > div {
                                    position: relative !important;
                                    max-height: none !important;
                                    height: auto !important;
                                    overflow: visible !important;
                                    width: 100% !important;
                                    box-shadow: none !important;
                                    border: none !important;
                                    border-radius: 0 !important;
                                    margin: 0 !important;
                                    transform: none !important;
                                    background: white !important;
                                }

                                /* إخفاء الهيدر والأزرار عند الطباعة */
                                .print-hide {
                                    display: none !important;
                                }

                                /* تنسيق منطقة الطباعة */
                                #printable-statement {
                                    height: auto !important;
                                    overflow: visible !important;
                                    padding: 0 !important;
                                    background: white !important;
                                }

                                /* تنسيق العنوان */
                                .print-header {
                                    border-bottom: 3px solid #000 !important;
                                    padding-bottom: 20px !important;
                                    margin-bottom: 30px !important;
                                }

                                .print-title {
                                    font-size: 24pt !important;
                                    font-weight: bold !important;
                                    text-align: center !important;
                                    color: #000 !important;
                                    margin-bottom: 10px !important;
                                }

                                .print-info {
                                    font-size: 12pt !important;
                                    color: #333 !important;
                                    line-height: 1.8 !important;
                                }

                                /* تنسيق الجدول للطباعة */
                                .print-table {
                                    width: 100% !important;
                                    border-collapse: collapse !important;
                                    margin: 20px 0 !important;
                                    page-break-inside: auto !important;
                                }

                                .print-table thead {
                                    background: #f5f5f5 !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }

                                .print-table th {
                                    border: 2px solid #000 !important;
                                    padding: 12px 8px !important;
                                    font-size: 11pt !important;
                                    font-weight: bold !important;
                                    color: #000 !important;
                                    text-align: center !important;
                                }

                                .print-table td {
                                    border: 1px solid #666 !important;
                                    padding: 10px 8px !important;
                                    font-size: 10pt !important;
                                    color: #000 !important;
                                    text-align: center !important;
                                }

                                .print-table tbody tr {
                                    page-break-inside: avoid !important;
                                }

                                .print-table tbody tr:nth-child(even) {
                                    background: #fafafa !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }

                                /* تنسيق الإجماليات */
                                .print-summary {
                                    margin-top: 30px !important;
                                    border: 2px solid #000 !important;
                                    padding: 20px !important;
                                    background: #f9f9f9 !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }

                                .print-summary-row {
                                    display: flex !important;
                                    justify-content: space-between !important;
                                    padding: 8px 0 !important;
                                    font-size: 12pt !important;
                                    border-bottom: 1px solid #ddd !important;
                                }

                                .print-summary-row:last-child {
                                    border-bottom: none !important;
                                    font-size: 14pt !important;
                                    font-weight: bold !important;
                                    border-top: 2px solid #000 !important;
                                    padding-top: 12px !important;
                                    margin-top: 8px !important;
                                }

                                /* تنسيق التذييل */
                                .print-footer {
                                    margin-top: 40px !important;
                                    padding-top: 20px !important;
                                    border-top: 2px solid #000 !important;
                                    font-size: 9pt !important;
                                    color: #666 !important;
                                    text-align: center !important;
                                }

                                @page {
                                    size: A4;
                                    margin: 1.5cm;
                                }
                            }

                            /* Receipt Print Styles - Print only the receipt when preview is open */
                            @media print {
                                /* إخفاء كل شيء */
                                body * {
                                    visibility: hidden !important;
                                }
                                
                                /* إظهار الإيصال وعناصره فقط */
                                #receipt-print,
                                #receipt-print * {
                                    visibility: visible !important;
                                }
                                
                                #receipt-print {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    background: white !important;
                                    box-shadow: none !important;
                                }

                                /* إخفاء الأزرار والهيدر في المعاينة */
                                .print-hide,
                                button {
                                    display: none !important;
                                    visibility: hidden !important;
                                }
                            }
                        `}</style>

                        <div id="printable-statement" className="flex-1 overflow-y-auto p-8 bg-background-secondary/30 space-y-8 print:bg-white">
                            {/* رأس الكشف للطباعة */}
                            <div className="hidden print:block print-header">
                                <div className="print-title">كشف حساب مالي</div>
                                <div className="print-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
                                    <div><strong>اسم الجهة:</strong> {contacts?.find(c => c.id === selectedContactId)?.name}</div>
                                    <div><strong>تاريخ الطباعة:</strong> {new Date().toLocaleDateString('ar-LY')}</div>
                                    {contacts?.find(c => c.id === selectedContactId)?.phone && (
                                        <div><strong>رقم الهاتف:</strong> {contacts?.find(c => c.id === selectedContactId)?.phone}</div>
                                    )}
                                </div>
                            </div>

                            {/* ملخص الحساب - للشاشة فقط */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
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

                            {/* جدول الحركات - للشاشة */}
                            <div className="bg-white border border-border-primary rounded-2xl shadow-sm overflow-hidden print:hidden">
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

                            {/* جدول الحركات - للطباعة فقط */}
                            <table className="hidden print:table print-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '10%' }}>#</th>
                                        <th style={{ width: '15%' }}>التاريخ</th>
                                        <th style={{ width: '35%' }}>البيان</th>
                                        <th style={{ width: '15%' }}>مدين</th>
                                        <th style={{ width: '15%' }}>دائن</th>
                                        <th style={{ width: '10%' }}>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statement?.map((s, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>{new Date(s.transactionDate).toLocaleDateString('ar-LY')}</td>
                                            <td style={{ textAlign: 'right' }}>{s.description}</td>
                                            <td>{s.transactionType === 'DEPOSIT' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                            <td>{s.transactionType === 'WITHDRAWAL' ? formatCurrency(Number(s.amount)) : '-'}</td>
                                            <td style={{ fontWeight: 'bold' }}>{formatCurrency(Math.abs(Number(s.balance)))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* الإجماليات - للطباعة فقط */}
                            <div className="hidden print:block print-summary">
                                <div className="print-summary-row">
                                    <span>إجمالي المدين (الوارد):</span>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {formatCurrency(statement?.filter(s => s.transactionType === 'DEPOSIT').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                    </span>
                                </div>
                                <div className="print-summary-row">
                                    <span>إجمالي الدائن (المنصرف):</span>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {formatCurrency(statement?.filter(s => s.transactionType === 'WITHDRAWAL').reduce((sum, s) => sum + Number(s.amount), 0) || 0)}
                                    </span>
                                </div>
                                <div className="print-summary-row">
                                    <span>الرصيد النهائي:</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '14pt' }}>
                                        {formatCurrency(Math.abs(Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance || 0)))}
                                        {Number(contacts?.find(c => c.id === selectedContactId)?.currentBalance) >= 0 ? ' (لصالحه)' : ' (عليه)'}
                                    </span>
                                </div>
                            </div>

                            {/* التذييل - للطباعة فقط */}
                            <div className="hidden print:block print-footer">
                                <p>هذا الكشف صادر إلكترونياً ولا يحتاج إلى ختم أو توقيع</p>
                                <p style={{ marginTop: '5px' }}>تاريخ ووقت الطباعة: {new Date().toLocaleString('ar-LY')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            {showReceiptPreview && selectedReceipt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between print-hide">
                            <h2 className="text-lg font-bold">معاينة الإيصال</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                >
                                    <Printer className="w-4 h-4" />
                                    طباعة
                                </button>
                                <button
                                    onClick={() => setShowReceiptPreview(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-surface-hover rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Receipt Print Template */}
                        <div id="receipt-print" className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-xl mx-auto">
                                {/* Header */}
                                <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                                    <h1 className="text-2xl font-bold mb-2">إيصال {selectedReceipt.type === 'DEPOSIT' ? 'قبض' : 'صرف'}</h1>
                                    <div className="text-sm text-gray-600">
                                        <p>رقم الإيصال: #{selectedReceipt.id}</p>
                                        <p>التاريخ: {new Date(selectedReceipt.paymentDate).toLocaleDateString('ar-LY')}</p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="font-bold text-gray-700">الجهة:</span>
                                        <span className="font-bold">
                                            {selectedReceipt.contact?.name || selectedReceipt.customer?.name || selectedReceipt.supplier?.name || selectedReceipt.employee?.name}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="font-bold text-gray-700">نوع الجهة:</span>
                                        <span>
                                            {selectedReceipt.contact && 'جهة اتصال'}
                                            {selectedReceipt.customer && 'عميل'}
                                            {selectedReceipt.supplier && 'مورد'}
                                            {selectedReceipt.employee && 'موظف'}
                                        </span>
                                    </div>

                                    {(selectedReceipt.contact?.phone || selectedReceipt.customer?.phone || selectedReceipt.supplier?.phone || selectedReceipt.employee?.phone) && (
                                        <div className="flex justify-between py-2 border-b border-gray-200">
                                            <span className="font-bold text-gray-700">الهاتف:</span>
                                            <span>{selectedReceipt.contact?.phone || selectedReceipt.customer?.phone || selectedReceipt.supplier?.phone || selectedReceipt.employee?.phone}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="font-bold text-gray-700">نوع العملية:</span>
                                        <span className={`font-bold ${selectedReceipt.type === 'DEPOSIT' ? 'text-success-600' : 'text-error-600'}`}>
                                            {selectedReceipt.type === 'DEPOSIT' ? 'قبض (وارد)' : 'صرف (صادر)'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-2 border-b border-gray-200">
                                        <span className="font-bold text-gray-700">البيان:</span>
                                        <span>{selectedReceipt.description || '-'}</span>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-800 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold">المبلغ:</span>
                                        <span className="text-3xl font-bold">{formatCurrency(Number(selectedReceipt.amount))}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-300">
                                    <p>هذا الإيصال صادر إلكترونياً</p>
                                    <p className="mt-1">تاريخ الطباعة: {new Date().toLocaleString('ar-LY')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden div for printing - للطباعة فقط (مخفي) */}
            <div ref={printRef} style={{ display: 'none' }}>
                {receiptToPrint && (
                    <GeneralReceiptPrint 
                        receipt={receiptToPrint} 
                        companyName={getCompanyInfo().name}
                        userName={getCompanyInfo().userName}
                    />
                )}
                {receiptsToPrint.length > 0 && (
                    <ReceiptsReport 
                        receipts={receiptsToPrint}
                        companyName={getCompanyInfo().name}
                        userName={getCompanyInfo().userName}
                    />
                )}
            </div>
        </div>
    );
}
