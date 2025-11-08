import { PrismaClient, SupplierTransactionType, SupplierReferenceType } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateSupplierAccountEntryInput {
  supplierId: number;
  transactionType: SupplierTransactionType;
  amount: number;
  referenceType: SupplierReferenceType;
  referenceId: number;
  description?: string;
  transactionDate?: Date;
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
  async getSupplierAccount(supplierId: number) {
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
      supplier,
      currentBalance,
      totalCredit,
      totalDebit,
      entries: entries.map(entry => ({
        ...entry,
        amount: Number(entry.amount),
        balance: Number(entry.balance)
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
  async getAllSuppliersAccountSummary() {
    const suppliers = await prisma.supplier.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return suppliers.map(supplier => {
      const currentBalance = supplier.accountEntries.length > 0 && supplier.accountEntries[0]
        ? Number(supplier.accountEntries[0].balance) 
        : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        currentBalance,
        hasDebt: currentBalance > 0 // رصيد موجب يعني علينا للمورد
      };
    });
  }
}

export default new SupplierAccountService();

