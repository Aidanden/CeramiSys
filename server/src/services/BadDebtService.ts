/**
 * Bad Debt Service
 * خدمة المصروفات المعدومة
 */

import { PrismaClient, TransactionSource } from '@prisma/client';
import TreasuryController from '../controllers/TreasuryController';

const prisma = new PrismaClient();

// Types
interface CreateCategoryDto {
    name: string;
    description?: string;
    companyId?: number;
}

interface UpdateCategoryDto {
    name?: string;
    description?: string;
    isActive?: boolean;
}

interface PayBadDebtDto {
    categoryId: number;
    amount: number;
    description?: string;
    treasuryId: number;
    notes?: string;
    createdBy?: string;
}

export class BadDebtService {

    /**
     * توليد رقم إيصال صرف مصروف معدوم
     */
    private async generateReceiptNumber(): Promise<string> {
        const today = new Date();
        const datePrefix = `BD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        const lastReceipt = await prisma.badDebtExpense.findFirst({
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

    // ============== إدارة بنود المصروفات المعدومة ==============

    /**
     * إنشاء بند مصروف معدوم جديد
     */
    async createCategory(data: CreateCategoryDto) {
        const category = await prisma.badDebtCategory.create({
            data: {
                name: data.name,
                description: data.description,
                companyId: data.companyId
            },
            include: {
                company: { select: { id: true, name: true, code: true } }
            }
        });

        return category;
    }

    /**
     * الحصول على قائمة بنود المصروفات المعدومة
     */
    async getCategories(companyId?: number, isActive?: boolean, search?: string) {
        const where: any = {};

        if (companyId) where.companyId = companyId;
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const categories = await prisma.badDebtCategory.findMany({
            where,
            include: {
                company: { select: { id: true, name: true, code: true } },
                _count: { select: { expenses: true } }
            },
            orderBy: { name: 'asc' }
        });

        // حساب إجمالي المصروفات لكل بند
        const categoriesWithTotals = await Promise.all(
            categories.map(async (cat) => {
                const totalExpenses = await prisma.badDebtExpense.aggregate({
                    where: { categoryId: cat.id },
                    _sum: { amount: true }
                });

                return {
                    ...cat,
                    totalExpenses: Number(totalExpenses._sum.amount || 0),
                    expensesCount: cat._count.expenses
                };
            })
        );

        return categoriesWithTotals;
    }

    /**
     * الحصول على بند مصروف معدوم واحد
     */
    async getCategoryById(id: number) {
        const category = await prisma.badDebtCategory.findUnique({
            where: { id },
            include: {
                company: { select: { id: true, name: true, code: true } },
                expenses: {
                    orderBy: { paymentDate: 'desc' },
                    take: 20
                }
            }
        });

        if (!category) {
            throw new Error('بند المصروف غير موجود');
        }

        // حساب الإجمالي
        const totalExpenses = await prisma.badDebtExpense.aggregate({
            where: { categoryId: id },
            _sum: { amount: true },
            _count: true
        });

        return {
            ...category,
            expenses: category.expenses.map(e => ({
                ...e,
                amount: Number(e.amount)
            })),
            totalExpenses: Number(totalExpenses._sum.amount || 0),
            expensesCount: totalExpenses._count
        };
    }

    /**
     * تحديث بند مصروف معدوم
     */
    async updateCategory(id: number, data: UpdateCategoryDto) {
        const category = await prisma.badDebtCategory.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                isActive: data.isActive
            },
            include: {
                company: { select: { id: true, name: true, code: true } }
            }
        });

        return category;
    }

    /**
     * حذف بند مصروف معدوم
     */
    async deleteCategory(id: number) {
        // تحقق من وجود مصروفات مرتبطة
        const hasExpenses = await prisma.badDebtExpense.count({
            where: { categoryId: id }
        });

        if (hasExpenses > 0) {
            // تعطيل بدلاً من الحذف
            await prisma.badDebtCategory.update({
                where: { id },
                data: { isActive: false }
            });
            return { deleted: false, deactivated: true, message: 'تم تعطيل البند لأن له مصروفات مسجلة' };
        }

        await prisma.badDebtCategory.delete({ where: { id } });
        return { deleted: true, deactivated: false, message: 'تم حذف البند بنجاح' };
    }

    // ============== صرف المصروفات المعدومة ==============

    /**
     * صرف مصروف معدوم
     */
    async payBadDebt(data: PayBadDebtDto) {
        // 1. التحقق من وجود البند
        const category = await prisma.badDebtCategory.findUnique({
            where: { id: data.categoryId }
        });

        if (!category) {
            throw new Error('بند المصروف غير موجود');
        }

        if (!category.isActive) {
            throw new Error('بند المصروف غير نشط');
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
        const receiptNumber = await this.generateReceiptNumber();

        // 4. إنشاء سجل المصروف المعدوم
        const expense = await prisma.badDebtExpense.create({
            data: {
                categoryId: data.categoryId,
                amount: data.amount,
                description: data.description,
                treasuryId: data.treasuryId,
                receiptNumber,
                notes: data.notes,
                createdBy: data.createdBy
            },
            include: {
                category: { select: { id: true, name: true } }
            }
        });

        // 5. خصم المبلغ من الخزينة وتسجيل الحركة
        await this.withdrawFromTreasury(
            data.treasuryId,
            data.amount,
            TransactionSource.BAD_DEBT,
            'BAD_DEBT_EXPENSE',
            expense.id,
            `مصروف معدوم: ${category.name}${data.description ? ` - ${data.description}` : ''}`,
            data.createdBy
        );

        return {
            ...expense,
            amount: Number(expense.amount)
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

    /**
     * الحصول على قائمة المصروفات المعدومة
     */
    async getExpenses(params: {
        categoryId?: number;
        treasuryId?: number;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        const { categoryId, treasuryId, startDate, endDate, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (categoryId) where.categoryId = categoryId;
        if (treasuryId) where.treasuryId = treasuryId;
        if (startDate || endDate) {
            where.paymentDate = {};
            if (startDate) where.paymentDate.gte = startDate;
            if (endDate) where.paymentDate.lte = endDate;
        }

        const [expenses, total] = await Promise.all([
            prisma.badDebtExpense.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } }
                },
                orderBy: { paymentDate: 'desc' },
                skip,
                take: limit
            }),
            prisma.badDebtExpense.count({ where })
        ]);

        return {
            expenses: expenses.map(e => ({
                ...e,
                amount: Number(e.amount)
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // ============== الإحصائيات والتقارير ==============

    /**
     * إحصائيات المصروفات المعدومة
     */
    async getBadDebtStats(companyId?: number, year?: number) {
        const currentYear = year || new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const categoryWhere = companyId ? { companyId } : {};

        // إجمالي البنود النشطة
        const totalActiveCategories = await prisma.badDebtCategory.count({
            where: { isActive: true, ...categoryWhere }
        });

        // إجمالي المصروفات هذا الشهر
        const thisMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const thisMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const thisMonthExpenses = await prisma.badDebtExpense.aggregate({
            where: {
                paymentDate: { gte: thisMonthStart, lte: thisMonthEnd },
                ...(companyId && { category: { companyId } })
            },
            _sum: { amount: true },
            _count: true
        });

        // إجمالي المصروفات هذا العام
        const thisYearExpenses = await prisma.badDebtExpense.aggregate({
            where: {
                paymentDate: {
                    gte: new Date(currentYear, 0, 1),
                    lte: new Date(currentYear, 11, 31, 23, 59, 59)
                },
                ...(companyId && { category: { companyId } })
            },
            _sum: { amount: true },
            _count: true
        });

        // أعلى البنود استخداماً
        const topCategories = await prisma.badDebtExpense.groupBy({
            by: ['categoryId'],
            where: {
                paymentDate: {
                    gte: new Date(currentYear, 0, 1),
                    lte: new Date(currentYear, 11, 31, 23, 59, 59)
                }
            },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 5
        });

        // جلب أسماء البنود
        const categoryIds = topCategories.map(t => t.categoryId);
        const categories = await prisma.badDebtCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true }
        });

        const topCategoriesWithNames = topCategories.map(tc => {
            const cat = categories.find(c => c.id === tc.categoryId);
            return {
                categoryId: tc.categoryId,
                categoryName: cat?.name || 'غير معروف',
                totalAmount: Number(tc._sum.amount || 0),
                count: tc._count
            };
        });

        return {
            totalActiveCategories,
            thisMonth: {
                count: thisMonthExpenses._count,
                totalAmount: Number(thisMonthExpenses._sum.amount || 0)
            },
            thisYear: {
                count: thisYearExpenses._count,
                totalAmount: Number(thisYearExpenses._sum.amount || 0)
            },
            topCategories: topCategoriesWithNames
        };
    }

    /**
     * تقرير المصروفات المعدومة الشهري
     */
    async getMonthlyReport(year: number, companyId?: number) {
        const monthlyData = [];

        for (let month = 1; month <= 12; month++) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const expenses = await prisma.badDebtExpense.aggregate({
                where: {
                    paymentDate: { gte: startDate, lte: endDate },
                    ...(companyId && { category: { companyId } })
                },
                _sum: { amount: true },
                _count: true
            });

            monthlyData.push({
                month,
                monthName: this.getArabicMonthName(month),
                count: expenses._count,
                totalAmount: Number(expenses._sum.amount || 0)
            });
        }

        return monthlyData;
    }

    // ============== أدوات مساعدة ==============

    private getArabicMonthName(month: number): string {
        const months = [
            '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return months[month] || '';
    }
}

export default new BadDebtService();
