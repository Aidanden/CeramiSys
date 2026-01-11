import { Prisma, Currency } from '@prisma/client';
import prisma from '../models/prismaClient';
import SupplierAccountService from './SupplierAccountService';
import {
  ApprovePurchaseRequest,
  ApprovePurchaseResponse,
  CreateExpenseCategoryRequest,
  UpdateExpenseCategoryRequest,
  ExpenseCategory,
  PurchaseExpense,
  ProductCostHistory,
  SupplierPayable
} from '../dto/purchaseExpenseDto';

export class PurchaseExpenseService {
  // ==================== فئات المصروفات ====================

  // الحصول على جميع فئات المصروفات
  async getAllExpenseCategories(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return await prisma.purchaseExpenseCategory.findMany({
      where,
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // الحصول على فئة مصروفات بالـ ID
  async getExpenseCategoryById(id: number) {
    return await prisma.purchaseExpenseCategory.findUnique({
      where: { id },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  // إنشاء فئة مصروفات جديدة
  async createExpenseCategory(data: CreateExpenseCategoryRequest) {
    const { supplierIds, ...categoryData } = data;

    return await prisma.purchaseExpenseCategory.create({
      data: {
        ...categoryData,
        suppliers: supplierIds
          ? {
            create: supplierIds.map((supplierId) => ({
              supplierId,
            })),
          }
          : undefined,
      },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  // تحديث فئة مصروفات
  async updateExpenseCategory(id: number, data: UpdateExpenseCategoryRequest) {
    const { supplierIds, ...categoryData } = data;

    // إذا تم تحديث الموردين، نحذف القديمة ونضيف الجديدة
    if (supplierIds !== undefined) {
      await prisma.expenseCategorySupplier.deleteMany({
        where: { categoryId: id },
      });
    }

    return await prisma.purchaseExpenseCategory.update({
      where: { id },
      data: {
        ...categoryData,
        suppliers: supplierIds
          ? {
            create: supplierIds.map((supplierId) => ({
              supplierId,
            })),
          }
          : undefined,
      },
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  // حذف فئة مصروفات
  async deleteExpenseCategory(id: number) {
    return await prisma.purchaseExpenseCategory.delete({
      where: { id },
    });
  }

  // ==================== اعتماد الفاتورة ====================

  // اعتماد فاتورة مشتريات مع إضافة مصروفات
  async approvePurchase(
    data: ApprovePurchaseRequest,
    userId: string
  ): Promise<ApprovePurchaseResponse> {


    const { purchaseId, expenses } = data;

    // التحقق من وجود الفاتورة
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      console.error('❌ فاتورة المشتريات غير موجودة - ID:', purchaseId);
      throw new Error('فاتورة المشتريات غير موجودة');
    }



    // إذا كانت الفاتورة معتمدة بالفعل، نضيف المصروفات فقط بدون إعادة اعتماد
    if (purchase.isApproved) {


      // التحقق من وجود مصروفات للإضافة
      if (expenses.length === 0) {
        throw new Error('لا توجد مصروفات للإضافة');
      }



      // حساب إجمالي المصروفات الجديدة (بالعملة الأصلية فقط - بدون تحويل)
      const newExpensesTotal = expenses.reduce(
        (sum: number, expense: any) => {
          return sum + expense.amount;
        },
        0
      );



      // إضافة المصروفات الجديدة فقط
      const result = await prisma.$transaction(async (tx) => {
        // 1. إضافة المصروفات الجديدة
        console.log('🔍 المصروفات المستلمة من Frontend:', JSON.stringify(expenses, null, 2));
        
        const expensesData = expenses.map((expense: any) => {
          const isActual = expense.isActualExpense !== false; // افتراضي: مصروف فعلي

          const expenseData = {
            purchaseId,
            categoryId: expense.categoryId,
            supplierId: isActual ? expense.supplierId : null, // المورد فقط للمصروفات الفعلية
            amount: new Prisma.Decimal(expense.amount), // المبلغ بالعملة الأصلية
            currency: (expense.currency as Currency) || Currency.LYD,
            notes: expense.notes,
            isActualExpense: isActual,
          };
          
          console.log('💾 البيانات التي سيتم حفظها:', expenseData);
          return expenseData;
        });
        
        await tx.purchaseExpense.createMany({
          data: expensesData,
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

        // 3. إنشاء إيصالات دفع للمصروفات الجديدة فقط
        const paymentReceipts: SupplierPayable[] = [];



        for (const expense of expenses) {
          // فقط المصروفات الفعلية تؤثر على حساب المورد
          const isActual = expense.isActualExpense !== false;
          
          if (isActual && expense.supplierId && expense.amount > 0) {
            const supplier = await tx.supplier.findUnique({
              where: { id: expense.supplierId },
            });

            const category = await tx.purchaseExpenseCategory.findUnique({
              where: { id: expense.categoryId },
            });

            if (supplier) {
              // المبلغ بالعملة الأصلية (بدون تحويل)
              const originalAmount = expense.amount;

              const receiptData = {
                supplierId: expense.supplierId,
                purchaseId: purchaseId,
                companyId: purchase.companyId,
                amount: new Prisma.Decimal(originalAmount), // المبلغ بالعملة الأصلية
                currency: expense.currency || 'LYD',
                type: 'EXPENSE' as const,
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
                status: 'PENDING' as const,
              };
              
              console.log('📝 إنشاء إيصال دفع للمصروف:', {
                amount: originalAmount,
                currency: expense.currency,
                receiptData
              });

              const createdReceipt = await tx.supplierPaymentReceipt.create({
                data: receiptData,
              });

              // إنشاء قيد في حساب المورد (خارج transaction)
              // سيتم إنشاؤه بعد انتهاء transaction

              paymentReceipts.push({
                id: createdReceipt.id,
                supplierId: expense.supplierId,
                supplierName: supplier.name,
                amount: originalAmount,
                currency: expense.currency,
                type: 'EXPENSE',
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
              });
            }
          }
          // المصروفات التقديرية (Virtual) لا تنشئ إيصالات دفع أو قيود على الموردين
          // لكنها تدخل في حساب تكلفة المنتج
        }



        return {
          purchase: updatedPurchase,
          paymentReceipts,
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
            referenceId: receipt.id || 0, // استخدام ID الإيصال إذا كان متوفراً
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
          approvedAt: result.purchase.approvedAt!.toISOString(),
          totalExpenses: Number(result.purchase.totalExpenses),
          finalTotal: Number(result.purchase.finalTotal),
        },
        paymentReceipts: result.paymentReceipts,
        message: 'تم إضافة المصروفات الإضافية بنجاح'
      };
    }

    // حساب إجمالي المصروفات (محولة للدينار الليبي)
    const totalExpenses = expenses.reduce(
      (sum: number, expense: any) => {
        const rate = expense.exchangeRate || 1.0;
        const amountLYD = expense.currency === 'LYD' ? expense.amount : expense.amount * rate;
        return sum + amountLYD;
      },
      0
    );



    // حساب الإجمالي النهائي
    const finalTotal = Number(purchase.total) + totalExpenses;



    // حساب نصيب كل وحدة من المصروفات
    const totalQuantity = purchase.lines.reduce(
      (sum, line) => sum + Number(line.qty),
      0
    );
    const expensePerUnit = totalQuantity > 0 ? totalExpenses / totalQuantity : 0;

    // استخدام transaction لضمان تنفيذ جميع العمليات
    const result = await prisma.$transaction(async (tx) => {
      // 1. إضافة المصروفات
      await tx.purchaseExpense.createMany({
        data: expenses.map((expense: any) => {
          const isActual = expense.isActualExpense !== false; // افتراضي: مصروف فعلي

          return {
            purchaseId,
            categoryId: expense.categoryId,
            supplierId: isActual ? expense.supplierId : null, // المورد فقط للمصروفات الفعلية
            amount: new Prisma.Decimal(expense.amount), // المبلغ بالعملة الأصلية
            currency: (expense.currency as Currency) || Currency.LYD,
            notes: expense.notes,
            isActualExpense: isActual,
          };
        }),
      });

      // 2. تحديث الفاتورة
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: userId,
          totalExpenses: new Prisma.Decimal(totalExpenses),
          finalTotal: new Prisma.Decimal(finalTotal),
        },
      });

      // 3. حفظ تكلفة كل منتج في السجل التاريخي
      const productCosts = await Promise.all(
        purchase.lines.map(async (line) => {
          const purchasePrice = Number(line.unitPrice);
          const totalCostPerUnit = purchasePrice + expensePerUnit;

          await tx.productCostHistory.create({
            data: {
              productId: line.productId,
              purchaseId,
              companyId: purchase.companyId,
              purchasePrice: new Prisma.Decimal(purchasePrice),
              expensePerUnit: new Prisma.Decimal(expensePerUnit),
              totalCostPerUnit: new Prisma.Decimal(totalCostPerUnit),
              quantity: line.qty,
            },
          });

          return {
            productId: line.productId,
            totalCostPerUnit: new Prisma.Decimal(totalCostPerUnit),
          };
        })
      );

      // 4. تحديث المخزون للمنتجات (فقط عند الاعتماد)

      for (const line of purchase.lines) {
        await tx.stock.upsert({
          where: {
            companyId_productId: {
              companyId: purchase.companyId,
              productId: line.productId,
            },
          },
          update: {
            boxes: {
              increment: line.qty,
            },
          },
          create: {
            companyId: purchase.companyId,
            productId: line.productId,
            boxes: line.qty,
          },
        });


      }

      // 5. إنشاء إيصالات الدفع للموردين
      const paymentReceipts: SupplierPayable[] = [];


      // إيصال دفع للمورد الرئيسي (دائماً إذا كان هناك مورد)
      if (purchase.supplier) {
        const mainReceipt = await tx.supplierPaymentReceipt.create({
          data: {
            supplierId: purchase.supplier.id,
            purchaseId: purchaseId,
            companyId: purchase.companyId,
            amount: purchase.total, // المبلغ بالعملة الأصلية
            currency: purchase.currency || Currency.LYD,
            type: 'MAIN_PURCHASE',
            description: `فاتورة مشتريات #${purchase.id}`,
            status: 'PENDING',
          },
        });

        // سيتم إنشاء قيد في حساب المورد بعد انتهاء transaction



        paymentReceipts.push({
          id: mainReceipt.id,
          supplierId: purchase.supplier.id,
          supplierName: purchase.supplier.name,
          amount: Number(purchase.total),
          currency: purchase.currency || 'LYD',
          type: 'MAIN_PURCHASE',
          description: `فاتورة مشتريات #${purchase.id}`,
        });
      }

      // إيصالات دفع لموردي المصروفات - إيصال منفصل لكل مصروف فعلي فقط
      for (const expense of expenses) {
        const isActual = expense.isActualExpense !== false;
        
        // فقط المصروفات الفعلية تنشئ إيصالات دفع وقيود على الموردين
        if (isActual && expense.supplierId && expense.amount > 0) {
          // الحصول على معلومات المورد والفئة
          const supplier = await tx.supplier.findUnique({
            where: { id: expense.supplierId },
          });

          const category = await tx.purchaseExpenseCategory.findUnique({
            where: { id: expense.categoryId },
          });

          if (supplier) {
            // المبلغ بالعملة الأصلية
            const amount = expense.amount;

            // إنشاء إيصال منفصل لكل مصروف فعلي
            const expenseReceipt = await tx.supplierPaymentReceipt.create({
              data: {
                supplierId: expense.supplierId,
                purchaseId: purchaseId,
                companyId: purchase.companyId,
                amount: new Prisma.Decimal(amount), // المبلغ بالعملة الأصلية
                currency: expense.currency || 'LYD',
                type: 'EXPENSE',
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
                status: 'PENDING',
              },
            });

            // سيتم إنشاء قيد في حساب المورد بعد انتهاء transaction

            paymentReceipts.push({
              id: expenseReceipt.id,
              supplierId: expense.supplierId,
              supplierName: supplier.name,
              amount: amount,
              currency: expense.currency || 'LYD',
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
        productCosts,
        paymentReceipts,
      };
    });

    // إنشاء قيود حساب المورد بعد انتهاء transaction

    for (const receipt of result.paymentReceipts) {
      try {
        console.log('✅ [PurchaseExpenseService] إنشاء قيد حساب المورد:', {
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
        approvedAt: result.purchase.approvedAt!.toISOString(),
        totalExpenses: Number(result.purchase.totalExpenses),
        finalTotal: Number(result.purchase.finalTotal),
      },
      productCosts: result.productCosts.map(pc => ({
        productId: pc.productId,
        totalCostPerUnit: Number(pc.totalCostPerUnit),
      })),
      supplierPayables: result.paymentReceipts,
    };
  }

  // الحصول على مصروفات فاتورة معينة
  async getPurchaseExpenses(purchaseId: number) {
    const expenses = await prisma.purchaseExpense.findMany({
      where: { purchaseId },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log('🔍 [getPurchaseExpenses] المصروفات من Database:', expenses.map(e => ({
      id: e.id,
      amount: e.amount,
      currency: e.currency
    })));
    
    return expenses;
  }

  // حذف مصروف
  async deletePurchaseExpense(expenseId: number, userId: number) {
    // التحقق من وجود المصروف
    const expense = await prisma.purchaseExpense.findUnique({
      where: { id: expenseId },
      include: {
        purchase: true,
        supplier: true,
        category: true,
      },
    });

    if (!expense) {
      throw new Error('المصروف غير موجود');
    }

    // التحقق من وجود إيصالات دفع مرتبطة بهذا المصروف
    // نبحث عن الإيصالات التي تطابق المورد والفاتورة والمبلغ والنوع
    const relatedPayments = expense.supplierId
      ? await prisma.supplierPaymentReceipt.findMany({
        where: {
          supplierId: expense.supplierId,
          purchaseId: expense.purchaseId,
          type: 'EXPENSE',
          amount: expense.amount,
          categoryName: expense.category?.name,
        },
      })
      : [];

    // حذف المصروف وإيصالات الدفع المرتبطة به في transaction
    await prisma.$transaction(async (tx) => {
      // حذف إيصالات الدفع المرتبطة
      if (relatedPayments.length > 0) {
        await tx.supplierPaymentReceipt.deleteMany({
          where: {
            id: {
              in: relatedPayments.map((p: any) => p.id),
            },
          },
        });
      }

      // حذف المصروف
      await tx.purchaseExpense.delete({
        where: { id: expenseId },
      });

      // تحديث إجمالي المصروفات في الفاتورة
      const remainingExpenses = await tx.purchaseExpense.findMany({
        where: { purchaseId: expense.purchaseId },
      });

      const totalExpenses = remainingExpenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0
      );

      await tx.purchase.update({
        where: { id: expense.purchaseId },
        data: {
          totalExpenses: totalExpenses.toString(),
          finalTotal: (Number(expense.purchase.total) + totalExpenses).toString(),
        },
      });
    });

    return {
      success: true,
      message: `تم حذف المصروف${relatedPayments.length > 0 ? ' وإيصالات الدفع المرتبطة به' : ''} بنجاح`,
      deletedPaymentsCount: relatedPayments.length,
    };
  }

  // الحصول على تاريخ تكلفة منتج معين
  async getProductCostHistory(productId: number, companyId?: number) {
    const where: any = { productId };
    if (companyId) {
      where.companyId = companyId;
    }

    return await prisma.productCostHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10, // آخر 10 عمليات شراء
    });
  }
}

export default new PurchaseExpenseService();