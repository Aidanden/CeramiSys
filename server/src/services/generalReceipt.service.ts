import { Prisma, TransactionType, TransactionSource } from '@prisma/client';
import prisma from '../models/prismaClient';

export interface CreateGeneralReceiptInput {
    contactId?: number;
    customerId?: number;
    supplierId?: number;
    employeeId?: number;
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

            // التحقق من وجود جهة واحدة على الأقل
            const hasTarget = data.contactId || data.customerId || data.supplierId || data.employeeId;
            if (!hasTarget) {
                throw new Error('يجب تحديد جهة الاتصال أو العميل أو المورد أو الموظف');
            }

            // التحقق من عدم تحديد أكثر من جهة واحدة
            const targetCount = [data.contactId, data.customerId, data.supplierId, data.employeeId].filter(Boolean).length;
            if (targetCount > 1) {
                throw new Error('لا يمكن تحديد أكثر من جهة واحدة');
            }

            // جلب بيانات الشخص لإضافتها في الوصف
            let personName = '';
            let personPhone = '';
            let personType = '';

            if (data.contactId) {
                const contact = await tx.financialContact.findUnique({
                    where: { id: data.contactId }
                });
                if (contact) {
                    personName = contact.name;
                    personPhone = contact.phone || '';
                    personType = 'جهة اتصال';
                }
            } else if (data.customerId) {
                const customer = await tx.customer.findUnique({
                    where: { id: data.customerId }
                });
                if (customer) {
                    personName = customer.name;
                    personPhone = customer.phone || '';
                    personType = 'عميل';
                }
            } else if (data.supplierId) {
                const supplier = await tx.supplier.findUnique({
                    where: { id: data.supplierId }
                });
                if (supplier) {
                    personName = supplier.name;
                    personPhone = supplier.phone || '';
                    personType = 'مورد';
                }
            } else if (data.employeeId) {
                const employee = await tx.employee.findUnique({
                    where: { id: data.employeeId }
                });
                if (employee) {
                    personName = employee.name;
                    personPhone = employee.phone || '';
                    personType = 'موظف';
                }
            }

            // بناء الوصف الشامل
            let treasuryDescription = `إيصال خارجي (${data.type === 'DEPOSIT' ? 'قبض' : 'صرف'})`;
            treasuryDescription += ` - ${personType}: ${personName}`;
            if (personPhone) {
                treasuryDescription += ` - هاتف: ${personPhone}`;
            }
            if (data.description) {
                treasuryDescription += ` - ${data.description}`;
            }

            // 1. إنشاء الإيصال
            const receipt = await tx.generalReceipt.create({
                data: {
                    contactId: data.contactId,
                    customerId: data.customerId,
                    supplierId: data.supplierId,
                    employeeId: data.employeeId,
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
                // إذا كان الرصيد غير كافٍ، سيتم الخصم ويصبح الرصيد سالباً
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
                    description: treasuryDescription,
                    referenceType: 'GeneralReceipt',
                    referenceId: receipt.id,
                    createdBy: data.createdBy
                }
            });

            await tx.treasury.update({
                where: { id: data.treasuryId },
                data: { balance: balanceAfter }
            });

            // 3. تحديث كشف الحساب حسب نوع الجهة
            
            if (data.contactId) {
                // تحديث كشف حساب جهة الاتصال العامة
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
                        description: data.description || (data.type === 'DEPOSIT' ? 'إيصال قبض خارجي' : 'إيصال صرف خارجي'),
                        transactionDate: data.paymentDate || new Date(),
                    }
                });
            }

            if (data.customerId) {
                // تحديث كشف حساب العميل
                const CustomerAccountService = (await import('./CustomerAccountService')).default;
                
                // DEPOSIT (قبض من العميل) => العميل يسدد دين (CREDIT - له)
                // WITHDRAWAL (صرف للعميل) => العميل يستدين (DEBIT - عليه)
                const transactionType = data.type === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';
                
                await CustomerAccountService.createAccountEntry({
                    customerId: data.customerId,
                    transactionType: transactionType as any,
                    amount: data.amount,
                    referenceType: 'GENERAL_RECEIPT' as any,
                    referenceId: receipt.id,
                    description: data.description || (data.type === 'DEPOSIT' ? 'إيصال قبض خارجي' : 'إيصال صرف خارجي'),
                    transactionDate: data.paymentDate || new Date()
                });
            }

            if (data.supplierId) {
                // تحديث كشف حساب المورد
                const SupplierAccountService = (await import('./SupplierAccountService')).default;
                
                // DEPOSIT (قبض من المورد) => المورد يسدد دين (DEBIT - له/يصبح أقل مديونية)
                // WITHDRAWAL (صرف للمورد) => المورد ندفع له دين (CREDIT - عليه/نسدد له)
                const transactionType = data.type === 'DEPOSIT' ? 'DEBIT' : 'CREDIT';
                
                await SupplierAccountService.createAccountEntry({
                    supplierId: data.supplierId,
                    transactionType: transactionType as any,
                    amount: data.amount,
                    referenceType: 'GENERAL_RECEIPT' as any,
                    referenceId: receipt.id,
                    description: data.description || (data.type === 'DEPOSIT' ? 'إيصال قبض خارجي' : 'إيصال صرف خارجي'),
                    transactionDate: data.paymentDate || new Date()
                });
            }

            if (data.employeeId) {
                // للموظفين: نسجل في ملاحظات فقط (لا يوجد نظام كشف حساب للموظفين حالياً)
                // يمكن تطويره لاحقاً إذا لزم الأمر
                // في معظم الأحيان الإيصالات للموظفين تكون سلف أو مكافآت خارج نظام الرواتب
            }

            return receipt;
        });
    }

    async getAllReceipts(filters: {
        contactId?: number;
        customerId?: number;
        supplierId?: number;
        employeeId?: number;
        treasuryId?: number;
        startDate?: Date;
        endDate?: Date;
        type?: TransactionType;
    }) {
        return prisma.generalReceipt.findMany({
            where: {
                contactId: filters.contactId,
                customerId: filters.customerId,
                supplierId: filters.supplierId,
                employeeId: filters.employeeId,
                treasuryId: filters.treasuryId,
                type: filters.type,
                paymentDate: {
                    gte: filters.startDate,
                    lte: filters.endDate
                }
            },
            include: {
                contact: true,
                customer: true,
                supplier: true,
                employee: true
            },
            orderBy: { paymentDate: 'desc' }
        });
    }

    async getReceiptById(id: number) {
        return prisma.generalReceipt.findUnique({
            where: { id },
            include: {
                contact: true,
                customer: true,
                supplier: true,
                employee: true
            }
        });
    }
}

export default new GeneralReceiptService();
