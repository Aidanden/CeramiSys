import { PrismaClient } from '@prisma/client';
import { 
  CreatePurchaseRequest, 
  UpdatePurchaseRequest, 
  CreatePurchasePaymentRequest,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  GetPurchasesQuery,
  GetSuppliersQuery,
  Purchase,
  PurchaseStats,
  Supplier
} from '../dto/purchaseDto';

const prisma = new PrismaClient();

export class PurchaseService {
  // Create a new purchase
  static async createPurchase(data: CreatePurchaseRequest): Promise<Purchase> {
    const { companyId, supplierId, invoiceNumber, purchaseType, paymentMethod, lines } = data;

    // Calculate total
    const total = lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
    
    // For cash purchases, mark as fully paid
    const isFullyPaid = purchaseType === 'CASH';
    const paidAmount = isFullyPaid ? total : 0;
    const remainingAmount = total - paidAmount;

    const purchase = await prisma.purchase.create({
      data: {
        companyId,
        supplierId,
        invoiceNumber,
        total,
        paidAmount,
        remainingAmount,
        purchaseType,
        paymentMethod: purchaseType === 'CASH' ? paymentMethod : null,
        isFullyPaid,
        lines: {
          create: lines.map(line => ({
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            subTotal: line.qty * line.unitPrice,
          })),
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        lines: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    // Update stock for each product
    for (const line of lines) {
      await this.updateStock(companyId, line.productId, line.qty);
    }

    // تسجيل قيد محاسبي في حساب المورد (إذا كانت مشتريات آجلة وهناك مورد)
    if (purchaseType === 'CREDIT' && supplierId) {
      const SupplierAccountService = (await import('./SupplierAccountService')).default;
      await SupplierAccountService.createAccountEntry({
        supplierId: supplierId,
        transactionType: 'CREDIT', // له المورد - زيادة في دين الشركة للمورد
        amount: total,
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        description: `فاتورة مشتريات آجلة رقم ${invoiceNumber || purchase.id}`,
        transactionDate: new Date()
      });
      console.log(`✅ تم تسجيل قيد محاسبي (له المورد) بمبلغ ${total} دينار في حساب المورد`);
    }

    return {
      ...purchase,
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      remainingAmount: Number(purchase.remainingAmount),
      createdAt: purchase.createdAt.toISOString(),
      lines: purchase.lines.map(line => ({
        ...line,
        qty: Number(line.qty),
        unitPrice: Number(line.unitPrice),
        subTotal: Number(line.subTotal),
      })),
      payments: purchase.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  }

  // Get purchases with filters
  static async getPurchases(query: GetPurchasesQuery) {
    const { 
      page, 
      limit, 
      companyId, 
      supplierId, 
      purchaseType, 
      isFullyPaid, 
      search,
      startDate,
      endDate
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (purchaseType) {
      where.purchaseType = purchaseType;
    }

    if (isFullyPaid !== undefined) {
      where.isFullyPaid = isFullyPaid;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          payments: true,
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return {
      purchases: purchases.map(purchase => ({
        ...purchase,
        total: Number(purchase.total),
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal),
        })),
        payments: purchase.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
          createdAt: payment.createdAt.toISOString(),
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get purchase by ID
  static async getPurchaseById(id: number): Promise<Purchase | null> {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        lines: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    return purchase ? {
      ...purchase,
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      remainingAmount: Number(purchase.remainingAmount),
      createdAt: purchase.createdAt.toISOString(),
      lines: purchase.lines.map(line => ({
        ...line,
        qty: Number(line.qty),
        unitPrice: Number(line.unitPrice),
        subTotal: Number(line.subTotal),
      })),
      payments: purchase.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      })),
    } : null;
  }

  // Update purchase
  static async updatePurchase(id: number, data: UpdatePurchaseRequest): Promise<Purchase> {
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existingPurchase) {
      throw new Error('Purchase not found');
    }

    // If lines are being updated, we need to handle stock changes
    if (data.lines) {
      // Revert old stock changes
      for (const line of existingPurchase.lines) {
        await this.updateStock(existingPurchase.companyId, line.productId, -line.qty);
      }

      // Calculate new total
      const total = data.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
      
      // Update purchase with new lines
      const purchase = await prisma.purchase.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          invoiceNumber: data.invoiceNumber,
          purchaseType: data.purchaseType,
          paymentMethod: data.paymentMethod,
          total,
          remainingAmount: total - Number(existingPurchase.paidAmount),
          isFullyPaid: Number(existingPurchase.paidAmount) >= total,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      // Apply new stock changes
      for (const line of data.lines) {
        await this.updateStock(existingPurchase.companyId, line.productId, line.qty);
      }

      return {
        ...purchase,
        total: Number(purchase.total),
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal),
        })),
        payments: purchase.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
          createdAt: payment.createdAt.toISOString(),
        })),
      };
    } else {
      // Update without changing lines
      const purchase = await prisma.purchase.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          invoiceNumber: data.invoiceNumber,
          purchaseType: data.purchaseType,
          paymentMethod: data.paymentMethod,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      return {
        ...purchase,
        total: Number(purchase.total),
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => ({
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal),
        })),
        payments: purchase.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
          createdAt: payment.createdAt.toISOString(),
        })),
      };
    }
  }

  // Delete purchase
  static async deletePurchase(id: number): Promise<void> {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // التحقق من أن هذه الفاتورة ليست فاتورة مشتريات تم إنشاؤها تلقائياً
    // كجزء من فاتورة مبيعات معقدة
    const relatedSale = await prisma.sale.findFirst({
      where: {
        relatedBranchPurchaseId: id
      },
      select: {
        id: true,
        invoiceNumber: true,
        customer: { select: { name: true } }
      }
    });

    if (relatedSale) {
      const customerName = relatedSale.customer?.name || 'غير محدد';
      const invoiceRef = relatedSale.invoiceNumber || `#${relatedSale.id}`;
      throw new Error(
        `⛔ لا يمكن حذف فاتورة المشتريات هذه مباشرة!\n\n` +
        `هذه فاتورة مشتريات تم إنشاؤها تلقائياً من فاتورة مبيعات معقدة.\n\n` +
        `📋 فاتورة المبيعات الأصلية: ${invoiceRef}\n` +
        `👤 العميل: ${customerName}\n\n` +
        `💡 لحذف هذه الفاتورة، اذهب إلى فاتورة المبيعات الأصلية واحذفها.`
      );
    }

    // Revert stock changes only if affectsInventory is true
    if (purchase.affectsInventory) {
      for (const line of purchase.lines) {
        await this.updateStock(purchase.companyId, line.productId, -line.qty);
      }
    }

    await prisma.purchase.delete({
      where: { id },
    });
  }

  // Add payment to purchase
  static async addPayment(data: CreatePurchasePaymentRequest) {
    const { purchaseId, companyId, receiptNumber, amount, paymentMethod, paymentDate, notes } = data;

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.companyId !== companyId) {
      throw new Error('Unauthorized');
    }

    const newPaidAmount = Number(purchase.paidAmount) + amount;
    const newRemainingAmount = Number(purchase.total) - newPaidAmount;
    const isFullyPaid = newRemainingAmount <= 0;

    const [payment, updatedPurchase] = await prisma.$transaction([
      prisma.purchasePayment.create({
        data: {
          purchaseId,
          companyId,
          receiptNumber,
          amount,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes,
        },
      }),
      prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid,
        },
      }),
    ]);

    // تسجيل قيد محاسبي في حساب المورد (إذا كان هناك مورد)
    if (purchase.supplierId) {
      const SupplierAccountService = (await import('./SupplierAccountService')).default;
      await SupplierAccountService.createAccountEntry({
        supplierId: purchase.supplierId,
        transactionType: 'DEBIT', // عليه المورد - تخفيض من دين الشركة للمورد (دفع)
        amount: amount,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        description: `دفعة لفاتورة مشتريات ${purchase.invoiceNumber || purchase.id} - إيصال رقم ${receiptNumber}`,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date()
      });
      console.log(`✅ تم تسجيل قيد محاسبي (عليه المورد) بمبلغ ${amount} دينار في حساب المورد`);
    }

    return { payment, updatedPurchase };
  }

  // Get purchase statistics
  static async getPurchaseStats(companyId?: number): Promise<PurchaseStats> {
    const where = companyId ? { companyId } : {};

    const [
      totalPurchases,
      totalAmount,
      totalPaid,
      cashPurchases,
      creditPurchases,
    ] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.aggregate({
        where,
        _sum: { total: true },
      }),
      prisma.purchase.aggregate({
        where,
        _sum: { paidAmount: true },
      }),
      prisma.purchase.count({
        where: { ...where, purchaseType: 'CASH' },
      }),
      prisma.purchase.count({
        where: { ...where, purchaseType: 'CREDIT' },
      }),
    ]);

    const totalAmountValue = Number(totalAmount._sum.total || 0);
    const totalPaidValue = Number(totalPaid._sum.paidAmount || 0);
    const totalRemaining = totalAmountValue - totalPaidValue;
    const averagePurchase = totalPurchases > 0 ? totalAmountValue / totalPurchases : 0;

    return {
      totalPurchases,
      totalAmount: totalAmountValue,
      totalPaid: totalPaidValue,
      totalRemaining,
      cashPurchases,
      creditPurchases,
      averagePurchase,
    };
  }

  // Supplier management
  static async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const supplier = await prisma.supplier.create({
      data,
    });

    return {
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
    };
  }

  static async getSuppliers(query: GetSuppliersQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              purchases: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      suppliers: suppliers.map(supplier => ({
        ...supplier,
        createdAt: supplier.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getSupplierById(id: number): Promise<Supplier | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    return supplier ? {
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
    } : null;
  }

  static async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    return {
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
    };
  }

  static async deleteSupplier(id: number): Promise<void> {
    // Check if supplier has purchases
    const purchaseCount = await prisma.purchase.count({
      where: { supplierId: id },
    });

    if (purchaseCount > 0) {
      throw new Error('Cannot delete supplier with existing purchases');
    }

    await prisma.supplier.delete({
      where: { id },
    });
  }

  // Helper method to update stock
  private static async updateStock(companyId: number, productId: number, qtyChange: number): Promise<void> {
    await prisma.stock.upsert({
      where: {
        companyId_productId: {
          companyId,
          productId,
        },
      },
      update: {
        boxes: {
          increment: qtyChange,
        },
      },
      create: {
        companyId,
        productId,
        boxes: qtyChange,
      },
    });
  }
}
