import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

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

    console.log('🚀 بدء إضافة مصروفات لفاتورة معتمدة:', {
      purchaseId,
      expenses,
      userId
    });

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

    console.log('✅ تم العثور على الفاتورة المعتمدة:', {
      id: purchase.id,
      total: purchase.total,
      supplier: purchase.supplier?.name
    });

    // التحقق من وجود مصروفات للإضافة
    if (expenses.length === 0) {
      throw new Error('لا توجد مصروفات للإضافة');
    }

    // حساب إجمالي المصروفات الجديدة
    const newExpensesTotal = expenses.reduce(
      (sum: number, expense: AddExpenseRequest) => sum + expense.amount,
      0
    );

    console.log('💰 حساب المصروفات الجديدة:', {
      expensesCount: expenses.length,
      newExpensesTotal
    });

    // إضافة المصروفات الجديدة
    const result = await prisma.$transaction(async (tx) => {
      console.log('📝 بدء إضافة المصروفات...');
      
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

      console.log('✅ تم إضافة المصروفات:', createdExpenses);

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

      console.log('✅ تم تحديث الفاتورة:', {
        newTotalExpenses,
        newFinalTotal
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

            console.log('✅ تم إنشاء إيصال دفع - ID:', createdReceipt.id);

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

    console.log('🎉 تمت إضافة المصروفات بنجاح:', {
      purchaseId: result.purchase.id,
      expensesAdded: result.expensesAdded,
      paymentReceiptsCreated: result.paymentReceipts.length,
      newTotalExpenses: Number(result.purchase.totalExpenses),
      newFinalTotal: Number(result.purchase.finalTotal)
    });

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
