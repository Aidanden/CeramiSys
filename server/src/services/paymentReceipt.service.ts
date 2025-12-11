import prisma from '../models/prismaClient';
import SupplierAccountLedgerService from './SupplierAccountService';

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
    } = query;

    // تحويل القيم إلى أرقام
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const skip = (pageNum - 1) * limitNum;
    const where: any = {};

    // فلاتر البحث
    if (supplierId) where.supplierId = supplierId;
    if (purchaseId === 'exists') {
      where.purchaseId = { not: null };
    } else if (purchaseId) {
      where.purchaseId = purchaseId;
    }
    if (status) where.status = status;
    if (type) where.type = type;
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
  async payReceipt(id: number, notes?: string) {
    const receipt = await prisma.supplierPaymentReceipt.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        notes,
      },
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

    if (receipt.supplierId) {
      const amountAlreadyRecorded = receipt.installments.reduce(
        (sum, installment) => sum + Number(installment.amount),
        0
      );

      const amountToRecord = Number(receipt.amount) - amountAlreadyRecorded;

      if (amountToRecord > 0) {
        const existingEntry = await prisma.supplierAccount.findFirst({
          where: {
            supplierId: receipt.supplierId,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
          },
        });

        if (!existingEntry) {
          await SupplierAccountLedgerService.createAccountEntry({
            supplierId: receipt.supplierId,
            transactionType: 'DEBIT',
            amount: amountToRecord,
            referenceType: 'PAYMENT',
            referenceId: receipt.id,
            description:
              receipt.description || `تسديد إيصال دفع رقم ${receipt.id}`,
            transactionDate: receipt.paidAt ?? new Date(),
          });
        }
      }
    }

    return receipt;
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
