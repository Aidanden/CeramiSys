import { Prisma, TransactionType, TransactionSource } from '@prisma/client';
import prisma from '../models/prismaClient';

export interface CreateGeneralReceiptInput {
    contactId: number;
    treasuryId: number;
    type: TransactionType; // DEPOSIT (قبض) or WITHDRAWAL (صرف)
    amount: number;
    description?: string;
    notes?: string;
    paymentDate?: Date;
    createdBy?: string;
}

class GeneralReceiptService {
    async createReceipt(data: CreateGeneralReceiptInput) {
        return await prisma.$transaction(async (tx) => {
            const amountDecimal = new Prisma.Decimal(data.amount);

            // 1. إنشاء الإيصال
            const receipt = await tx.generalReceipt.create({
                data: {
                    contactId: data.contactId,
                    treasuryId: data.treasuryId,
                    type: data.type,
                    amount: amountDecimal,
                    description: data.description,
                    notes: data.notes,
                    paymentDate: data.paymentDate || new Date(),
                    createdBy: data.createdBy,
                }
            });

            // 2. تحديث الخزينة وتسجيل الحركة
            const treasury = await tx.treasury.findUnique({
                where: { id: data.treasuryId }
            });

            if (!treasury) throw new Error('الخزينة غير موجودة');

            const balanceBefore = treasury.balance;
            let balanceAfter: Prisma.Decimal;

            if (data.type === 'DEPOSIT') {
                balanceAfter = balanceBefore.plus(amountDecimal);
            } else {
                if (balanceBefore.lessThan(amountDecimal)) {
                    console.warn('رصيد الخزينة غير كافٍ، سيتم الخصم ويصبح الرصيد سالباً');
                }
                balanceAfter = balanceBefore.minus(amountDecimal);
            }

            await tx.treasuryTransaction.create({
                data: {
                    treasuryId: data.treasuryId,
                    type: data.type,
                    source: 'GENERAL_RECEIPT',
                    amount: amountDecimal,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter,
                    description: `إيصال عام (${data.type === 'DEPOSIT' ? 'قبض' : 'صرف'}) - ${data.description || ''}`,
                    referenceType: 'GeneralReceipt',
                    referenceId: receipt.id,
                    createdBy: data.createdBy
                }
            });

            await tx.treasury.update({
                where: { id: data.treasuryId },
                data: { balance: balanceAfter }
            });

            // 3. تحديث كشف حساب جهة الاتصال
            // DEPOSIT (قبض من الشخص) => الشخص "له" (CREDIT في المحاسبة التقليدية، سنستخدم DEPOSIT/WITHDRAWAL حسب نوع الحركة)
            // ملاحظة: TransactionType هو DEPOSIT/WITHDRAWAL

            const lastContactEntry = await tx.financialContactAccount.findFirst({
                where: { contactId: data.contactId },
                orderBy: { createdAt: 'desc' }
            });

            const previousContactBalance = lastContactEntry ? Number(lastContactEntry.balance) : 0;

            // إذا قبضنا منه (DEPOSIT بالخزينة) -> يزيد رصيده (يصبح دائناً لنا/له مال) -> نزيد الرصيد
            // إذا صرفنا له (WITHDRAWAL بالخزينة) -> ينقص رصيده (يصبح مديناً لنا/عليه مال) -> ننقص الرصيد
            let newContactBalance: number;
            if (data.type === 'DEPOSIT') {
                newContactBalance = previousContactBalance + data.amount;
            } else {
                newContactBalance = previousContactBalance - data.amount;
            }

            await tx.financialContactAccount.create({
                data: {
                    contactId: data.contactId,
                    transactionType: data.type,
                    amount: amountDecimal,
                    balance: new Prisma.Decimal(newContactBalance),
                    referenceType: 'GENERAL_RECEIPT',
                    referenceId: receipt.id,
                    description: data.description || (data.type === 'DEPOSIT' ? 'إيصال قبض' : 'إيصال صرف'),
                    transactionDate: data.paymentDate || new Date(),
                }
            });

            return receipt;
        });
    }

    async getAllReceipts(filters: {
        contactId?: number;
        treasuryId?: number;
        startDate?: Date;
        endDate?: Date;
        type?: TransactionType;
    }) {
        return prisma.generalReceipt.findMany({
            where: {
                contactId: filters.contactId,
                treasuryId: filters.treasuryId,
                type: filters.type,
                paymentDate: {
                    gte: filters.startDate,
                    lte: filters.endDate
                }
            },
            include: {
                contact: true
            },
            orderBy: { paymentDate: 'desc' }
        });
    }

    async getReceiptById(id: number) {
        return prisma.generalReceipt.findUnique({
            where: { id },
            include: {
                contact: true
            }
        });
    }
}

export default new GeneralReceiptService();
