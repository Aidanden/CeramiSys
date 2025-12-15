import { Request, Response } from 'express';
import { PrismaClient, TreasuryType, TransactionType, TransactionSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// استخدام any للتوافق مع middleware الموجود
type AuthRequest = Request & {
    user?: any;
};

class TreasuryController {
    // ============== إدارة الخزائن ==============

    /**
     * الحصول على جميع الخزائن
     */
    async getAllTreasuries(req: AuthRequest, res: Response) {
        try {
            const { type, companyId, isActive } = req.query;

            const where: any = {};
            if (type) where.type = type;
            if (companyId) where.companyId = Number(companyId);
            if (isActive !== undefined) where.isActive = isActive === 'true';

            const treasuries = await prisma.treasury.findMany({
                where,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
                orderBy: [
                    { type: 'asc' },
                    { name: 'asc' },
                ],
            });

            return res.json(treasuries);
        } catch (error: any) {
            console.error('Error fetching treasuries:', error);
            return res.status(500).json({ error: 'فشل في جلب الخزائن', details: error.message });
        }
    }

    /**
     * الحصول على خزينة واحدة
     */
    async getTreasuryById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            const treasury = await prisma.treasury.findUnique({
                where: { id: Number(id) },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    transactions: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!treasury) {
                return res.status(404).json({ error: 'الخزينة غير موجودة' });
            }

            return res.json(treasury);
        } catch (error: any) {
            console.error('Error fetching treasury:', error);
            return res.status(500).json({ error: 'فشل في جلب الخزينة', details: error.message });
        }
    }

    /**
     * إنشاء خزينة جديدة
     */
    async createTreasury(req: AuthRequest, res: Response) {
        try {
            const { name, type, companyId, bankName, accountNumber, openingBalance } = req.body;

            // التحقق من البيانات المطلوبة
            if (!name || !type) {
                return res.status(400).json({ error: 'الاسم والنوع مطلوبان' });
            }

            // التحقق من نوع الخزينة
            if (type === 'COMPANY' && !companyId) {
                return res.status(400).json({ error: 'يجب تحديد الشركة لخزينة الشركة' });
            }

            if (type === 'BANK' && !bankName) {
                return res.status(400).json({ error: 'يجب تحديد اسم البنك للحساب المصرفي' });
            }

            // إنشاء الخزينة
            const treasury = await prisma.treasury.create({
                data: {
                    name,
                    type: type as TreasuryType,
                    companyId: companyId ? Number(companyId) : null,
                    bankName: bankName || null,
                    accountNumber: accountNumber || null,
                    balance: openingBalance ? new Decimal(openingBalance) : new Decimal(0),
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });

            // إذا كان هناك رصيد افتتاحي، أنشئ حركة
            if (openingBalance && Number(openingBalance) > 0) {
                await prisma.treasuryTransaction.create({
                    data: {
                        treasuryId: treasury.id,
                        type: TransactionType.DEPOSIT,
                        source: TransactionSource.OPENING_BALANCE,
                        amount: new Decimal(openingBalance),
                        balanceBefore: new Decimal(0),
                        balanceAfter: new Decimal(openingBalance),
                        description: 'رصيد افتتاحي',
                        createdBy: req.user?.UserID,
                    },
                });
            }

            return res.status(201).json(treasury);
        } catch (error: any) {
            console.error('Error creating treasury:', error);
            return res.status(500).json({ error: 'فشل في إنشاء الخزينة', details: error.message });
        }
    }

    /**
     * تحديث خزينة
     */
    async updateTreasury(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, bankName, accountNumber, isActive } = req.body;

            const treasury = await prisma.treasury.update({
                where: { id: Number(id) },
                data: {
                    name,
                    bankName,
                    accountNumber,
                    isActive,
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });

            return res.json(treasury);
        } catch (error: any) {
            console.error('Error updating treasury:', error);
            return res.status(500).json({ error: 'فشل في تحديث الخزينة', details: error.message });
        }
    }

    /**
     * حذف خزينة (تعطيل)
     */
    async deleteTreasury(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            // التحقق من وجود حركات
            const transactionsCount = await prisma.treasuryTransaction.count({
                where: { treasuryId: Number(id) },
            });

            if (transactionsCount > 0) {
                // تعطيل بدلاً من الحذف
                await prisma.treasury.update({
                    where: { id: Number(id) },
                    data: { isActive: false },
                });
                return res.json({ message: 'تم تعطيل الخزينة (لا يمكن حذفها لوجود حركات)' });
            }

            await prisma.treasury.delete({
                where: { id: Number(id) },
            });

            return res.json({ message: 'تم حذف الخزينة بنجاح' });
        } catch (error: any) {
            console.error('Error deleting treasury:', error);
            return res.status(500).json({ error: 'فشل في حذف الخزينة', details: error.message });
        }
    }

    // ============== حركات الخزينة ==============

    /**
     * الحصول على حركات خزينة معينة
     */
    async getTreasuryTransactions(req: AuthRequest, res: Response) {
        try {
            const { treasuryId } = req.params;
            const { startDate, endDate, type, source, page = '1', limit = '50' } = req.query;

            const where: any = {
                treasuryId: Number(treasuryId),
            };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate as string);
                if (endDate) where.createdAt.lte = new Date(endDate as string);
            }

            if (type) where.type = type;
            if (source) where.source = source;

            const skip = (Number(page) - 1) * Number(limit);

            const [transactions, total] = await Promise.all([
                prisma.treasuryTransaction.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit),
                }),
                prisma.treasuryTransaction.count({ where }),
            ]);

            return res.json({
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            return res.status(500).json({ error: 'فشل في جلب الحركات', details: error.message });
        }
    }

    /**
     * الحصول على جميع الحركات (مع فلترة)
     */
    async getAllTransactions(req: AuthRequest, res: Response) {
        try {
            const { 
                treasuryId, 
                startDate, 
                endDate, 
                type, 
                source, 
                page = '1', 
                limit = '50' 
            } = req.query;

            const where: any = {};

            if (treasuryId) where.treasuryId = Number(treasuryId);

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate as string);
                if (endDate) where.createdAt.lte = new Date(endDate as string);
            }

            if (type) where.type = type;
            if (source) where.source = source;

            const skip = (Number(page) - 1) * Number(limit);

            const [transactions, total] = await Promise.all([
                prisma.treasuryTransaction.findMany({
                    where,
                    include: {
                        treasury: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                company: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit),
                }),
                prisma.treasuryTransaction.count({ where }),
            ]);

            return res.json({
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error('Error fetching all transactions:', error);
            return res.status(500).json({ error: 'فشل في جلب الحركات', details: error.message });
        }
    }

    /**
     * إنشاء حركة يدوية (إيداع أو سحب)
     */
    async createManualTransaction(req: AuthRequest, res: Response) {
        try {
            const { treasuryId, type, amount, description } = req.body;

            if (!treasuryId || !type || !amount) {
                return res.status(400).json({ error: 'الخزينة والنوع والمبلغ مطلوبون' });
            }

            if (type !== 'DEPOSIT' && type !== 'WITHDRAWAL') {
                return res.status(400).json({ error: 'نوع الحركة غير صالح' });
            }

            const amountDecimal = new Decimal(amount);

            // جلب الخزينة
            const treasury = await prisma.treasury.findUnique({
                where: { id: Number(treasuryId) },
            });

            if (!treasury) {
                return res.status(404).json({ error: 'الخزينة غير موجودة' });
            }

            if (!treasury.isActive) {
                return res.status(400).json({ error: 'الخزينة غير نشطة' });
            }

            // التحقق من الرصيد للسحب
            if (type === 'WITHDRAWAL' && treasury.balance.lessThan(amountDecimal)) {
                return res.status(400).json({ error: 'الرصيد غير كافٍ' });
            }

            // حساب الرصيد الجديد
            const balanceBefore = treasury.balance;
            const balanceAfter = type === 'DEPOSIT'
                ? balanceBefore.add(amountDecimal)
                : balanceBefore.sub(amountDecimal);

            // إنشاء الحركة وتحديث الرصيد في transaction
            const [transaction] = await prisma.$transaction([
                prisma.treasuryTransaction.create({
                    data: {
                        treasuryId: Number(treasuryId),
                        type: type as TransactionType,
                        source: TransactionSource.MANUAL,
                        amount: amountDecimal,
                        balanceBefore,
                        balanceAfter,
                        description,
                        createdBy: req.user?.UserID,
                    },
                }),
                prisma.treasury.update({
                    where: { id: Number(treasuryId) },
                    data: { balance: balanceAfter },
                }),
            ]);

            return res.status(201).json(transaction);
        } catch (error: any) {
            console.error('Error creating manual transaction:', error);
            return res.status(500).json({ error: 'فشل في إنشاء الحركة', details: error.message });
        }
    }

    /**
     * تحويل بين الخزائن
     */
    async transferBetweenTreasuries(req: AuthRequest, res: Response) {
        try {
            const { fromTreasuryId, toTreasuryId, amount, description } = req.body;

            if (!fromTreasuryId || !toTreasuryId || !amount) {
                return res.status(400).json({ error: 'الخزينة المصدر والوجهة والمبلغ مطلوبون' });
            }

            if (fromTreasuryId === toTreasuryId) {
                return res.status(400).json({ error: 'لا يمكن التحويل لنفس الخزينة' });
            }

            const amountDecimal = new Decimal(amount);

            // جلب الخزائن
            const [fromTreasury, toTreasury] = await Promise.all([
                prisma.treasury.findUnique({ where: { id: Number(fromTreasuryId) } }),
                prisma.treasury.findUnique({ where: { id: Number(toTreasuryId) } }),
            ]);

            if (!fromTreasury || !toTreasury) {
                return res.status(404).json({ error: 'إحدى الخزائن غير موجودة' });
            }

            if (!fromTreasury.isActive || !toTreasury.isActive) {
                return res.status(400).json({ error: 'إحدى الخزائن غير نشطة' });
            }

            // التحقق من الرصيد
            if (fromTreasury.balance.lessThan(amountDecimal)) {
                return res.status(400).json({ error: 'الرصيد غير كافٍ في الخزينة المصدر' });
            }

            // حساب الأرصدة
            const fromBalanceBefore = fromTreasury.balance;
            const fromBalanceAfter = fromBalanceBefore.sub(amountDecimal);
            const toBalanceBefore = toTreasury.balance;
            const toBalanceAfter = toBalanceBefore.add(amountDecimal);

            // تنفيذ التحويل
            const [outTransaction, inTransaction] = await prisma.$transaction([
                // حركة الخروج
                prisma.treasuryTransaction.create({
                    data: {
                        treasuryId: Number(fromTreasuryId),
                        type: TransactionType.TRANSFER,
                        source: TransactionSource.TRANSFER_OUT,
                        amount: amountDecimal,
                        balanceBefore: fromBalanceBefore,
                        balanceAfter: fromBalanceAfter,
                        description: description || `تحويل إلى ${toTreasury.name}`,
                        relatedTreasuryId: Number(toTreasuryId),
                        createdBy: req.user?.UserID,
                    },
                }),
                // حركة الدخول
                prisma.treasuryTransaction.create({
                    data: {
                        treasuryId: Number(toTreasuryId),
                        type: TransactionType.TRANSFER,
                        source: TransactionSource.TRANSFER_IN,
                        amount: amountDecimal,
                        balanceBefore: toBalanceBefore,
                        balanceAfter: toBalanceAfter,
                        description: description || `تحويل من ${fromTreasury.name}`,
                        relatedTreasuryId: Number(fromTreasuryId),
                        createdBy: req.user?.UserID,
                    },
                }),
                // تحديث رصيد الخزينة المصدر
                prisma.treasury.update({
                    where: { id: Number(fromTreasuryId) },
                    data: { balance: fromBalanceAfter },
                }),
                // تحديث رصيد الخزينة الوجهة
                prisma.treasury.update({
                    where: { id: Number(toTreasuryId) },
                    data: { balance: toBalanceAfter },
                }),
            ]);

            return res.status(201).json({
                message: 'تم التحويل بنجاح',
                outTransaction,
                inTransaction,
            });
        } catch (error: any) {
            console.error('Error transferring between treasuries:', error);
            return res.status(500).json({ error: 'فشل في التحويل', details: error.message });
        }
    }

    // ============== إحصائيات ==============

    /**
     * إحصائيات الخزائن
     */
    async getTreasuryStats(req: AuthRequest, res: Response) {
        try {
            const treasuries = await prisma.treasury.findMany({
                where: { isActive: true },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // حساب الإجماليات
            let totalCompanyBalance = new Decimal(0);
            let totalGeneralBalance = new Decimal(0);
            let totalBankBalance = new Decimal(0);

            const companyTreasuries: any[] = [];
            const generalTreasuries: any[] = [];
            const bankAccounts: any[] = [];

            treasuries.forEach(t => {
                if (t.type === 'COMPANY') {
                    totalCompanyBalance = totalCompanyBalance.add(t.balance);
                    companyTreasuries.push(t);
                } else if (t.type === 'GENERAL') {
                    totalGeneralBalance = totalGeneralBalance.add(t.balance);
                    generalTreasuries.push(t);
                } else if (t.type === 'BANK') {
                    totalBankBalance = totalBankBalance.add(t.balance);
                    bankAccounts.push(t);
                }
            });

            const totalBalance = totalCompanyBalance.add(totalGeneralBalance).add(totalBankBalance);

            return res.json({
                totalBalance: totalBalance.toNumber(),
                totalCompanyBalance: totalCompanyBalance.toNumber(),
                totalGeneralBalance: totalGeneralBalance.toNumber(),
                totalBankBalance: totalBankBalance.toNumber(),
                companyTreasuries,
                generalTreasuries,
                bankAccounts,
            });
        } catch (error: any) {
            console.error('Error fetching treasury stats:', error);
            return res.status(500).json({ error: 'فشل في جلب الإحصائيات', details: error.message });
        }
    }

    // ============== دوال مساعدة للاستخدام من controllers أخرى ==============

    /**
     * إضافة مبلغ للخزينة (من إيصال قبض)
     */
    static async addToTreasury(
        treasuryId: number,
        amount: number,
        source: TransactionSource,
        referenceType: string,
        referenceId: number,
        description: string,
        createdBy?: string
    ) {
        const amountDecimal = new Decimal(amount);

        const treasury = await prisma.treasury.findUnique({
            where: { id: treasuryId },
        });

        if (!treasury) {
            throw new Error('الخزينة غير موجودة');
        }

        const balanceBefore = treasury.balance;
        const balanceAfter = balanceBefore.add(amountDecimal);

        const [transaction] = await prisma.$transaction([
            prisma.treasuryTransaction.create({
                data: {
                    treasuryId,
                    type: TransactionType.DEPOSIT,
                    source,
                    amount: amountDecimal,
                    balanceBefore,
                    balanceAfter,
                    description,
                    referenceType,
                    referenceId,
                    createdBy,
                },
            }),
            prisma.treasury.update({
                where: { id: treasuryId },
                data: { balance: balanceAfter },
            }),
        ]);

        return transaction;
    }

    /**
     * سحب مبلغ من الخزينة (من إيصال صرف)
     */
    static async withdrawFromTreasury(
        treasuryId: number,
        amount: number,
        source: TransactionSource,
        referenceType: string,
        referenceId: number,
        description: string,
        createdBy?: string
    ) {
        const amountDecimal = new Decimal(amount);

        const treasury = await prisma.treasury.findUnique({
            where: { id: treasuryId },
        });

        if (!treasury) {
            throw new Error('الخزينة غير موجودة');
        }

        if (treasury.balance.lessThan(amountDecimal)) {
            throw new Error('الرصيد غير كافٍ');
        }

        const balanceBefore = treasury.balance;
        const balanceAfter = balanceBefore.sub(amountDecimal);

        const [transaction] = await prisma.$transaction([
            prisma.treasuryTransaction.create({
                data: {
                    treasuryId,
                    type: TransactionType.WITHDRAWAL,
                    source,
                    amount: amountDecimal,
                    balanceBefore,
                    balanceAfter,
                    description,
                    referenceType,
                    referenceId,
                    createdBy,
                },
            }),
            prisma.treasury.update({
                where: { id: treasuryId },
                data: { balance: balanceAfter },
            }),
        ]);

        return transaction;
    }
}

export default new TreasuryController();
export { TreasuryController };
