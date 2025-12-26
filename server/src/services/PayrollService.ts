/**
 * Payroll Service
 * خدمة المرتبات والموظفين
 */

import { TransactionSource, BonusType } from '@prisma/client';
import prisma from '../models/prismaClient';
import TreasuryController from '../controllers/TreasuryController';

// Types
interface CreateEmployeeDto {
    name: string;
    jobTitle?: string;
    phone?: string;
    email?: string;
    baseSalary: number;
    companyId: number;
    hireDate?: Date;
    notes?: string;
}

interface UpdateEmployeeDto {
    name?: string;
    jobTitle?: string;
    phone?: string;
    email?: string;
    baseSalary?: number;
    hireDate?: Date;
    notes?: string;
    isActive?: boolean;
}

interface PaySalaryDto {
    employeeId: number;
    month: number;
    year: number;
    amount: number;
    type: 'PARTIAL' | 'FINAL';
    treasuryId: number;
    notes?: string;
    createdBy?: string;
}

interface PayBonusDto {
    employeeId: number;
    type: BonusType;
    amount: number;
    reason?: string;
    treasuryId: number;
    effectiveDate?: Date;
    notes?: string;
    createdBy?: string;
}

interface PayMultipleSalariesDto {
    employeeIds: number[];
    month: number;
    year: number;
    treasuryId: number;
    createdBy?: string;
}

export class PayrollService {

    /**
     * توليد رقم إيصال صرف
     */
    private async generateReceiptNumber(type: 'SAL' | 'BON'): Promise<string> {
        const today = new Date();
        const datePrefix = `${type}-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // البحث عن آخر رقم إيصال لهذا اليوم
        const lastReceipt = type === 'SAL'
            ? await prisma.salaryPayment.findFirst({
                where: { receiptNumber: { startsWith: datePrefix } },
                orderBy: { receiptNumber: 'desc' }
            })
            : await prisma.employeeBonus.findFirst({
                where: { receiptNumber: { startsWith: datePrefix } },
                orderBy: { receiptNumber: 'desc' }
            });

        let sequence = 1;
        if (lastReceipt?.receiptNumber) {
            const lastSeq = parseInt(lastReceipt.receiptNumber.split('-').pop() || '0');
            sequence = lastSeq + 1;
        }

        return `${datePrefix}-${String(sequence).padStart(4, '0')}`;
    }

    // ============== إدارة الموظفين ==============

    /**
     * إنشاء موظف جديد
     */
    async createEmployee(data: CreateEmployeeDto) {
        const employee = await prisma.employee.create({
            data: {
                name: data.name,
                jobTitle: data.jobTitle,
                phone: data.phone,
                email: data.email,
                baseSalary: data.baseSalary,
                companyId: data.companyId,
                hireDate: data.hireDate,
                notes: data.notes
            },
            include: { company: { select: { id: true, name: true, code: true } } }
        });

        return {
            ...employee,
            baseSalary: Number(employee.baseSalary)
        };
    }

    /**
     * الحصول على قائمة الموظفين
     */
    async getEmployees(companyId?: number, isActive?: boolean, search?: string) {
        const where: any = {};

        if (companyId) where.companyId = companyId;
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } }
            ];
        }

        const employees = await prisma.employee.findMany({
            where,
            include: {
                company: { select: { id: true, name: true, code: true } },
                _count: {
                    select: { salaryPayments: true, bonuses: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return employees.map(emp => ({
            ...emp,
            baseSalary: Number(emp.baseSalary),
            totalPayments: emp._count.salaryPayments,
            totalBonuses: emp._count.bonuses
        }));
    }

    /**
     * الحصول على موظف واحد
     */
    async getEmployeeById(id: number) {
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                company: { select: { id: true, name: true, code: true } },
                salaryPayments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 12
                },
                bonuses: {
                    orderBy: { paymentDate: 'desc' },
                    take: 10
                }
            }
        });

        if (!employee) {
            throw new Error('الموظف غير موجود');
        }

        return {
            ...employee,
            baseSalary: Number(employee.baseSalary),
            salaryPayments: employee.salaryPayments.map(p => ({
                ...p,
                amount: Number(p.amount)
            })),
            bonuses: employee.bonuses.map(b => ({
                ...b,
                amount: Number(b.amount)
            }))
        };
    }

    /**
     * تحديث موظف
     */
    async updateEmployee(id: number, data: UpdateEmployeeDto) {
        const employee = await prisma.employee.update({
            where: { id },
            data: {
                name: data.name,
                jobTitle: data.jobTitle,
                phone: data.phone,
                email: data.email,
                baseSalary: data.baseSalary,
                hireDate: data.hireDate,
                notes: data.notes,
                isActive: data.isActive
            },
            include: { company: { select: { id: true, name: true, code: true } } }
        });

        return {
            ...employee,
            baseSalary: Number(employee.baseSalary)
        };
    }

    /**
     * حذف موظف (تعطيل)
     */
    async deleteEmployee(id: number) {
        // تحقق من وجود مرتبات مصروفة
        const hasPayments = await prisma.salaryPayment.count({
            where: { employeeId: id }
        });

        if (hasPayments > 0) {
            // تعطيل بدلاً من الحذف
            await prisma.employee.update({
                where: { id },
                data: { isActive: false }
            });
            return { deleted: false, deactivated: true, message: 'تم تعطيل الموظف لأن له سجلات مرتبات' };
        }

        await prisma.employee.delete({ where: { id } });
        return { deleted: true, deactivated: false, message: 'تم حذف الموظف بنجاح' };
    }

    // ============== صرف المرتبات ==============

    /**
     * صرف مرتب لموظف
     */
    async paySalary(data: PaySalaryDto) {
        // 1. التحقق من وجود الموظف
        const employee = await prisma.employee.findUnique({
            where: { id: data.employeeId },
            include: { company: { select: { name: true } } }
        });

        if (!employee) {
            throw new Error('الموظف غير موجود');
        }

        if (!employee.isActive) {
            throw new Error('لا يمكن صرف راتب لموظف غير نشط');
        }

        // 2. التحقق من حالة الراتب لهذا الشهر (اختياري: يمكن التحقق إذا كانت هناك تسوية نهائية بالفعل)
        const finalPayment = await prisma.salaryPayment.findFirst({
            where: {
                employeeId: data.employeeId,
                month: data.month,
                year: data.year,
                type: 'FINAL'
            }
        });

        if (finalPayment) {
            throw new Error(`تمت التسوية النهائية لراتب شهر ${data.month}/${data.year} لهذا الموظف بالفعل. لا يمكن إضافة حركات إضافية.`);
        }

        // 3. التحقق من رصيد الخزينة
        const treasury = await prisma.treasury.findUnique({
            where: { id: data.treasuryId }
        });

        if (!treasury) {
            throw new Error('الخزينة غير موجودة');
        }

        if (Number(treasury.balance) < data.amount) {
            throw new Error(`رصيد الخزينة غير كافٍ. الرصيد الحالي: ${Number(treasury.balance).toFixed(2)} د.ل`);
        }

        // 4. توليد رقم الإيصال
        const receiptNumber = await this.generateReceiptNumber('SAL');

        // 5. إنشاء سجل صرف المرتب
        const salaryPayment = await prisma.salaryPayment.create({
            data: {
                employeeId: data.employeeId,
                amount: data.amount,
                month: data.month,
                year: data.year,
                type: data.type as any, // 'PARTIAL' | 'FINAL'
                treasuryId: data.treasuryId,
                receiptNumber,
                notes: data.notes,
                createdBy: data.createdBy
            },
            include: {
                employee: {
                    select: { name: true, jobTitle: true }
                },
                treasury: {
                    select: { name: true }
                }
            }
        });

        // 6. خصم المبلغ من الخزينة وتسجيل الحركة
        const movementType = data.type === 'FINAL' ? 'تسوية نهائية' : 'دفعة جزئية / سلفة';
        await this.withdrawFromTreasury(
            data.treasuryId,
            data.amount,
            TransactionSource.SALARY,
            'SALARY_PAYMENT',
            salaryPayment.id,
            `صرف (${movementType}) شهر ${data.month}/${data.year} للموظف: ${employee.name}`,
            data.createdBy
        );

        return {
            ...salaryPayment,
            amount: Number(salaryPayment.amount),
            monthName: this.getArabicMonthName(data.month)
        };
    }

    /**
     * صرف مرتبات لمجموعة موظفين
     */
    async payMultipleSalaries(data: PayMultipleSalariesDto) {
        const results: any[] = [];
        const errors: any[] = [];

        // التحقق من رصيد الخزينة الكلي المطلوب
        const employees = await prisma.employee.findMany({
            where: { id: { in: data.employeeIds }, isActive: true }
        });

        const totalAmount = employees.reduce((sum, emp) => sum + Number(emp.baseSalary), 0);

        const treasury = await prisma.treasury.findUnique({
            where: { id: data.treasuryId }
        });

        if (!treasury || Number(treasury.balance) < totalAmount) {
            throw new Error(`رصيد الخزينة غير كافٍ. المطلوب: ${totalAmount.toFixed(2)} د.ل، المتاح: ${Number(treasury?.balance || 0).toFixed(2)} د.ل`);
        }

        // صرف المرتبات واحداً تلو الآخر
        for (const employeeId of data.employeeIds) {
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) {
                errors.push({ employeeId, error: 'الموظف غير موجود أو غير نشط' });
                continue;
            }

            try {
                const payment = await this.paySalary({
                    employeeId,
                    month: data.month,
                    year: data.year,
                    amount: Number(employee.baseSalary),
                    type: 'FINAL', // Mass payout is usually final
                    treasuryId: data.treasuryId,
                    createdBy: data.createdBy
                });
                results.push(payment);
            } catch (error: any) {
                errors.push({ employeeId, employeeName: employee.name, error: error.message });
            }
        }

        return { success: results, errors, totalPaid: results.length, totalFailed: errors.length };
    }

    // ============== المكافآت والزيادات ==============

    /**
     * صرف مكافأة أو زيادة
     */
    async payBonus(data: PayBonusDto) {
        // 1. التحقق من وجود الموظف
        const employee = await prisma.employee.findUnique({
            where: { id: data.employeeId }
        });

        if (!employee) {
            throw new Error('الموظف غير موجود');
        }

        // 2. التحقق من رصيد الخزينة
        const treasury = await prisma.treasury.findUnique({
            where: { id: data.treasuryId }
        });

        if (!treasury) {
            throw new Error('الخزينة غير موجودة');
        }

        if (Number(treasury.balance) < data.amount) {
            throw new Error(`رصيد الخزينة غير كافٍ. الرصيد الحالي: ${Number(treasury.balance).toFixed(2)} د.ل`);
        }

        // 3. توليد رقم الإيصال
        const receiptNumber = await this.generateReceiptNumber('BON');

        // 4. إنشاء سجل المكافأة/الزيادة
        const bonus = await prisma.employeeBonus.create({
            data: {
                employeeId: data.employeeId,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
                treasuryId: data.treasuryId,
                receiptNumber,
                effectiveDate: data.effectiveDate,
                notes: data.notes,
                createdBy: data.createdBy
            },
            include: {
                employee: { select: { name: true, jobTitle: true } }
            }
        });

        // 5. خصم المبلغ من الخزينة
        const bonusTypeName = this.getBonusTypeName(data.type);
        await this.withdrawFromTreasury(
            data.treasuryId,
            data.amount,
            TransactionSource.BONUS,
            'EMPLOYEE_BONUS',
            bonus.id,
            `${bonusTypeName} للموظف: ${employee.name}`,
            data.createdBy
        );

        // 6. إذا كانت زيادة، نحدث الراتب الأساسي
        if (data.type === 'RAISE') {
            await prisma.employee.update({
                where: { id: data.employeeId },
                data: { baseSalary: { increment: data.amount } }
            });
        }

        return {
            ...bonus,
            amount: Number(bonus.amount),
            typeName: bonusTypeName
        };
    }

    /**
     * دالة مساعدة للسحب من الخزينة وتسجيل الحركة
     */
    private async withdrawFromTreasury(
        treasuryId: number,
        amount: number,
        source: TransactionSource,
        referenceType: string,
        referenceId: number,
        description: string,
        createdBy?: string
    ) {
        // الخصم من رصيد الخزينة
        const treasury = await prisma.treasury.update({
            where: { id: treasuryId },
            data: { balance: { decrement: amount } }
        });

        // تسجيل الحركة
        await prisma.treasuryTransaction.create({
            data: {
                treasuryId,
                amount: -amount, // Ensure negative amount
                type: 'WITHDRAWAL', // استخدام string literal إذا لم يتم استيراد TransactionType
                source,
                balanceBefore: Number(treasury.balance) + amount,
                balanceAfter: Number(treasury.balance),
                description,
                referenceType,
                referenceId,
                createdBy
            }
        });
    }

    // ============== الإحصائيات والتقارير ==============

    /**
     * إحصائيات المرتبات
     */
    async getPayrollStats(companyId?: number, year?: number) {
        const currentYear = year || new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const where: any = {};
        if (companyId) where.employee = { companyId };

        // 1. إجمالي الموظفين النشطين
        const totalActiveEmployees = await prisma.employee.count({
            where: { isActive: true, ...(companyId && { companyId }) }
        });

        // 2. إجمالي المرتبات والمكافآت (ملخص)
        const thisMonthSalaries = await prisma.salaryPayment.aggregate({
            where: { ...where, month: currentMonth, year: currentYear },
            _sum: { amount: true },
            _count: true
        });

        const thisYearSalaries = await prisma.salaryPayment.aggregate({
            where: { ...where, year: currentYear },
            _sum: { amount: true },
            _count: true
        });

        const thisYearBonuses = await prisma.employeeBonus.aggregate({
            where: {
                ...where,
                paymentDate: {
                    gte: new Date(currentYear, 0, 1),
                    lte: new Date(currentYear, 11, 31)
                }
            },
            _sum: { amount: true },
            _count: true
        });

        // 3. تحليل شهري للسنة الحالية (Graph Data)
        const monthlyBreakdown = await Promise.all(
            Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
                const salaries = await prisma.salaryPayment.aggregate({
                    where: { ...where, month, year: currentYear },
                    _sum: { amount: true }
                });

                const bonuses = await prisma.employeeBonus.aggregate({
                    where: {
                        ...where,
                        paymentDate: {
                            gte: new Date(currentYear, month - 1, 1),
                            lte: new Date(currentYear, month, 0)
                        }
                    },
                    _sum: { amount: true }
                });

                return {
                    month,
                    monthName: this.getArabicMonthName(month),
                    salaries: Number(salaries._sum.amount || 0),
                    bonuses: Number(bonuses._sum.amount || 0),
                    total: Number(salaries._sum.amount || 0) + Number(bonuses._sum.amount || 0)
                };
            })
        );

        // 4. توزيع الصرف حسب الخزينة
        const treasuryDistribution = await prisma.salaryPayment.groupBy({
            by: ['treasuryId'],
            where: { ...where, year: currentYear },
            _sum: { amount: true },
        });

        const treasuries = await prisma.treasury.findMany({
            where: { id: { in: treasuryDistribution.map(d => d.treasuryId) } },
            select: { id: true, name: true }
        });

        const formattedTreasuryDist = treasuryDistribution.map(dist => ({
            name: treasuries.find(t => t.id === dist.treasuryId)?.name || 'غير معروف',
            amount: Number(dist._sum.amount || 0)
        }));

        return {
            totalActiveEmployees,
            thisMonth: {
                salariesPaid: thisMonthSalaries._count,
                totalAmount: Number(thisMonthSalaries._sum.amount || 0)
            },
            thisYear: {
                salariesPaid: thisYearSalaries._count,
                totalSalaries: Number(thisYearSalaries._sum.amount || 0),
                bonusesPaid: thisYearBonuses._count,
                totalBonuses: Number(thisYearBonuses._sum.amount || 0),
                grandTotal: Number(thisYearSalaries._sum.amount || 0) + Number(thisYearBonuses._sum.amount || 0)
            },
            monthlyBreakdown,
            treasuryDistribution: formattedTreasuryDist
        };
    }

    /**
     * سجل المرتبات لشهر معين
     */
    /**
     * كشف حركة مرتب الموظف لشهر معين
     */
    async getEmployeeSalaryStatement(employeeId: number, month: number, year: number) {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { company: true }
        });

        if (!employee) throw new Error('الموظف غير موجود');

        // الحركات (دفعات المرتب)
        const payments = await prisma.salaryPayment.findMany({
            where: { employeeId, month, year },
            include: { treasury: { select: { name: true } } },
            orderBy: { paymentDate: 'asc' }
        });

        // المكافآت (اختياري: يمكن تضمينها في كشف الحركة إذا كانت مرتبطة بالشهر)
        const bonuses = await prisma.employeeBonus.findMany({
            where: {
                employeeId,
                paymentDate: {
                    gte: new Date(year, month - 1, 1),
                    lte: new Date(year, month, 0)
                }
            },
            orderBy: { paymentDate: 'asc' }
        });

        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const baseSalary = Number(employee.baseSalary);
        const remaining = baseSalary - totalPaid;

        return {
            employee: {
                id: employee.id,
                name: employee.name,
                jobTitle: employee.jobTitle,
                baseSalary: baseSalary
            },
            month,
            year,
            monthName: this.getArabicMonthName(month),
            summary: {
                baseSalary,
                totalPaid,
                remaining
            },
            movements: [
                ...payments.map(p => ({
                    id: p.id,
                    date: p.paymentDate,
                    type: p.type === 'FINAL' ? 'تسوية نهائية' : 'دفعة جزئية / سلفة',
                    amount: Number(p.amount),
                    treasury: p.treasury.name,
                    receiptNumber: p.receiptNumber,
                    notes: p.notes
                }))
            ]
        };
    }

    async getSalaryPaymentsByMonth(month: number, year: number, companyId?: number) {
        const payments = await prisma.salaryPayment.findMany({
            where: {
                month,
                year,
                ...(companyId && { employee: { companyId } })
            },
            include: {
                employee: {
                    select: { id: true, name: true, jobTitle: true, baseSalary: true }
                },
                treasury: { select: { name: true } }
            },
            orderBy: { paymentDate: 'desc' }
        });

        return payments.map(p => ({
            ...p,
            amount: Number(p.amount),
            employee: {
                ...p.employee,
                baseSalary: Number(p.employee.baseSalary)
            }
        }));
    }

    // ============== أدوات مساعدة ==============

    private getArabicMonthName(month: number): string {
        const months = [
            '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[month] || '';
    }

    private getBonusTypeName(type: BonusType): string {
        const types: Record<BonusType, string> = {
            BONUS: 'مكافأة',
            RAISE: 'زيادة راتب',
            INCENTIVE: 'حافز',
            OVERTIME: 'بدل إضافي'
        };
        return types[type] || type;
    }
}

export default new PayrollService();
