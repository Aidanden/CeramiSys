import { Prisma, OpeningBalanceType } from '@prisma/client';
import prisma from '../models/prismaClient';
import CustomerAccountService from './CustomerAccountService';
import SupplierAccountService from './SupplierAccountService';

interface CreateOpeningBalanceInput {
  customerId?: number;
  supplierId?: number;
  amount: number;
  transactionType: OpeningBalanceType;
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
      const openingBalance = await tx.openingBalance.create({
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
          referenceType: 'OPENING_BALANCE',
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
          referenceType: 'OPENING_BALANCE',
          referenceId: openingBalance.id,
          description: description || `رصيد مرحل من النظام السابق${previousSystemRef ? ` (مرجع: ${previousSystemRef})` : ''}`,
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
    return prisma.openingBalance.findMany({
      where: { customerId },
      orderBy: { transactionDate: 'desc' }
    });
  }

  /**
   * جلب الأرصدة الافتتاحية لمورد
   */
  async getSupplierOpeningBalances(supplierId: number) {
    return prisma.openingBalance.findMany({
      where: { supplierId },
      orderBy: { transactionDate: 'desc' }
    });
  }
}

export default new OpeningBalanceService();
