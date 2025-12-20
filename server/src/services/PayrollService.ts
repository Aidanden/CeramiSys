/**
 * Payroll Service
 * خدمة المرتبات والموظفين
 */

import { PrismaClient, TransactionSource, BonusType } from '@prisma/client';
import TreasuryController from '../controllers/TreasuryController';

const prisma = new PrismaClient();

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

        // 2. التحقق من عدم صرف راتب هذا الشهر سابقاً
        const existingPayment = await prisma.salaryPayment.findFirst({
            where: {
                employeeId: data.employeeId,
                month: data.month,
                year: data.year
            }
        });

        if (existingPayment) {
            throw new Error(`تم صرف راتب شهر ${data.month}/${data.year} لهذا الموظف بالفعل`);
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
                treasuryId: data.treasuryId,
                receiptNumber,
                notes: data.notes,
                createdBy: data.createdBy
            },
            include: {
                employee: {
                    select: { name: true, jobTitle: true }
                }
            }
        });

        // 6. خصم المبلغ من الخزينة وتسجيل الحركة
        await this.withdrawFromTreasury(
            data.treasuryId,
            data.amount,
            TransactionSource.SALARY,
            'SALARY_PAYMENT',
            salaryPayment.id,
            `صرف راتب شهر ${data.month}/${data.year} للموظف: ${employee.name}`,
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

        // إجمالي الموظفين النشطين
        const totalActiveEmployees = await prisma.employee.count({
            where: { isActive: true, ...(companyId && { companyId }) }
        });

        // إجمالي المرتبات المصروفة هذا الشهر
        const thisMonthSalaries = await prisma.salaryPayment.aggregate({
            where: {
                ...where,
                month: currentMonth,
                year: currentYear
            },
            _sum: { amount: true },
            _count: true
        });

        // إجمالي المرتبات المصروفة هذا العام
        const thisYearSalaries = await prisma.salaryPayment.aggregate({
            where: {
                ...where,
                year: currentYear
            },
            _sum: { amount: true },
            _count: true
        });

        // إجمالي المكافآت هذا العام
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
            }
        };
    }

    /**
     * سجل المرتبات لشهر معين
     */
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
                }
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
