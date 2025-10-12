import { PrismaClient, ReturnStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSaleReturnRequest {
  saleId: number;
  companyId: number;
  customerId?: number;
  reason?: string;
  notes?: string;
  refundMethod?: PaymentMethod;
  lines: {
    productId: number;
    qty: number;
    unitPrice: number;
  }[];
}

export interface UpdateReturnStatusRequest {
  returnId: number;
  status: ReturnStatus;
  notes?: string;
}

export class SaleReturnService {
  /**
   * التحقق من أن الفاتورة مدفوعة بالكامل
   */
  async validateSaleForReturn(saleId: number): Promise<{ valid: boolean; message?: string }> {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        returns: true
      }
    });

    if (!sale) {
      return { valid: false, message: 'الفاتورة غير موجودة' };
    }

    // التحقق من أن الفاتورة مدفوعة بالكامل
    if (!sale.isFullyPaid) {
      const formattedAmount = Number(sale.remainingAmount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return { 
        valid: false, 
        message: `الفاتورة غير مدفوعة بالكامل. المبلغ المتبقي: ${formattedAmount} د.ل` 
      };
    }

    return { valid: true };
  }

  /**
   * إنشاء مرتجع جديد
   */
  async createReturn(data: CreateSaleReturnRequest) {
    // التحقق من صحة الفاتورة
    const validation = await this.validateSaleForReturn(data.saleId);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // حساب الإجمالي
    const total = data.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);

    // إنشاء المرتجع
    const saleReturn = await prisma.saleReturn.create({
      data: {
        saleId: data.saleId,
        companyId: data.companyId,
        customerId: data.customerId,
        total,
        refundAmount: total, // افتراضياً المبلغ المسترد = الإجمالي
        refundMethod: data.refundMethod,
        reason: data.reason,
        notes: data.notes,
        status: ReturnStatus.PENDING,
        lines: {
          create: data.lines.map(line => ({
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            subTotal: line.qty * line.unitPrice
          }))
        }
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        sale: {
          include: {
            customer: true
          }
        }
      }
    });

    return saleReturn;
  }

  /**
   * معالجة المرتجع (إرجاع المخزون)
   */
  async processReturn(returnId: number) {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: returnId },
      include: {
        lines: {
          include: {
            product: true
          }
        }
      }
    });

    if (!saleReturn) {
      throw new Error('المرتجع غير موجود');
    }

    if (saleReturn.status !== ReturnStatus.APPROVED) {
      throw new Error('يجب اعتماد المرتجع أولاً');
    }

    // إرجاع المخزون
    for (const line of saleReturn.lines) {
      await prisma.stock.upsert({
        where: {
          companyId_productId: {
            companyId: saleReturn.companyId,
            productId: line.productId
          }
        },
        update: {
          boxes: {
            increment: line.qty
          }
        },
        create: {
          companyId: saleReturn.companyId,
          productId: line.productId,
          boxes: line.qty
        }
      });
    }

    // تحديث حالة المرتجع
    const updatedReturn = await prisma.saleReturn.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.PROCESSED,
        processedAt: new Date()
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        sale: {
          include: {
            customer: true
          }
        }
      }
    });

    return updatedReturn;
  }

  /**
   * تحديث حالة المرتجع
   */
  async updateReturnStatus(data: UpdateReturnStatusRequest) {
    const saleReturn = await prisma.saleReturn.update({
      where: { id: data.returnId },
      data: {
        status: data.status,
        notes: data.notes,
        processedAt: data.status === ReturnStatus.PROCESSED ? new Date() : undefined
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        sale: {
          include: {
            customer: true
          }
        }
      }
    });

    // إذا تم اعتماد المرتجع، نقوم بمعالجته تلقائياً
    if (data.status === ReturnStatus.APPROVED) {
      return await this.processReturn(data.returnId);
    }

    return saleReturn;
  }

  /**
   * الحصول على جميع المرتجعات
   */
  async getReturns(filters?: {
    companyId?: number;
    customerId?: number;
    status?: ReturnStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;

    const [returns, total] = await Promise.all([
      prisma.saleReturn.findMany({
        where,
        include: {
          lines: {
            include: {
              product: true
            }
          },
          sale: {
            include: {
              customer: true
            }
          },
          company: true,
          customer: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.saleReturn.count({ where })
    ]);

    return {
      returns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * الحصول على مرتجع واحد
   */
  async getReturnById(returnId: number) {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: returnId },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        sale: {
          include: {
            customer: true,
            lines: {
              include: {
                product: true
              }
            }
          }
        },
        company: true,
        customer: true
      }
    });

    if (!saleReturn) {
      throw new Error('المرتجع غير موجود');
    }

    return saleReturn;
  }

  /**
   * حذف مرتجع (فقط إذا كان في حالة PENDING)
   */
  async deleteReturn(returnId: number) {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: returnId }
    });

    if (!saleReturn) {
      throw new Error('المرتجع غير موجود');
    }

    if (saleReturn.status !== ReturnStatus.PENDING) {
      throw new Error('لا يمكن حذف مرتجع تم معالجته');
    }

    await prisma.saleReturn.delete({
      where: { id: returnId }
    });

    return { message: 'تم حذف المرتجع بنجاح' };
  }

  /**
   * إحصائيات المرتجعات
   */
  async getReturnStats(companyId?: number) {
    const where: any = {};
    if (companyId) where.companyId = companyId;

    const [
      totalReturns,
      pendingReturns,
      approvedReturns,
      processedReturns,
      rejectedReturns,
      totalAmount
    ] = await Promise.all([
      prisma.saleReturn.count({ where }),
      prisma.saleReturn.count({ where: { ...where, status: ReturnStatus.PENDING } }),
      prisma.saleReturn.count({ where: { ...where, status: ReturnStatus.APPROVED } }),
      prisma.saleReturn.count({ where: { ...where, status: ReturnStatus.PROCESSED } }),
      prisma.saleReturn.count({ where: { ...where, status: ReturnStatus.REJECTED } }),
      prisma.saleReturn.aggregate({
        where: { ...where, status: ReturnStatus.PROCESSED },
        _sum: { total: true }
      })
    ]);

    return {
      totalReturns,
      pendingReturns,
      approvedReturns,
      processedReturns,
      rejectedReturns,
      totalAmount: totalAmount._sum.total || 0
    };
  }
}

export default new SaleReturnService();
