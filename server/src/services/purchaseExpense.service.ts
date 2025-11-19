import { PrismaClient, Prisma } from '@prisma/client';
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

const prisma = new PrismaClient();

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
    console.log('🚀 بدء اعتماد الفاتورة - البيانات المستلمة:', {
      purchaseId: data.purchaseId,
      expenses: data.expenses,
      userId
    });
    
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

    console.log('✅ تم العثور على الفاتورة:', {
      id: purchase.id,
      isApproved: purchase.isApproved,
      total: purchase.total,
      supplier: purchase.supplier?.name
    });

    // إذا كانت الفاتورة معتمدة بالفعل، نضيف المصروفات فقط بدون إعادة اعتماد
    if (purchase.isApproved) {
      console.log('ℹ️ الفاتورة معتمدة بالفعل - إضافة مصروفات إضافية فقط - ID:', purchaseId);
      
      // التحقق من وجود مصروفات للإضافة
      if (expenses.length === 0) {
        throw new Error('لا توجد مصروفات للإضافة');
      }
      
      console.log('📋 المصروفات المطلوب إضافتها:', expenses);
      
      // حساب إجمالي المصروفات الجديدة
      const newExpensesTotal = expenses.reduce(
        (sum: number, expense: any) => sum + expense.amount,
        0
      );

      console.log('💰 إضافة مصروفات جديدة:', {
        expensesCount: expenses.length,
        newExpensesTotal,
        expenses: expenses
      });

      // إضافة المصروفات الجديدة فقط
      const result = await prisma.$transaction(async (tx) => {
        // 1. إضافة المصروفات الجديدة
        await tx.purchaseExpense.createMany({
          data: expenses.map((expense: any) => ({
            purchaseId,
            categoryId: expense.categoryId,
            supplierId: expense.supplierId,
            amount: new Prisma.Decimal(expense.amount),
            notes: expense.notes,
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

        // 3. إنشاء إيصالات دفع للمصروفات الجديدة فقط
        const paymentReceipts: SupplierPayable[] = [];
        
        console.log('🧾 بدء إنشاء إيصالات الدفع للمصروفات الجديدة...');
        
        for (const expense of expenses) {
          console.log('🔍 معالجة مصروف:', {
            categoryId: expense.categoryId,
            supplierId: expense.supplierId,
            amount: expense.amount
          });
          
          if (expense.supplierId && expense.amount > 0) {
            const supplier = await tx.supplier.findUnique({
              where: { id: expense.supplierId },
            });
            
            const category = await tx.purchaseExpenseCategory.findUnique({
              where: { id: expense.categoryId },
            });

            console.log('📋 بيانات المورد والفئة:', {
              supplier: supplier?.name,
              category: category?.name
            });

            if (supplier) {
              const receiptData = {
                supplierId: expense.supplierId,
                purchaseId: purchaseId,
                amount: new Prisma.Decimal(expense.amount),
                type: 'EXPENSE' as const,
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
                status: 'PENDING' as const,
              };

              console.log('💳 إنشاء إيصال دفع:', receiptData);

              const createdReceipt = await tx.supplierPaymentReceipt.create({
                data: receiptData,
              });

              // إنشاء قيد في حساب المورد (خارج transaction)
              // سيتم إنشاؤه بعد انتهاء transaction

              console.log('✅ تم إنشاء إيصال دفع وقيد حساب المورد بنجاح - ID:', createdReceipt.id);

              paymentReceipts.push({
                id: createdReceipt.id,
                supplierId: expense.supplierId,
                supplierName: supplier.name,
                amount: expense.amount,
                type: 'EXPENSE',
                description: expense.notes || `مصروف ${category?.name || 'غير محدد'} - فاتورة #${purchase.id}`,
                categoryName: category?.name,
              });
            } else {
              console.log('⚠️ لم يتم العثور على مورد للمصروف - ID:', expense.supplierId);
            }
          } else {
            console.log('⚠️ مصروف بدون مورد أو مبلغ صفر:', {
              supplierId: expense.supplierId,
              amount: expense.amount
            });
          }
        }

        console.log('🎯 ملخص إيصالات الدفع المنشأة:', {
          totalReceipts: paymentReceipts.length,
          receipts: paymentReceipts.map(r => ({
            supplier: r.supplierName,
            amount: r.amount
          }))
        });

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
          console.log(`✅ تم إنشاء قيد حساب المورد: ${receipt.supplierName} - ${receipt.amount}`);
        } catch (error) {
          console.error(`❌ خطأ في إنشاء قيد حساب المورد: ${receipt.supplierName}`, error);
        }
      }

      console.log('🎉 تمت إضافة المصروفات بنجاح:', {
        purchaseId: result.purchase.id,
        newTotalExpenses: Number(result.purchase.totalExpenses),
        newFinalTotal: Number(result.purchase.finalTotal),
        paymentReceiptsCreated: result.paymentReceipts.length
      });

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

    // حساب إجمالي المصروفات
    const totalExpenses = expenses.reduce(
      (sum: number, expense: any) => sum + expense.amount,
      0
    );

    console.log('💰 حساب المصروفات:', {
      expensesCount: expenses.length,
      totalExpenses,
      purchaseTotal: Number(purchase.total)
    });

    // حساب الإجمالي النهائي
    const finalTotal = Number(purchase.total) + totalExpenses;
    
    console.log('📊 الإجمالي النهائي:', finalTotal);

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
        data: expenses.map((expense: any) => ({
          purchaseId,
          categoryId: expense.categoryId,
          supplierId: expense.supplierId,
          amount: new Prisma.Decimal(expense.amount),
          notes: expense.notes,
        })),
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
      console.log('📦 بدء تحديث المخزون للمنتجات...');
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
        
        console.log('✅ تم تحديث مخزون المنتج:', {
          productId: line.productId,
          productName: line.product.name,
          quantity: Number(line.qty)
        });
      }

      // 5. إنشاء إيصالات الدفع للموردين
      const paymentReceipts: SupplierPayable[] = [];
      console.log('🎯 بدء إنشاء إيصالات الدفع للفاتورة:', purchaseId);

      // إيصال دفع للمورد الرئيسي (دائماً إذا كان هناك مورد)
      if (purchase.supplier) {
        const mainReceipt = await tx.supplierPaymentReceipt.create({
          data: {
            supplierId: purchase.supplier.id,
            purchaseId: purchaseId,
            amount: purchase.total,
            type: 'MAIN_PURCHASE',
            description: `فاتورة مشتريات #${purchase.id}`,
            status: 'PENDING',
          },
        });
        
        // سيتم إنشاء قيد في حساب المورد بعد انتهاء transaction
        
        console.log('✅ تم إنشاء إيصال الفاتورة الرئيسية وقيد حساب المورد:', purchase.supplier.name);
        
        paymentReceipts.push({
          id: mainReceipt.id,
          supplierId: purchase.supplier.id,
          supplierName: purchase.supplier.name,
          amount: Number(purchase.total),
          type: 'MAIN_PURCHASE',
          description: `فاتورة مشتريات #${purchase.id}`,
        });
      }

      // إيصالات دفع لموردي المصروفات - إيصال منفصل لكل مصروف
      for (const expense of expenses) {
        if (expense.supplierId && expense.amount > 0) {
          // الحصول على معلومات المورد والفئة
          const supplier = await tx.supplier.findUnique({
            where: { id: expense.supplierId },
          });
          
          const category = await tx.purchaseExpenseCategory.findUnique({
            where: { id: expense.categoryId },
          });

          if (supplier) {
            // إنشاء إيصال منفصل لكل مصروف
            const expenseReceipt = await tx.supplierPaymentReceipt.create({
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

            console.log('✅ تم إنشاء إيصال مصروف وقيد حساب المورد:', supplier.name, 'المبلغ:', expense.amount);

            paymentReceipts.push({
              id: expenseReceipt.id,
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

      console.log('🎉 تم إنشاء', paymentReceipts.length, 'إيصال دفع إجمالي');

      return {
        purchase: updatedPurchase,
        productCosts,
        paymentReceipts,
      };
    });

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
    return await prisma.purchaseExpense.findMany({
      where: { purchaseId },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: { createdAt: 'asc' },
    });
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
