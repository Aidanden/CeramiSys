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
   * جلب حساب عميل معين مع كل المعاملات
   * Get customer account with all transactions
   */
  async getCustomerAccount(customerId: number) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new Error('العميل غير موجود');
    }

    const entries = await prisma.customerAccount.findMany({
      where: { customerId },
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: true
      }
    });

    // الرصيد الحالي = آخر رصيد مسجل
    // Current balance = last recorded balance
    const currentBalance = entries.length > 0 && entries[0] ? Number(entries[0].balance) : 0;

    // إحصائيات
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
   * جلب الفواتير المفتوحة (غير المسددة بالكامل) لعميل معين
   * Get open (unpaid) invoices for a customer
   */
  async getCustomerOpenInvoices(customerId: number) {
    const openInvoices = await prisma.sale.findMany({
      where: {
        customerId: customerId,
        status: 'APPROVED',
        isFullyPaid: false,
        saleType: 'CREDIT'
      },
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


