import { Prisma } from '@prisma/client';
import prisma from '../models/prismaClient';
import SupplierAccountLedgerService from './SupplierAccountService';
import { TreasuryController } from '../controllers/TreasuryController';

export class PaymentReceiptService {
  // الحصول على جميع إيصالات الدفع
  async getAllPaymentReceipts(query: any = {}) {
    const {
      page = 1,
      limit = 10,
      supplierId,
      purchaseId,
      status,
      type,
      search,
      companyId,
    } = query;

    // تحويل القيم إلى أرقام
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const skip = (pageNum - 1) * limitNum;
    const where: any = {};

    // فلاتر البحث
    if (supplierId) where.supplierId = parseInt(supplierId);
    if (purchaseId === 'exists') {
      where.purchaseId = { not: null };
    } else if (purchaseId) {
      where.purchaseId = parseInt(purchaseId);
    }
    if (status) where.status = status;
    if (type) where.type = type;
    if (companyId) where.companyId = parseInt(companyId);
    if (search) {
      where.OR = [
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { description: { contains: search, mode: 'insensitive' } },
        { categoryName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [receipts, total] = await Promise.all([
      prisma.supplierPaymentReceipt.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          purchase: {
            select: {
              id: true,
              invoiceNumber: true,
              currency: true,
            },
          },
          installments: {
            select: {
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierPaymentReceipt.count({ where }),
    ]);

    // حساب المبلغ المدفوع والمتبقي لكل إيصال
    const receiptsWithAmounts = receipts.map(receipt => {
      const paidAmount = receipt.installments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0
      );
      const remainingAmount = Number(receipt.amount) - paidAmount;

      return {
        ...receipt,
        amount: Number(receipt.amount),
        currency: receipt.currency || 'LYD',
        paidAmount,
        remainingAmount,
      };
    });

    return {
      receipts: receiptsWithAmounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  // الحصول على إيصال دفع واحد
  async getPaymentReceiptById(id: number) {
    return await prisma.supplierPaymentReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchase: true,
      },
    });
  }

  // إنشاء إيصال دفع جديد
  async createPaymentReceipt(data: any) {
    const receipt = await prisma.supplierPaymentReceipt.create({
      data,
      include: {
        supplier: true,
        purchase: true,
      },
    });

    if (receipt.supplierId) {
      const referenceType = receipt.type === 'RETURN' ? 'RETURN' : 'PURCHASE';

      await SupplierAccountLedgerService.createAccountEntry({
        supplierId: receipt.supplierId,
        transactionType: 'CREDIT',
        amount: Number(receipt.amount),
        referenceType,
        referenceId: receipt.id,
        description:
          receipt.description ||
          (receipt.type === 'RETURN'
            ? `مرتجع للمورد رقم ${receipt.id}`
            : receipt.type === 'EXPENSE'
              ? `مصروف على المورد رقم ${receipt.id}`
              : `فاتورة مشتريات للمورد رقم ${receipt.id}`),
        transactionDate: receipt.createdAt,
        // معلومات العملة
        currency: receipt.currency || 'LYD',
      });
    }

    return receipt;
  }

  // تحديث إيصال دفع
  async updatePaymentReceipt(id: number, data: any) {
    const receipt = await prisma.supplierPaymentReceipt.update({
      where: { id },
      data,
      include: {
        supplier: true,
        purchase: true,
      },
    });

    if (receipt.supplierId) {
      const referenceType = receipt.type === 'RETURN' ? 'RETURN' : 'PURCHASE';

      await prisma.supplierAccount.deleteMany({
        where: {
          supplierId: receipt.supplierId,
          referenceType,
          referenceId: receipt.id,
        },
      });

      await SupplierAccountLedgerService.createAccountEntry({
        supplierId: receipt.supplierId,
        transactionType: 'CREDIT',
        amount: Number(receipt.amount),
        referenceType,
        referenceId: receipt.id,
        description:
          receipt.description ||
          (receipt.type === 'RETURN'
            ? `مرتجع للمورد رقم ${receipt.id}`
            : receipt.type === 'EXPENSE'
              ? `مصروف على المورد رقم ${receipt.id}`
              : `فاتورة مشتريات للمورد رقم ${receipt.id}`),
        transactionDate: receipt.createdAt,
        // معلومات العملة
        currency: receipt.currency || 'LYD',
      });
    }

    return receipt;
  }

  // حذف إيصال دفع
  async deletePaymentReceipt(id: number) {
    const receipt = await prisma.supplierPaymentReceipt.delete({
      where: { id },
      include: {
        installments: {
          select: { id: true },
        },
      },
    });

    if (receipt.supplierId) {
      await prisma.supplierAccount.deleteMany({
        where: {
          supplierId: receipt.supplierId,
          OR: [
            { referenceType: 'PURCHASE', referenceId: receipt.id },
            { referenceType: 'RETURN', referenceId: receipt.id },
            {
              referenceType: 'PAYMENT',
              referenceId: { in: receipt.installments.map((inst) => inst.id) },
            },
          ],
        },
      });
    }

    return receipt;
  }

  // تسديد إيصال دفع
  async payReceipt(id: number, notes?: string, treasuryId?: number, exchangeRate?: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. الحصول على الإيصال مع المدفوعات السابقة والبيانات المرتبطة
      const receipt = await tx.supplierPaymentReceipt.findUnique({
        where: { id },
        include: {
          supplier: true,
          purchase: true,
          installments: {
            select: {
              amount: true,
            },
          },
        },
      });

      if (!receipt) {
        throw new Error('إيصال الدفع غير موجود');
      }

      if (receipt.status === 'PAID') {
        throw new Error('هذا الإيصال مسدد بالفعل');
      }

      // 2. حساب المبلغ المتبقي للسداد (بالدينار الليبي)
      const amountAlreadyPaid = receipt.installments.reduce(
        (sum, installment) => sum + Number(installment.amount),
        0
      );

      // إذا تم تقديم سعر صرف جديد وكان الإيصال بعملة أجنبية
      let amountToPayInLYD = Number(receipt.amount) - amountAlreadyPaid;
      let updatedExchangeRate = Number(receipt.exchangeRate) || 1;
      let updatedAmountLYD = Number(receipt.amount);

      if (exchangeRate && receipt.currency && receipt.currency !== 'LYD' && receipt.amountForeign) {
        // تحديث سعر الصرف والمبلغ بالدينار
        updatedExchangeRate = exchangeRate;
        updatedAmountLYD = Number(receipt.amountForeign) * exchangeRate;
        amountToPayInLYD = updatedAmountLYD - amountAlreadyPaid;
      }

      // 3. تحديث حالة الإيصال
      const updatedReceipt = await tx.supplierPaymentReceipt.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          notes: notes || receipt.notes,
          ...(exchangeRate && receipt.currency && receipt.currency !== 'LYD' && receipt.amountForeign ? {
            exchangeRate: new Prisma.Decimal(updatedExchangeRate),
            amount: new Prisma.Decimal(updatedAmountLYD),
          } : {}),
        },
      });

      // 4. تسجيل العمليات المالية إذا كان هناك مبلغ متبقي
      if (amountToPayInLYD > 0) {
        // أ. قيد في حساب المورد (DEBIT)
        if (receipt.supplierId) {
          // جلب آخر رصيد للمورد
          const lastEntry = await tx.supplierAccount.findFirst({
            where: { supplierId: receipt.supplierId },
            orderBy: { createdAt: 'desc' }
          });

          const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
          const newBalance = previousBalance - amountToPayInLYD;

          await tx.supplierAccount.create({
            data: {
              supplierId: receipt.supplierId,
              transactionType: 'DEBIT',
              amount: new Prisma.Decimal(amountToPayInLYD), // المبلغ المدفوع بالدينار الليبي
              balance: new Prisma.Decimal(newBalance),
              referenceType: 'PAYMENT',
              referenceId: receipt.id,
              description: notes || receipt.description || `تسديد إيصال دفع رقم ${receipt.id}`,
              transactionDate: new Date(),
              // معلومات العملة
              currency: receipt.currency || 'LYD',
            },
          });
        }

        // ب. الخصم من الخزينة
        try {
          // البحث عن خزينة مناسبة إذا لم يتم تحديد واحدة
          let targetTreasuryId = treasuryId;

          if (!targetTreasuryId) {
            // محاولة البحث عن خزينة الشركة المرتبطة بالفاتورة
            if (receipt.purchase?.companyId) {
              const companyTreasury = await tx.treasury.findFirst({
                where: {
                  companyId: receipt.purchase.companyId,
                  isActive: true
                }
              });
              targetTreasuryId = companyTreasury?.id;
            }

            // إذا لم نجد خزينة شركة، نبحث عن الخزينة العامة
            if (!targetTreasuryId) {
              const generalTreasury = await tx.treasury.findFirst({
                where: {
                  type: 'GENERAL',
                  isActive: true
                }
              });
              targetTreasuryId = generalTreasury?.id;
            }
          }

          if (targetTreasuryId) {
            // جلب الخزينة للتأكد من الرصيد وتجهيز الحركة
            const treasury = await tx.treasury.findUnique({
              where: { id: targetTreasuryId }
            });

            if (treasury) {
              const balanceBefore = treasury.balance;
              const balanceAfter = Number(balanceBefore) - amountToPayInLYD;

              // إنشاء تفاصيل حركة الخزينة مع مراعاة العملة الأجنبية
              let movementDesc = `إيصال صرف للمورد - ${receipt.description || `إيصال رقم ${receipt.id}`}`;

              // إضافة تفاصيل العملة الأجنبية في الوصف لتظهر في حركة الخزينة
              if (receipt.currency && receipt.currency !== 'LYD' && receipt.amountForeign) {
                const foreignAmount = Number(receipt.amountForeign);
                movementDesc += ` [${foreignAmount.toFixed(2)} ${receipt.currency} @ ${updatedExchangeRate.toFixed(4)}]`;
              }

              if (notes) movementDesc += ` (${notes})`;

              await tx.treasuryTransaction.create({
                data: {
                  treasuryId: targetTreasuryId,
                  type: 'WITHDRAWAL',
                  source: 'PAYMENT',
                  amount: new Prisma.Decimal(amountToPayInLYD),
                  balanceBefore: balanceBefore,
                  balanceAfter: new Prisma.Decimal(balanceAfter),
                  description: movementDesc,
                  referenceType: 'SupplierPaymentReceipt',
                  referenceId: receipt.id,
                }
              });

              await tx.treasury.update({
                where: { id: targetTreasuryId },
                data: { balance: new Prisma.Decimal(balanceAfter) }
              });
            }
          }
        } catch (treasuryError) {
          console.error('خطأ في تحديث الخزينة:', treasuryError);
          // نترك الخطأ يظهر ولكن لا نوقف السداد إلا في حالات حرجة
        }
      }

      return updatedReceipt;
    });
  }

  // إلغاء إيصال دفع
  async cancelReceipt(id: number, reason?: string) {
    const receipt = await prisma.supplierPaymentReceipt.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason,
      },
      include: {
        supplier: true,
        purchase: true,
        installments: {
          select: { id: true },
        },
      },
    });

    await prisma.supplierAccount.deleteMany({
      where: {
        supplierId: receipt.supplierId,
        OR: [
          { referenceType: 'PURCHASE', referenceId: receipt.id },
          { referenceType: 'RETURN', referenceId: receipt.id },
          {
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
          },
          {
            referenceType: 'PAYMENT',
            referenceId: {
              in: receipt.installments.map((inst) => inst.id),
            },
          },
        ],
      },
    });

    return receipt;
  }

  // إحصائيات إيصالات الدفع
  async getPaymentReceiptsStats() {
    const [
      totalPending,
      totalPaid,
      totalCancelled,
      pendingAmount,
      paidAmount,
      totalAmount,
    ] = await Promise.all([
      prisma.supplierPaymentReceipt.count({ where: { status: 'PENDING' } }),
      prisma.supplierPaymentReceipt.count({ where: { status: 'PAID' } }),
      prisma.supplierPaymentReceipt.count({ where: { status: 'CANCELLED' } }),
      prisma.supplierPaymentReceipt.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.supplierPaymentReceipt.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.supplierPaymentReceipt.aggregate({
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPending,
      totalPaid,
      totalCancelled,
      pendingAmount: Number(pendingAmount._sum.amount || 0),
      paidAmount: Number(paidAmount._sum.amount || 0),
      totalAmount: Number(totalAmount._sum.amount || 0),
    };
  }
}

export default new PaymentReceiptService();
