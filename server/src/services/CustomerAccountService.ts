import { CustomerTransactionType, CustomerReferenceType } from '@prisma/client';
import prisma from '../models/prismaClient';

interface CreateCustomerAccountEntryInput {
  customerId: number;
  transactionType: CustomerTransactionType;
  amount: number;
  referenceType: CustomerReferenceType;
  referenceId: number;
  description?: string;
  transactionDate?: Date;
}

class CustomerAccountService {
  /**
   * إنشاء قيد في حساب العميل
   * Create an entry in customer account
   */
  async createAccountEntry(data: CreateCustomerAccountEntryInput) {
    const { customerId, transactionType, amount, referenceType, referenceId, description, transactionDate } = data;

    // جلب آخر رصيد للعميل
    // Get the latest balance for the customer
    const lastEntry = await prisma.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;

    // حساب الرصيد الجديد
    // Calculate new balance
    // DEBIT (عليه) = زيادة في الدين على العميل
    // CREDIT (له) = تخفيض من الدين (دفع)
    let newBalance: number;
    if (transactionType === 'DEBIT') {
      newBalance = previousBalance + amount;
    } else {
      newBalance = previousBalance - amount;
    }

    // إنشاء القيد
    // Create the entry
    const entry = await prisma.customerAccount.create({
      data: {
        customerId,
        transactionType,
        amount,
        balance: newBalance,
        referenceType,
        referenceId,
        description,
        transactionDate: transactionDate || new Date()
      },
      include: {
        customer: true
      }
    });

    return entry;
  }

  /**
   * جلب حساب عميل معين مع كل المعاملات مع دعم الفلترة بالتاريخ
   * Get customer account with all transactions with date filtering support
   */
  async getCustomerAccount(customerId: number, startDate?: string, endDate?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('العميل غير موجود');
    }

    // بناء فلتر التاريخ
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // إضافة يوم واحد لتضمين نهاية اليوم
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      dateFilter.lt = endDateObj;
    }

    const whereClause: any = { customerId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.transactionDate = dateFilter;
    }

    const entries = await prisma.customerAccount.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: true
      }
    });

    // جلب آخر رصيد كلي للعميل (بدون فلترة)
    const lastEntry = await prisma.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    // الرصيد الحالي الكلي = آخر رصيد مسجل
    const currentBalance = lastEntry ? Number(lastEntry.balance) : 0;

    // إحصائيات للفترة المحددة فقط
    const totalDebit = entries
      .filter(e => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalCredit = entries
      .filter(e => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      customer,
      currentBalance,
      totalDebit,
      totalCredit,
      entries: entries.map(entry => ({
        ...entry,
        amount: Number(entry.amount),
        balance: Number(entry.balance)
      }))
    };
  }

  /**
   * جلب الرصيد الحالي لعميل
   * Get current balance for a customer
   */
  async getCurrentBalance(customerId: number): Promise<number> {
    const lastEntry = await prisma.customerAccount.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' }
    });

    return lastEntry ? Number(lastEntry.balance) : 0;
  }

  /**
   * جلب الفواتير المفتوحة (غير المسددة بالكامل) لعميل معين مع دعم الفلترة بالتاريخ
   * Get open (unpaid) invoices for a customer with date filtering support
   */
  async getCustomerOpenInvoices(customerId: number, startDate?: string, endDate?: string) {
    // بناء فلتر التاريخ
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // إضافة يوم واحد لتضمين نهاية اليوم
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      dateFilter.lt = endDateObj;
    }

    const whereClause: any = {
      customerId: customerId,
      status: 'APPROVED',
      isFullyPaid: false,
      saleType: 'CREDIT'
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    const openInvoices = await prisma.sale.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        },
        customer: {
          select: { id: true, name: true, phone: true }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return openInvoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      company: invoice.company,
      customer: invoice.customer,
      total: Number(invoice.total),
      paidAmount: Number(invoice.paidAmount),
      remainingAmount: Number(invoice.remainingAmount),
      isFullyPaid: invoice.isFullyPaid,
      createdAt: invoice.createdAt,
      approvedAt: invoice.approvedAt,
      payments: invoice.payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        receiptNumber: p.receiptNumber
      }))
    }));
  }

  /**
   * جلب ملخص حسابات جميع العملاء
   * Get summary of all customer accounts
   */
  async getAllCustomersAccountSummary() {
    const customers = await prisma.customer.findMany({
      include: {
        accountEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return customers.map(customer => {
      const currentBalance = customer.accountEntries.length > 0 && customer.accountEntries[0]
        ? Number(customer.accountEntries[0].balance)
        : 0;

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        currentBalance,
        hasDebt: currentBalance > 0
      };
    });
  }
}

export default new CustomerAccountService();


