import { SupplierTransactionType, SupplierReferenceType } from '@prisma/client';
import prisma from '../models/prismaClient';

interface CreateSupplierAccountEntryInput {
  supplierId: number;
  transactionType: SupplierTransactionType;
  amount: number;
  referenceType: SupplierReferenceType;
  referenceId: number;
  description?: string;
  transactionDate?: Date;
}

export interface SupplierAccountEntry {
  id: number;
  supplierId: number;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  referenceType: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
  referenceId: number;
  description?: string;
  transactionDate: Date;
  createdAt: Date;
  supplier: {
    id: number;
    name: string;
    phone?: string;
  };
}

export interface SupplierAccount {
  supplier: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    note?: string;
    createdAt: Date;
  };
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: SupplierAccountEntry[];
}

export interface SupplierAccountSummary {
  id: number;
  name: string;
  phone?: string;
  currentBalance: number;
  hasDebt: boolean;
}

export interface OpenPurchase {
  id: number;
  invoiceNumber?: string;
  companyId: number;
  company: {
    id: number;
    name: string;
  };
  total: number;
  paidAmount: number;
  remainingAmount: number;
  purchaseType: 'CASH' | 'CREDIT';
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  createdAt: Date;
}

class SupplierAccountService {
  /**
   * إنشاء قيد في حساب المورد
   * Create an entry in supplier account
   */
  async createAccountEntry(data: CreateSupplierAccountEntryInput) {
    const { supplierId, transactionType, amount, referenceType, referenceId, description, transactionDate } = data;

    // جلب آخر رصيد للمورد
    // Get the latest balance for the supplier
    const lastEntry = await prisma.supplierAccount.findFirst({
      where: { supplierId },
      orderBy: { createdAt: 'desc' }
    });

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;

    // حساب الرصيد الجديد
    // Calculate new balance
    // CREDIT (له المورد) = زيادة في الدين على الشركة للمورد (شراء)
    // DEBIT (عليه المورد) = تخفيض من الدين (دفع للمورد)
    let newBalance: number;
    if (transactionType === 'CREDIT') {
      newBalance = previousBalance + amount;
    } else {
      newBalance = previousBalance - amount;
    }

    // إنشاء القيد
    // Create the entry
    const entry = await prisma.supplierAccount.create({
      data: {
        supplierId,
        transactionType,
        amount,
        balance: newBalance,
        referenceType,
        referenceId,
        description,
        transactionDate: transactionDate || new Date()
      },
      include: {
        supplier: true
      }
    });

    return entry;
  }

  /**
   * جلب حساب مورد معين مع كل المعاملات
   * Get supplier account with all transactions
   */
  async getSupplierAccount(supplierId: number): Promise<SupplierAccount | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      throw new Error('المورد غير موجود');
    }

    const entries = await prisma.supplierAccount.findMany({
      where: { supplierId },
      orderBy: { transactionDate: 'desc' },
      include: {
        supplier: true
      }
    });

    // الرصيد الحالي = آخر رصيد مسجل
    // Current balance = last recorded balance
    const currentBalance = entries.length > 0 && entries[0] ? Number(entries[0].balance) : 0;

    // إحصائيات
    const totalCredit = entries
      .filter(e => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalDebit = entries
      .filter(e => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone || undefined,
        email: supplier.email || undefined,
        address: supplier.address || undefined,
        note: supplier.note || undefined,
        createdAt: supplier.createdAt,
      },
      currentBalance,
      totalCredit,
      totalDebit,
      entries: entries.map(entry => ({
        id: entry.id,
        supplierId: entry.supplierId,
        transactionType: entry.transactionType as 'DEBIT' | 'CREDIT',
        amount: Number(entry.amount),
        balance: Number(entry.balance),
        referenceType: entry.referenceType as 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN',
        referenceId: entry.referenceId,
        description: entry.description || undefined,
        transactionDate: entry.transactionDate,
        createdAt: entry.createdAt,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone || undefined,
        },
      }))
    };
  }

  /**
   * جلب الرصيد الحالي لمورد
   * Get current balance for a supplier
   */
  async getCurrentBalance(supplierId: number): Promise<number> {
    const lastEntry = await prisma.supplierAccount.findFirst({
      where: { supplierId },
      orderBy: { createdAt: 'desc' }
    });

    return lastEntry ? Number(lastEntry.balance) : 0;
  }

  /**
   * جلب ملخص حسابات جميع الموردين
   * Get summary of all supplier accounts
   */
  async getAllSuppliersAccountSummary(): Promise<SupplierAccountSummary[]> {
    const suppliers = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return suppliers.map(supplier => {
      const lastEntry = supplier.accountEntries[0];
      const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone || undefined,
        currentBalance,
        hasDebt: currentBalance !== 0,
      };
    });
  }

  // جلب المشتريات المفتوحة للمورد
  async getSupplierOpenPurchases(supplierId: number): Promise<OpenPurchase[]> {
    try {
      const purchases = await prisma.purchase.findMany({
        where: {
          supplierId,
          remainingAmount: {
            gt: 0, // المشتريات التي لها مبلغ متبقي
          },
          status: 'APPROVED', // فقط المشتريات المعتمدة
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return purchases.map(purchase => ({
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber || undefined,
        companyId: purchase.companyId,
        company: {
          id: purchase.company.id,
          name: purchase.company.name,
        },
        total: Number(purchase.total),
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        purchaseType: purchase.purchaseType as 'CASH' | 'CREDIT',
        status: purchase.status as 'DRAFT' | 'APPROVED' | 'CANCELLED',
        createdAt: purchase.createdAt,
      }));
    } catch (error) {
      console.error('خطأ في جلب المشتريات المفتوحة:', error);
      throw error;
    }
  }
}

export default new SupplierAccountService();

