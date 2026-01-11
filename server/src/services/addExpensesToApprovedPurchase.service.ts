import { Prisma, Currency } from '@prisma/client';
import prisma from '../models/prismaClient';
import SupplierAccountService from './SupplierAccountService';

export interface AddExpenseRequest {
  categoryId: number;
  supplierId?: number | null;
  amount: number; // المبلغ بالعملة الأصلية
  currency?: Currency;
  notes?: string | null;
  isActualExpense?: boolean; // true = مصروف فعلي (دين), false = مصروف تقديري (لتوزيع التكلفة فقط)
}

export interface AddExpensesToApprovedPurchaseRequest {
  purchaseId: number;
  expenses: AddExpenseRequest[];
}

export class AddExpensesToApprovedPurchaseService {
  async addExpensesToApprovedPurchase(data: AddExpensesToApprovedPurchaseRequest, userId: string) {
    const { purchaseId, expenses } = data;
    
    console.log('🔍 [addExpensesToApprovedPurchase] البيانات المستلمة:', JSON.stringify({ purchaseId, expenses }, null, 2));



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
      const expensesDataToCreate = expenses.map((expense: AddExpenseRequest) => {
        const isActual = expense.isActualExpense !== false; // افتراضي: مصروف فعلي

        const data = {
          purchaseId,
          categoryId: expense.categoryId,
          supplierId: isActual ? (expense.supplierId || null) : null, // المورد فقط للمصروفات الفعلية
          amount: new Prisma.Decimal(expense.amount), // المبلغ بالعملة الأصلية
          currency: (expense.currency as Currency) || Currency.LYD,
          notes: expense.notes || null,
          isActualExpense: isActual,
        };
        
        console.log('💾 [addExpensesToApprovedPurchase] البيانات التي سيتم حفظها:', {
          originalExpense: expense,
          dataToSave: {
            ...data,
            amount: data.amount.toString(),
          }
        });
        
        return data;
      });
      
      const createdExpenses = await tx.purchaseExpense.createMany({
        data: expensesDataToCreate,
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



      // 3. إنشاء إيصالات دفع للمصروفات الفعلية فقط (ليس التقديرية)
      const paymentReceipts = [];

      for (const expense of expenses) {
        const isActual = expense.isActualExpense !== false;
        
        // فقط المصروفات الفعلية تنشئ إيصالات دفع وقيود على الموردين
        if (isActual && expense.supplierId && expense.amount > 0) {
          const supplier = await tx.supplier.findUnique({
            where: { id: expense.supplierId },
          });

          const category = await tx.purchaseExpenseCategory.findUnique({
            where: { id: expense.categoryId },
          });

          if (supplier) {
            // المبلغ بالعملة الأصلية (بدون تحويل)
            const amount = expense.amount;

            console.log('📝 [AddExpensesToApproved] إنشاء إيصال دفع للمصروف:', {
              amount,
              currency: expense.currency,
              expense
            });

            const createdReceipt = await tx.supplierPaymentReceipt.create({
              data: {
                supplierId: expense.supplierId,
                purchaseId: purchaseId,
                companyId: purchase.companyId,
                amount: new Prisma.Decimal(amount), // المبلغ بالعملة الأصلية
                currency: (expense.currency as Currency) || Currency.LYD,
                type: 'EXPENSE',
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة ${purchase.invoiceNumber || `#${purchase.id}`}`,
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
              currency: (expense.currency as string) || 'LYD',
              type: 'EXPENSE',
              description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
              categoryName: category?.name,
            });
          }
        }
        // المصروفات التقديرية (Virtual) لا تنشئ إيصالات دفع ولكنها تدخل في حساب تكلفة المنتج
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
        console.log('✅ [AddExpensesToApprovedPurchase] إنشاء قيد حساب المورد:', {
          supplierId: receipt.supplierId,
          supplierName: receipt.supplierName,
          amount: receipt.amount,
          currency: receipt.currency
        });
        
        await SupplierAccountService.createAccountEntry({
          supplierId: receipt.supplierId,
          transactionType: 'CREDIT',
          amount: receipt.amount,
          referenceType: 'PURCHASE',
          referenceId: receipt.id || 0,
          description: receipt.description,
          transactionDate: new Date(),
          currency: receipt.currency, // 🎯 العملة الأصلية!
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
