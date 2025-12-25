import prisma from '../models/prismaClient';

export interface CreateFinancialContactInput {
    name: string;
    phone?: string;
    note?: string;
}

class FinancialContactService {
    async getAllContacts() {
        const contacts = await prisma.financialContact.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                accountEntries: {
                    orderBy: { transactionDate: 'desc' },
                }
            }
        });

        return contacts.map(c => {
            const totalDeposit = c.accountEntries
                .filter(e => e.transactionType === 'DEPOSIT')
                .reduce((sum, e) => sum + Number(e.amount), 0);
            const totalWithdrawal = c.accountEntries
                .filter(e => e.transactionType === 'WITHDRAWAL')
                .reduce((sum, e) => sum + Number(e.amount), 0);

            // الرصيد هو الفرق بين المقبوضات والمدفوعات
            const currentBalance = totalDeposit - totalWithdrawal;

            return {
                ...c,
                totalDeposit,
                totalWithdrawal,
                currentBalance,
                accountEntries: c.accountEntries.slice(0, 5) // إرجاع آخر 5 حركات فقط لتوفير البيانات
            };
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
