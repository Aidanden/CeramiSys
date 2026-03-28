import { Prisma } from '@prisma/client';
import prisma from '../models/prismaClient';
import CustomerAccountService from './CustomerAccountService';
import SupplierAccountService from './SupplierAccountService';

// Workaround for Prisma out-of-sync types
type OpeningBalanceTypeWorkaround = 'DEBIT' | 'CREDIT';

interface CreateOpeningBalanceInput {
  customerId?: number;
  supplierId?: number;
  amount: number;
  transactionType: OpeningBalanceTypeWorkaround;
  transactionDate?: Date;
  description?: string;
  previousSystemRef?: string;
  companyId?: number;
  currency?: string;
}

class OpeningBalanceService {
  /**
   * إضافة رصيد افتتاحي / دين مرحل
   */
  async createOpeningBalance(data: CreateOpeningBalanceInput) {
    const { 
      customerId, 
      supplierId, 
      amount, 
      transactionType, 
      transactionDate, 
      description, 
      previousSystemRef,
      companyId,
      currency
    } = data;

    if (!customerId && !supplierId) {
      throw new Error('يجب تحديد العميل أو المورد');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. إنشاء سجل الرصيد الافتتاحي
      // Using any as a workaround for Prisma generation sync issues
      const openingBalance = await (tx as any).openingBalance.create({
        data: {
          customerId,
          supplierId,
          amount: new Prisma.Decimal(amount),
          currency: currency || "LYD",
          transactionType,
          transactionDate: transactionDate || new Date(),
          description,
          previousSystemRef,
          companyId
        }
      });

      // 2. تحديث كشف الحساب
      if (customerId) {
        await CustomerAccountService.createAccountEntry({
          customerId,
          transactionType: transactionType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
          amount,
          referenceType: 'OPENING_BALANCE' as any,
          referenceId: openingBalance.id,
          description: description || `رصيد مرحل من النظام السابق${previousSystemRef ? ` (مرجع: ${previousSystemRef})` : ''}`,
          transactionDate: transactionDate || new Date()
        }, tx);
      } else if (supplierId) {
        await SupplierAccountService.createAccountEntry({
          supplierId,
          transactionType: transactionType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
          amount,
          currency: currency || "LYD",
          referenceType: 'OPENING_BALANCE' as any,
          referenceId: openingBalance.id,
          description: description || `رصيد مرحل من النظام السابق`,
          transactionDate: transactionDate || new Date()
        }, tx);
      }

      return openingBalance;
    });
  }

  /**
   * جلب الأرصدة الافتتاحية لعميل
   */
  async getCustomerOpeningBalances(customerId: number) {
    return (prisma as any).openingBalance.findMany({
      where: { customerId },
      orderBy: { transactionDate: 'desc' }
    });
  }

  /**
   * جلب الأرصدة الافتتاحية لمورد
   */
  async getSupplierOpeningBalances(supplierId: number) {
    return (prisma as any).openingBalance.findMany({
      where: { supplierId },
      orderBy: { transactionDate: 'desc' }
    });
  }

  /**
   * تسوية رصيد افتتاحي لمورد (دفع)
   */
  async settleSupplierOpeningBalance(data: {
    supplierId: number;
    amount: number; // المبلغ بالدينار الليبي (الذي سيخصم من الخزينة)
    amountForeign?: number; // المبلغ بالعملة الأجنبية (الذي سيخصم من رصيد المورد)
    currency: string;
    exchangeRate: number;
    treasuryId: number;
    companyId: number;
    description?: string;
    notes?: string;
  }) {
    const { 
      supplierId, 
      amount, 
      amountForeign, 
      currency, 
      exchangeRate, 
      treasuryId, 
      companyId, 
      description, 
      notes 
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. إنشاء إيصال دفع (SupplierPaymentReceipt) لتوثيق العملية
      const receipt = await tx.supplierPaymentReceipt.create({
        data: {
          supplierId,
          companyId,
          amount: new Prisma.Decimal(amount),
          amountForeign: amountForeign ? new Prisma.Decimal(amountForeign) : null,
          currency: currency,
          exchangeRate: new Prisma.Decimal(exchangeRate),
          type: 'EXPENSE' as any, // نستخدم EXPENSE كنوع افتراضي للتسويات
          status: 'PAID',
          paidAt: new Date(),
          description: description || 'تسوية رصيد مرحل',
          notes: notes
        }
      });

      // 2. تحديث كشف الحساب (DEBIT) بالعملة الأصلية للمورد
      // المبلغ الذي سيخصم من حساب المورد هو المبلغ بالعملة التي تم اختيارها (سواء LYD أو غيرها)
      const ledgerAmount = currency === 'LYD' ? amount : (amountForeign || 0);

      await SupplierAccountService.createAccountEntry({
        supplierId,
        transactionType: 'DEBIT',
        amount: ledgerAmount,
        currency: currency,
        referenceType: 'PAYMENT' as any,
        referenceId: receipt.id,
        description: description || `تسوية رصيد مرحل - إيصال رقم ${receipt.id}`,
        transactionDate: new Date()
      }, tx);

      // 3. الخصم من الخزينة (بالدينار الليبي دائماً لأن حركات الخزينة في النظام بالدينار)
      const treasury = await tx.treasury.findUnique({ where: { id: treasuryId } });
      if (!treasury) throw new Error('الخزينة غير موجودة');

      const balanceBefore = Number(treasury.balance);
      const balanceAfter = balanceBefore - amount;

      let movementDesc = `تسوية رصيد مرحل للمورد - ${description || `إيصال رقم ${receipt.id}`}`;
      if (currency !== 'LYD' && amountForeign) {
        movementDesc += ` [${amountForeign.toFixed(2)} ${currency} @ ${exchangeRate.toFixed(4)}]`;
      }

      await tx.treasuryTransaction.create({
        data: {
          treasuryId,
          type: 'WITHDRAWAL',
          source: 'PAYMENT',
          amount: new Prisma.Decimal(amount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          description: movementDesc,
          referenceType: 'SupplierPaymentReceipt',
          referenceId: receipt.id,
        }
      });

      await tx.treasury.update({
        where: { id: treasuryId },
        data: { balance: new Prisma.Decimal(balanceAfter) }
      });

      return receipt;
    });
  }

  /**
   * تسوية رصيد افتتاحي لعميل (قبض)
   */
  async settleCustomerOpeningBalance(data: {
    customerId: number;
    amount: number;
    treasuryId: number;
    companyId: number;
    description?: string;
    notes?: string;
  }) {
    const { customerId, amount, treasuryId, companyId, description, notes } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. إنشاء إيصال قبض (GeneralReceipt) لتوثيق العملية
      const receipt = await (tx.generalReceipt as any).create({
        data: {
          customer: { connect: { id: customerId } },
          treasuryId: treasuryId,
          amount: new Prisma.Decimal(amount),
          type: 'DEPOSIT',
          description: description || 'تسوية رصيد مرحل (قبض)',
          notes: notes,
          paymentDate: new Date()
        }
      });

      // 2. تحديث كشف الحساب (CREDIT) للعميل لتخفيض المديونية
      await CustomerAccountService.createAccountEntry({
        customerId,
        transactionType: 'CREDIT',
        amount,
        referenceType: 'GENERAL_RECEIPT' as any,
        referenceId: receipt.id,
        description: description || `تسوية رصيد مرحل - إيصال قبض رقم ${receipt.id}`,
        transactionDate: new Date()
      }, tx);

      // 3. الإيداع في الخزينة
      const treasury = await tx.treasury.findUnique({ where: { id: treasuryId } });
      if (!treasury) throw new Error('الخزينة غير موجودة');

      const balanceBefore = Number(treasury.balance);
      const balanceAfter = balanceBefore + amount;

      await tx.treasuryTransaction.create({
        data: {
          treasuryId,
          type: 'DEPOSIT',
          source: 'GENERAL_RECEIPT',
          amount: new Prisma.Decimal(amount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          description: `تسوية رصيد مرحل للعميل - ${description || `إيصال رقم ${receipt.id}`}`,
          referenceType: 'GeneralReceipt',
          referenceId: receipt.id,
        }
      });

      await tx.treasury.update({
        where: { id: treasuryId },
        data: { balance: new Prisma.Decimal(balanceAfter) }
      });

      return receipt;
    });
  }
}

export default new OpeningBalanceService();
