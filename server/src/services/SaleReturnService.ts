/**
 * Sale Return Service
 * خدمة المردودات
 */

import { Prisma, Currency, SupplierPaymentType, PaymentReceiptStatus } from '@prisma/client';
import prisma from '../models/prismaClient';
import {
  CreateSaleReturnDto,
  GetSaleReturnsQueryDto,
  CreateReturnPaymentDto,
  GetReturnPaymentsQueryDto
} from '../dto/saleReturnDto';

export class SaleReturnService {
  /**
   * إنشاء مردود مبيعات جديد
   * يدعم المردودات الجزئية والمردودات المنفصلة للتقازي والإمارات
   */
  async createSaleReturn(data: CreateSaleReturnDto, companyId: number) {
    // التحقق من وجود الفاتورة
    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: {
        lines: {
          include: {
            product: {
              include: {
                createdByCompany: true
              }
            }
          }
        },
        customer: true,
        company: true
      }
    });

    if (!sale) {
      throw new Error('الفاتورة غير موجودة');
    }

    // التحقق من أن الفاتورة معتمدة
    if (sale.status !== 'APPROVED') {
      throw new Error('لا يمكن إرجاع منتجات من فاتورة غير معتمدة');
    }

    // التحقق من أن الفاتورة تم تسليمها من المخزن
    const dispatchOrders = await prisma.dispatchOrder.findMany({
      where: { saleId: data.saleId }
    });

    if (dispatchOrders.length === 0) {
      throw new Error('لا يمكن إجراء مردود لفاتورة لم يتم إصدار أمر صرف لها بعد');
    }

    if (dispatchOrders.some(order => order.status === 'PENDING')) {
      throw new Error('لا يمكن إجراء مردود لفاتورة لم يتم تسليمها من المخزن بعد (أمر الصرف حالته معلق)');
    }

    // التحقق من أن الكميات المردودة صحيحة
    for (const returnLine of data.lines) {
      const saleLine = sale.lines.find(l => l.productId === returnLine.productId);
      if (!saleLine) {
        throw new Error(`الصنف غير موجود في الفاتورة الأصلية`);
      }

      // يمكن إضافة تحقق إضافي للكمية المسموح بإرجاعها
      if (returnLine.qty > Number(saleLine.qty)) {
        throw new Error(`الكمية المردودة للصنف ${saleLine.product.name} أكبر من الكمية المباعة`);
      }
    }

    // حساب المجموع الكلي للمردود
    const total = data.lines.reduce((sum, line) => {
      return sum + (line.qty * line.unitPrice);
    }, 0);

    // إنشاء المردود
    const saleReturn = await prisma.$transaction(async (tx) => {
      // إنشاء المردود الرئيسي
      const newReturn = await tx.saleReturn.create({
        data: {
          saleId: data.saleId,
          companyId: companyId,
          customerId: sale.customerId,
          total: total,
          paidAmount: 0,
          remainingAmount: total,
          isFullyPaid: false,
          status: 'PENDING',
          reason: data.reason,
          notes: data.notes,
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
              product: {
                include: {
                  createdByCompany: true
                }
              }
            }
          },
          customer: true,
          sale: true,
          company: true
        }
      });

      // حساب قيمة الرد للشركة الأم والشركة الفرعية منفصلة
      // في حال كانت الفاتورة تحتوي على منتجات من كلا الشركتين
      let parentCompanyReturnValue = 0;
      let branchCompanyReturnValue = 0;

      for (const line of newReturn.lines) {
        const product = line.product;
        // إذا كان المنتج من الشركة الأم (Al-Taqazi)
        if (product.createdByCompany.isParent) {
          parentCompanyReturnValue += Number(line.subTotal);
        } else {
          // المنتج من الشركة الفرعية (Al-Emarat)
          branchCompanyReturnValue += Number(line.subTotal);
        }
      }

      // حفظ قيم الرد المنفصلة في notes كـ metadata
      if (parentCompanyReturnValue > 0 && branchCompanyReturnValue > 0) {
        const metadata = {
          parentCompanyReturnValue,
          branchCompanyReturnValue,
          splitReturn: true
        };

        await tx.saleReturn.update({
          where: { id: newReturn.id },
          data: {
            notes: data.notes
              ? `${data.notes}\n[قيمة الرد - التقازي: ${parentCompanyReturnValue} | الإمارات: ${branchCompanyReturnValue}]`
              : `[قيمة الرد - التقازي: ${parentCompanyReturnValue} | الإمارات: ${branchCompanyReturnValue}]`
          }
        });
      }

      // إنشاء طلب استلام للمخزن
      await tx.returnOrder.create({
        data: {
          saleReturnId: newReturn.id,
          companyId: companyId,
          status: 'PENDING'
        }
      });

      // إنشاء إيصالات مردودات للمحاسب
      // Create return receipts for the accountant

      // 1. الجزء الخاص بالشركة الأم
      if (parentCompanyReturnValue > 0) {
        const parentSupplier = await tx.supplier.findFirst({
          where: {
            OR: [
              { name: { contains: 'تقازي', mode: 'insensitive' } },
              { name: { contains: 'Taqazi', mode: 'insensitive' } },
              { note: { contains: 'الشركة الأم', mode: 'insensitive' } }
            ]
          }
        });

        await tx.supplierPaymentReceipt.create({
          data: {
            supplierId: parentSupplier?.id, // اختياري الآن
            saleReturnId: newReturn.id,
            customerId: newReturn.customerId,
            companyId: companyId,
            amount: new Prisma.Decimal(parentCompanyReturnValue),
            type: SupplierPaymentType.RETURN,
            description: `مردود مبيعات (تقازي): ${newReturn.customer?.name || 'عميل'} - فاتورة #${newReturn.id}`,
            status: PaymentReceiptStatus.PENDING,
            currency: Currency.LYD,
            exchangeRate: new Prisma.Decimal(1),
            notes: newReturn.customer?.name || 'عميل'
          }
        });
      }

      // 2. الجزء الخاص بالشركة الفرعية (أو المحلية)
      if (branchCompanyReturnValue > 0) {
        // البحث عن مورد يمثل الشركة الفرعية إذا لم تكن هي نفس الشركة الحالية
        let branchSupplierId: number | undefined;

        if (companyId !== newReturn.companyId) {
          const branchSupplier = await tx.supplier.findFirst({
            where: {
              name: { contains: newReturn.company.name, mode: 'insensitive' }
            }
          });
          branchSupplierId = branchSupplier?.id;
        }

        await tx.supplierPaymentReceipt.create({
          data: {
            supplierId: branchSupplierId, // قد يكون null للمردودات المحلية
            saleReturnId: newReturn.id,
            customerId: newReturn.customerId,
            companyId: companyId,
            amount: new Prisma.Decimal(branchCompanyReturnValue),
            type: SupplierPaymentType.RETURN,
            description: `مردود مبيعات (إمارات): ${newReturn.customer?.name || 'عميل'} - فاتورة #${newReturn.id}`,
            status: PaymentReceiptStatus.PENDING,
            currency: Currency.LYD,
            exchangeRate: new Prisma.Decimal(1),
            notes: newReturn.customer?.name || 'عميل'
          }
        });
      }

      return newReturn;
    });

    return saleReturn;
  }

  /**
   * الحصول على جميع المردودات مع فلترة وترتيب
   */
  async getSaleReturns(queryDto: GetSaleReturnsQueryDto, companyId: number) {
    const { page, limit, search, saleId, customerId, status, isFullyPaid, startDate, endDate } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: companyId
    };

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { sale: { invoiceNumber: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (saleId) {
      where.saleId = saleId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    if (isFullyPaid !== undefined) {
      where.isFullyPaid = isFullyPaid;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [returns, total] = await Promise.all([
      prisma.saleReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          customer: true,
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      prisma.saleReturn.count({ where })
    ]);

    return {
      data: returns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * الحصول على مردود واحد بالمعرف
   */
  async getSaleReturnById(id: number, companyId: number) {
    const saleReturn = await prisma.saleReturn.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        customer: true,
        sale: {
          include: {
            lines: {
              include: {
                product: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!saleReturn) {
      throw new Error('المردود غير موجود');
    }

    return saleReturn;
  }

  /**
   * اعتماد مردود المبيعات
   * عند الاعتماد يتم إرجاع المنتجات إلى المخزون
   */
  async approveSaleReturn(id: number, companyId: number) {
    const saleReturn = await this.getSaleReturnById(id, companyId);

    if (saleReturn.status === 'APPROVED') {
      throw new Error('المردود معتمد مسبقاً');
    }

    if (saleReturn.status === 'REJECTED') {
      throw new Error('لا يمكن اعتماد مردود مرفوض');
    }

    // اعتماد المردود وإرجاع المخزون
    const updated = await prisma.$transaction(async (tx) => {
      // تحديث حالة المردود
      const updatedReturn = await tx.saleReturn.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedAt: new Date()
        },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          customer: true,
          sale: true,
          payments: true
        }
      });

      // إرجاع المنتجات إلى المخزون
      // 🟢 تحسين: معالجة مجمعة لتجنب N+1

      // 1. جلب جميع المنتجات دفعة واحدة لمعرفة الشركة المنشئة
      const productIds = updatedReturn.lines.map(l => l.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { createdByCompany: true }
      });

      const productsMap = new Map();
      products.forEach(p => productsMap.set(p.id, p));

      // 2. تحديد مفاتيح المخزون (Product + Company)
      const stockKeys = updatedReturn.lines.map(line => {
        const product = productsMap.get(line.productId);
        if (!product) throw new Error(`المنتج ${line.productId} غير موجود`);
        return {
          productId: line.productId,
          companyId: product.createdByCompanyId
        };
      });

      // 3. جلب المخزون الحالي دفعة واحدة
      const stocks = await tx.stock.findMany({
        where: {
          OR: stockKeys
        }
      });

      const stocksMap = new Map(); // Key: "productId-companyId"
      stocks.forEach(s => stocksMap.set(`${s.productId}-${s.companyId}`, s));

      // 4. إعداد التحديثات المجمعة
      const stockUpdates = updatedReturn.lines.map(line => {
        const product = productsMap.get(line.productId);
        const targetCompanyId = product.createdByCompanyId;
        const boxesToAdd = Number(line.qty);

        return tx.stock.upsert({
          where: {
            companyId_productId: {
              companyId: targetCompanyId,
              productId: line.productId
            }
          },
          update: {
            boxes: { increment: boxesToAdd }
          },
          create: {
            companyId: targetCompanyId,
            productId: line.productId,
            boxes: boxesToAdd
          }
        });
      });

      // 5. تنفيذ التحديثات
      await Promise.all(stockUpdates);

      // 6. تحديث كشف حساب العميل (إضافة رصيد دائن للمردود)
      if (updatedReturn.customerId) {
        console.log(`[DEBUG] Creating CustomerAccount entry for Return #${updatedReturn.id}`);
        try {
          const CustomerAccountService = (await import('./CustomerAccountService')).default;
          await CustomerAccountService.createAccountEntry({
            customerId: updatedReturn.customerId,
            transactionType: 'CREDIT', // PrismaClient will handle string to enum mapping
            amount: Number(updatedReturn.total),
            referenceType: 'RETURN',   // PrismaClient will handle string to enum mapping
            referenceId: updatedReturn.id,
            description: `مردود مبيعات - فاتورة #${updatedReturn.sale.invoiceNumber || updatedReturn.sale.id}`,
            transactionDate: new Date()
          }, tx);
          console.log(`[DEBUG] Created Account Entry for Return #${updatedReturn.id}`);
        } catch (error) {
          console.error(`[ERROR] Failed to create Account Entry for Return #${updatedReturn.id}:`, error);
          throw error; // Re-throw to fail the transaction
        }
      }

      return updatedReturn;
    });

    return updated;
  }

  /**
   * رفض مردود المبيعات
   */
  async rejectSaleReturn(id: number, companyId: number) {
    const saleReturn = await this.getSaleReturnById(id, companyId);

    if (saleReturn.status === 'APPROVED') {
      throw new Error('لا يمكن رفض مردود معتمد');
    }

    if (saleReturn.status === 'REJECTED') {
      throw new Error('المردود مرفوض مسبقاً');
    }

    const updated = await prisma.saleReturn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processedAt: new Date()
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        customer: true,
        sale: true,
        payments: true
      }
    });

    return updated;
  }

  /**
   * حذف مردود (فقط إذا كان قيد الانتظار)
   */
  async deleteSaleReturn(id: number, companyId: number) {
    const saleReturn = await this.getSaleReturnById(id, companyId);

    if (saleReturn.status !== 'PENDING') {
      throw new Error('لا يمكن حذف مردود معتمد أو مرفوض');
    }

    await prisma.saleReturn.delete({
      where: { id }
    });

    return { success: true, message: 'تم حذف المردود بنجاح' };
  }

  // ==================== Return Payments ====================

  /**
   * إضافة دفعة لمردود المبيعات
   */
  async createReturnPayment(data: CreateReturnPaymentDto, companyId: number) {
    const saleReturn = await this.getSaleReturnById(data.saleReturnId, companyId);

    // التحقق من أن المردود معتمد
    if (saleReturn.status !== 'APPROVED') {
      throw new Error('لا يمكن إضافة دفعة لمردود غير معتمد');
    }

    // التحقق من أن المبلغ لا يتجاوز المبلغ المتبقي
    if (data.amount > Number(saleReturn.remainingAmount)) {
      throw new Error(`المبلغ يتجاوز المبلغ المتبقي (${saleReturn.remainingAmount})`);
    }

    const payment = await prisma.$transaction(async (tx) => {
      // إنشاء الدفعة
      const newPayment = await tx.returnPayment.create({
        data: {
          saleReturnId: data.saleReturnId,
          companyId: companyId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          notes: data.notes
        }
      });

      // تحديث المبلغ المدفوع والمتبقي في المردود
      const newPaidAmount = Number(saleReturn.paidAmount) + data.amount;
      const newRemainingAmount = Number(saleReturn.total) - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      await tx.saleReturn.update({
        where: { id: data.saleReturnId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid: isFullyPaid
        }
      });

      // 1. الخصم من الخزينة
      const treasury = await tx.treasury.findFirst({
        where: {
          companyId: companyId,
          isActive: true
        }
      });

      if (treasury) {
        const { TreasuryController } = await import('../controllers/TreasuryController');
        await TreasuryController.withdrawFromTreasury(
          treasury.id,
          data.amount,
          'PAYMENT' as any,
          'ReturnPayment',
          newPayment.id,
          `دفع مبلغ مردود مبيعات - رقم المردود #${saleReturn.id}`,
          undefined // createdBy
        );
      }

      // 2. تحديث كشف حساب العميل (إضافة رصيد مدين للمبلغ المصروف)
      if (saleReturn.customerId) {
        const CustomerAccountService = (await import('./CustomerAccountService')).default;
        await CustomerAccountService.createAccountEntry({
          customerId: saleReturn.customerId,
          transactionType: 'DEBIT' as any, // DEBIT (عليه) = استلم مالاً منا (تسديد مردود)
          amount: data.amount,
          referenceType: 'PAYMENT' as any,
          referenceId: newPayment.id,
          description: `تسديد مبلغ مردود - رقم المردود #${saleReturn.id}`,
          transactionDate: new Date()
        }, tx);
      }

      return newPayment;
    });

    return payment;
  }

  /**
   * الحصول على دفعات المردودات
   */
  async getReturnPayments(queryDto: GetReturnPaymentsQueryDto, companyId: number) {
    const { page, limit, saleReturnId, startDate, endDate } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: companyId
    };

    if (saleReturnId) {
      where.saleReturnId = saleReturnId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const [payments, total] = await Promise.all([
      prisma.returnPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          saleReturn: {
            include: {
              customer: true,
              sale: {
                select: {
                  invoiceNumber: true
                }
              }
            }
          }
        }
      }),
      prisma.returnPayment.count({ where })
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * حذف دفعة مردود
   */
  async deleteReturnPayment(paymentId: number, companyId: number) {
    const payment = await prisma.returnPayment.findFirst({
      where: {
        id: paymentId,
        companyId
      },
      include: {
        saleReturn: true
      }
    });

    if (!payment) {
      throw new Error('الدفعة غير موجودة');
    }

    await prisma.$transaction(async (tx) => {
      // حذف الدفعة
      await tx.returnPayment.delete({
        where: { id: paymentId }
      });

      // تحديث المبلغ المدفوع والمتبقي
      const newPaidAmount = Number(payment.saleReturn.paidAmount) - Number(payment.amount);
      const newRemainingAmount = Number(payment.saleReturn.total) - newPaidAmount;
      const isFullyPaid = newRemainingAmount <= 0;

      await tx.saleReturn.update({
        where: { id: payment.saleReturnId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          isFullyPaid: isFullyPaid
        }
      });
    });

    return { success: true, message: 'تم حذف الدفعة بنجاح' };
  }
}
