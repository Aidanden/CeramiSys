import { EmployeeTransactionType, EmployeeReferenceType } from '@prisma/client';
import prisma from '../models/prismaClient';

interface CreateEmployeeAccountEntryInput {
  employeeId: number;
  transactionType: EmployeeTransactionType;
  amount: number;
  referenceType: EmployeeReferenceType;
  referenceId: number;
  description?: string;
  transactionDate?: Date;
}

class EmployeeAccountService {
  /**
   * إنشاء قيد في حساب الموظف
   * Create an entry in employee account
   */
  async createAccountEntry(data: CreateEmployeeAccountEntryInput, txClient?: any) {
    const client = txClient || prisma;
    const { employeeId, transactionType, amount, referenceType, referenceId, description, transactionDate } = data;

    // جلب آخر رصيد للموظف
    // Get the latest balance for the employee
    const lastEntry = await client.employeeAccount.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;

    // حساب الرصيد الجديد
    // Calculate new balance
    // DEBIT (مدين) = سلفة أو مبلغ مستحق للموظف (يزيد رصيده الإيجابي)
    // CREDIT (دائن) = دفع أو استقطاع (يخفض رصيده)
    let newBalance: number;
    if (transactionType === 'DEBIT') {
      newBalance = previousBalance + amount;
    } else {
      newBalance = previousBalance - amount;
    }

    // إنشاء القيد
    // Create the entry
    const entry = await client.employeeAccount.create({
      data: {
        employeeId,
        transactionType,
        amount,
        balance: newBalance,
        referenceType,
        referenceId,
        description,
        transactionDate: transactionDate || new Date()
      },
      include: {
        employee: true
      }
    });

    return entry;
  }

  /**
   * جلب حساب موظف معين مع كل المعاملات
   * Get employee account with all transactions
   */
  async getEmployeeAccount(employeeId: number) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new Error('الموظف غير موجود');
    }

    const entries = await prisma.employeeAccount.findMany({
      where: { employeeId },
      orderBy: { transactionDate: 'desc' },
      include: {
        employee: true
      }
    });

    const currentBalance = entries.length > 0 ? Number(entries[0].balance) : 0;

    return {
      employee,
      entries,
      currentBalance
    };
  }

  /**
   * جلب الرصيد الحالي لموظف
   * Get current balance for an employee
   */
  async getCurrentBalance(employeeId: number) {
    const lastEntry = await prisma.employeeAccount.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });

    return lastEntry ? Number(lastEntry.balance) : 0;
  }

  /**
   * جلب ملخص حساب الموظف
   * Get employee account summary
   */
  async getEmployeeAccountSummary(employeeId: number) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new Error('الموظف غير موجود');
    }

    const entries = await prisma.employeeAccount.findMany({
      where: { employeeId }
    });

    const currentBalance = await this.getCurrentBalance(employeeId);

    // حساب إجمالي المدين (DEBIT) والدائن (CREDIT)
    const totalDebit = entries
      .filter(e => e.transactionType === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalCredit = entries
      .filter(e => e.transactionType === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      employee,
      currentBalance,
      totalDebit,
      totalCredit,
      transactionCount: entries.length
    };
  }
}

export default new EmployeeAccountService();




