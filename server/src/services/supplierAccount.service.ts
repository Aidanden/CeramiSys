import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export class SupplierAccountService {
  // جلب ملخص جميع حسابات الموردين
  async getAllSuppliersAccountSummary(): Promise<SupplierAccountSummary[]> {
    try {
      // جلب جميع الموردين مع حساباتهم
      const suppliers = await prisma.supplier.findMany({
        include: {
          accountEntries: {
            orderBy: { createdAt: 'desc' },
            take: 1, // آخر حركة للحصول على الرصيد الحالي
          },
        },
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
    } catch (error) {
      console.error('خطأ في جلب ملخص حسابات الموردين:', error);
      throw error;
    }
  }

  // جلب تفاصيل حساب مورد واحد
  async getSupplierAccount(supplierId: number): Promise<SupplierAccount | null> {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
          accountEntries: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!supplier) {
        return null;
      }

      // حساب الإجماليات
      const totalDebit = supplier.accountEntries
        .filter(entry => entry.transactionType === 'DEBIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const totalCredit = supplier.accountEntries
        .filter(entry => entry.transactionType === 'CREDIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const lastEntry = supplier.accountEntries[0];
      const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;

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
        totalDebit,
        totalCredit,
        entries: supplier.accountEntries.map(entry => ({
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
        })),
      };
    } catch (error) {
      console.error('خطأ في جلب حساب المورد:', error);
      throw error;
    }
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
