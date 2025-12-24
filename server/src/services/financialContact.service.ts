import prisma from '../models/prismaClient';

export interface CreateFinancialContactInput {
    name: string;
    phone?: string;
    note?: string;
}

class FinancialContactService {
    async getAllContacts() {
        return prisma.financialContact.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { generalReceipts: true }
                }
            }
        });
    }

    async getContactById(id: number) {
        const contact = await prisma.financialContact.findUnique({
            where: { id },
            include: {
                accountEntries: {
                    orderBy: { transactionDate: 'desc' },
                    take: 50
                }
            }
        });

        if (!contact) throw new Error('جهة الاتصال غير موجودة');

        // حساب الرصيد الحالي
        const lastEntry = await prisma.financialContactAccount.findFirst({
            where: { contactId: id },
            orderBy: { createdAt: 'desc' }
        });

        const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;

        return {
            ...contact,
            currentBalance
        };
    }

    async createContact(data: CreateFinancialContactInput) {
        return prisma.financialContact.create({
            data
        });
    }

    async updateContact(id: number, data: Partial<CreateFinancialContactInput>) {
        return prisma.financialContact.update({
            where: { id },
            data
        });
    }

    async getStatement(id: number, startDate?: Date, endDate?: Date) {
        return prisma.financialContactAccount.findMany({
            where: {
                contactId: id,
                transactionDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { transactionDate: 'desc' }
        });
    }
}

export default new FinancialContactService();
