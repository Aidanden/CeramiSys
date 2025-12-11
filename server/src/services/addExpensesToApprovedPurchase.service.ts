import { Prisma } from '@prisma/client';
import prisma from '../models/prismaClient';
import SupplierAccountService from './SupplierAccountService';

export interface AddExpenseRequest {
  categoryId: number;
  supplierId?: number | null;
  amount: number;
  notes?: string | null;
}

export interface AddExpensesToApprovedPurchaseRequest {
  purchaseId: number;
  expenses: AddExpenseRequest[];
}

export class AddExpensesToApprovedPurchaseService {
  async addExpensesToApprovedPurchase(data: AddExpensesToApprovedPurchaseRequest, userId: string) {
    const { purchaseId, expenses } = data;



    // التحقق من وجود الفاتورة
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
      },
    });

    if (!purchase) {
      throw new Error('فاتورة المشتريات غير موجودة');
    }

    if (!purchase.isApproved) {
      throw new Error('الفاتورة غير معتمدة');
    }



    // التحقق من وجود مصروفات للإضافة
    if (expenses.length === 0) {
      throw new Error('لا توجد مصروفات للإضافة');
    }

    // حساب إجمالي المصروفات الجديدة
    const newExpensesTotal = expenses.reduce(
      (sum: number, expense: AddExpenseRequest) => sum + expense.amount,
      0
    );



    // إضافة المصروفات الجديدة
    const result = await prisma.$transaction(async (tx) => {


      // 1. إضافة المصروفات الجديدة
      const createdExpenses = await tx.purchaseExpense.createMany({
        data: expenses.map((expense: AddExpenseRequest) => ({
          purchaseId,
          categoryId: expense.categoryId,
          supplierId: expense.supplierId || null,
          amount: new Prisma.Decimal(expense.amount),
          notes: expense.notes || null,
        })),
      });



      // 2. تحديث إجمالي المصروفات والإجمالي النهائي
      const currentTotalExpenses = Number(purchase.totalExpenses || 0);
      const newTotalExpenses = currentTotalExpenses + newExpensesTotal;
      const newFinalTotal = Number(purchase.total) + newTotalExpenses;

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          totalExpenses: new Prisma.Decimal(newTotalExpenses),
          finalTotal: new Prisma.Decimal(newFinalTotal),
        },
      });



      // 3. إنشاء إيصالات دفع للمصروفات الجديدة
      const paymentReceipts = [];

      for (const expense of expenses) {
        if (expense.supplierId && expense.amount > 0) {
          const supplier = await tx.supplier.findUnique({
            where: { id: expense.supplierId },
          });

          const category = await tx.purchaseExpenseCategory.findUnique({
            where: { id: expense.categoryId },
          });

          if (supplier) {
            const createdReceipt = await tx.supplierPaymentReceipt.create({
              data: {
                supplierId: expense.supplierId,
                purchaseId: purchaseId,
                amount: new Prisma.Decimal(expense.amount),
                type: 'EXPENSE',
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
                status: 'PENDING',
              },
            });

            // سيتم إنشاء قيد في حساب المورد بعد انتهاء transaction



            paymentReceipts.push({
              id: createdReceipt.id,
              supplierId: expense.supplierId,
              supplierName: supplier.name,
              amount: expense.amount,
              type: 'EXPENSE',
              description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
              categoryName: category?.name,
            });
          }
        }
      }

      return {
        purchase: updatedPurchase,
        paymentReceipts,
        expensesAdded: createdExpenses.count
      };
    });

    // إنشاء قيود حساب المورد بعد انتهاء transaction
    for (const receipt of result.paymentReceipts) {
      try {
        await SupplierAccountService.createAccountEntry({
          supplierId: receipt.supplierId,
          transactionType: 'CREDIT',
          amount: receipt.amount,
          referenceType: 'PURCHASE',
          referenceId: receipt.id || 0,
          description: receipt.description,
          transactionDate: new Date(),
        });

      } catch (error) {
        console.error(`❌ خطأ في إنشاء قيد حساب المورد: ${receipt.supplierName}`, error);
      }
    }



    return {
      success: true,
      purchase: {
        id: result.purchase.id,
        isApproved: result.purchase.isApproved,
        totalExpenses: Number(result.purchase.totalExpenses),
        finalTotal: Number(result.purchase.finalTotal),
      },
      expensesAdded: result.expensesAdded,
      paymentReceipts: result.paymentReceipts,
      message: 'تم إضافة المصروفات الإضافية بنجاح'
    };
  }
}

export default new AddExpensesToApprovedPurchaseService();
