import { DispatchOrderStatus, Currency, Prisma, SupplierPaymentType, PaymentReceiptStatus } from '@prisma/client';
import prisma from '../models/prismaClient';
import { PaymentMethod } from '../dto/salesDto';

export interface CreateDispatchOrderDto {
  saleId: number;
  notes?: string;
}

export interface UpdateDispatchOrderStatusDto {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface GetDispatchOrdersQueryDto {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class WarehouseService {
  private prisma = prisma; // Use singleton

  /**
   * الحصول على جميع أوامر الصرف
   */
  async getDispatchOrders(query: GetDispatchOrdersQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: any = {};

      // للمستخدمين العاديين: إظهار أوامر الصرف الخاصة بشركتهم فقط
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      // فلترة حسب الحالة
      if (query.status) {
        where.status = query.status;
      }

      // البحث برقم الفاتورة أو اسم العميل أو رقم الهاتف
      if (query.search) {
        where.sale = {
          OR: [
            { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            { customer: { phone: { contains: query.search, mode: 'insensitive' } } }
          ]
        };
      }

      // فلترة حسب التاريخ
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      // جلب البيانات
      const [dispatchOrders, total] = await Promise.all([
        this.prisma.dispatchOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sale: {
              include: {
                customer: {
                  select: { id: true, name: true, phone: true }
                },
                company: {
                  select: { id: true, name: true, code: true }
                },
                lines: {
                  include: {
                    product: {
                      select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true }
                    }
                  }
                }
              }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            completedByUser: {
              select: { UserID: true, FullName: true }
            }
          }
        }),
        this.prisma.dispatchOrder.count({ where })
      ]);

      return {
        dispatchOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching dispatch orders:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع طلبات الاستلام (المردودات)
   */
  async getReturnOrders(query: GetDispatchOrdersQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.search) {
        where.saleReturn = {
          OR: [
            { returnNumber: { contains: query.search, mode: 'insensitive' } },
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            { sale: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } }
          ]
        };
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const [returnOrders, total] = await Promise.all([
        this.prisma.returnOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            saleReturn: {
              include: {
                customer: {
                  select: { id: true, name: true, phone: true }
                },
                sale: {
                  select: { id: true, invoiceNumber: true }
                },
                lines: {
                  include: {
                    product: {
                      select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true }
                    }
                  }
                }
              }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            completedByUser: {
              select: { UserID: true, FullName: true }
            }
          }
        }),
        this.prisma.returnOrder.count({ where })
      ]);

      return {
        returnOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching return orders:', error);
      throw error;
    }
  }

  /**
   * الحصول على أمر صرف واحد
   */
  async getDispatchOrderById(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const where: any = { id };

      // للمستخدمين العاديين: التحقق من أن الأمر يخص شركتهم
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      const dispatchOrder = await this.prisma.dispatchOrder.findFirst({
        where,
        include: {
          sale: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true }
              },
              company: {
                select: { id: true, name: true, code: true }
              },
              lines: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true }
                  }
                }
              }
            }
          },
          company: {
            select: { id: true, name: true, code: true }
          },
          completedByUser: {
            select: { UserID: true, FullName: true }
          }
        }
      });

      if (!dispatchOrder) {
        throw new Error('Dispatch order not found');
      }

      return dispatchOrder;
    } catch (error) {
      console.error('Error fetching dispatch order:', error);
      throw error;
    }
  }

  /**
   * إنشاء أمر صرف جديد
   * الصلاحيات على مستوى الشاشة - من يدخل شاشة المحاسب يمكنه إنشاء أمر صرف لأي فاتورة
   * 
   * ملاحظة: عند إنشاء أمر صرف، سيتم أيضاً:
   * 1. اعتماد الفاتورة التلقائية المرتبطة (إن وجدت)
   * 2. إنشاء دفعة تلقائية لتسديد قيمة الفاتورة التلقائية
   */
  async createDispatchOrder(data: CreateDispatchOrderDto) {
    try {
      // التحقق من وجود الفاتورة
      const sale = await this.prisma.sale.findUnique({
        where: { id: data.saleId },
        include: {
          company: true,
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // لا يوجد تحقق من الشركة - الصلاحيات على مستوى الشاشة
      // من يستطيع الدخول على شاشة المحاسب يستطيع إنشاء أمر صرف لأي فاتورة

      // التحقق من عدم وجود أمر صرف معلق أو قيد المعالجة لنفس الفاتورة
      const existingOrder = await this.prisma.dispatchOrder.findFirst({
        where: {
          saleId: data.saleId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        }
      });

      if (existingOrder) {
        throw new Error('An active dispatch order already exists for this sale');
      }

      // إنشاء أمر الصرف
      const dispatchOrder = await this.prisma.dispatchOrder.create({
        data: {
          saleId: data.saleId,
          companyId: sale.companyId,
          notes: data.notes,
          status: 'PENDING'
        },
        include: {
          sale: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true }
              },
              company: {
                select: { id: true, name: true, code: true }
              },
              lines: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true }
                  }
                }
              }
            }
          },
          company: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      return dispatchOrder;
    } catch (error) {
      console.error('Error creating dispatch order:', error);
      throw error;
    }
  }


  /**
   * تحديث حالة أمر الصرف
   */
  async updateDispatchOrderStatus(
    id: number,
    data: UpdateDispatchOrderStatusDto,
    userId: string,
    userCompanyId: number,
    isSystemUser: boolean = false
  ) {
    try {
      // التحقق من وجود أمر الصرف
      const where: any = { id };
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      const existingOrder = await this.prisma.dispatchOrder.findFirst({
        where
      });

      if (!existingOrder) {
        throw new Error('Dispatch order not found');
      }

      // التحقق من إمكانية تغيير الحالة
      // السماح بتغيير الحالة من ملغي إلى تم التسليم بناءً على طلب المستخدم
      if (existingOrder.status === 'COMPLETED' || (existingOrder.status === 'CANCELLED' && data.status !== 'COMPLETED')) {
        throw new Error('لا يمكن تحديث أمر صرف مكتمل أو ملغي (إلا إذا كنت تريد تحويله من ملغي إلى تم التسليم)');
      }

      // تحديث البيانات
      const updateData: any = {
        status: data.status,
        notes: data.notes || existingOrder.notes,
        updatedAt: new Date()
      };

      // إذا تم إتمام الصرف، حفظ تاريخ الإتمام والمستخدم
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
      }

      // استخدام transaction لضمان تنفيذ جميع العمليات معاً
      const dispatchOrder = await this.prisma.$transaction(async (tx) => {
        // 1. تحديث حالة أمر الصرف
        const updatedOrder = await tx.dispatchOrder.update({
          where: { id },
          data: updateData,
          include: {
            sale: {
              include: {
                customer: {
                  select: { id: true, name: true, phone: true }
                },
                company: {
                  select: { id: true, name: true, code: true }
                },
                lines: {
                  include: {
                    product: {
                      select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true }
                    }
                  }
                }
              }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            completedByUser: {
              select: { UserID: true, FullName: true }
            }
          }
        });

        // 2. إذا تم الإتمام، نحدث الحالة فقط (تخصم الكميات عند اعتماد الفاتورة من المحاسب)
        // تم إزالة كود خصم المخزون من هنا لمنع الخصم المزدوج
        if (data.status === 'COMPLETED') {
          console.log(`✅ تم إتمام أمر الصرف #${id} (يتم خصم المخزون مسبقاً عند اعتماد الفاتورة)`);
        }

        return updatedOrder;
      });

      return dispatchOrder;
    } catch (error) {
      console.error('Error updating dispatch order status:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة طلب الاستلام (المردود)
   */
  async updateReturnOrderStatus(
    id: number,
    data: UpdateDispatchOrderStatusDto,
    userId: string,
    userCompanyId: number,
    isSystemUser: boolean = false
  ) {
    try {
      const where: any = { id };
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      const existingOrder = await this.prisma.returnOrder.findFirst({
        where
      });

      if (!existingOrder) {
        throw new Error('Return order not found');
      }

      if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
        throw new Error('Cannot update a completed or cancelled return order');
      }

      const updateData: any = {
        status: data.status,
        notes: data.notes || existingOrder.notes,
        updatedAt: new Date()
      };

      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
      }

      const returnOrder = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.returnOrder.update({
          where: { id },
          data: updateData,
          include: {
            saleReturn: {
              include: {
                customer: {
                  select: { id: true, name: true, phone: true }
                },
                sale: {
                  select: { id: true, invoiceNumber: true }
                },
                company: {
                  select: { id: true, name: true, code: true }
                },
                lines: {
                  include: {
                    product: {
                      include: {
                        createdByCompany: true
                      }
                    }
                  }
                }
              }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            completedByUser: {
              select: { UserID: true, FullName: true }
            }
          }
        });

        // إذا اكتمل الاستلام، نحدث حالة المردود في الشاشة الرئيسية
        if (data.status === 'COMPLETED') {
          // تحديث الحالة إلى APPROVED مباشرة ليظهر في المالية
          await tx.saleReturn.update({
            where: { id: updated.saleReturnId },
            data: { status: 'APPROVED' as any }
          });

          // 📦 عند استلام المردود في المخزن، نعيد الكميات إلى مخزون الشركة صاحبة أمر الاستلام
          const lines = updated.saleReturn?.lines || [];
          if (lines.length > 0) {
            const stockUpdates = lines.map((line: any) => {
              const productId = line.productId;
              const boxesToAdd = Number(line.qty);
              const stockCompanyId = updated.companyId; // مخزن هذه الشركة

              return tx.stock.upsert({
                where: {
                  companyId_productId: {
                    companyId: stockCompanyId,
                    productId
                  }
                },
                update: {
                  boxes: { increment: boxesToAdd }
                },
                create: {
                  companyId: stockCompanyId,
                  productId,
                  boxes: boxesToAdd
                }
              });
            });

            await Promise.all(stockUpdates);
          }

          // 💰 إنشاء الإيصالات المالية وتحديث حساب العميل
          const updatedReturn = updated.saleReturn;
          if (updatedReturn) {
            let parentCompanyReturnValue = 0;
            let branchCompanyReturnValue = 0;

            for (const line of updatedReturn.lines) {
              // @ts-ignore
              const product = line.product;
              // @ts-ignore
              if (product && product.createdByCompany && product.createdByCompany.isParent) {
                parentCompanyReturnValue += Number(line.subTotal);
              } else {
                branchCompanyReturnValue += Number(line.subTotal);
              }
            }

            // أ. الشركة الأم
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
                  supplierId: parentSupplier?.id,
                  saleReturnId: updatedReturn.id,
                  customerId: updatedReturn.customerId,
                  companyId: updated.companyId,
                  amount: new Prisma.Decimal(parentCompanyReturnValue),
                  type: SupplierPaymentType.RETURN,
                  description: `مردود مبيعات (تقازي): ${updatedReturn.customer?.name || 'عميل'} - فاتورة #${updatedReturn.sale?.invoiceNumber || updatedReturn.saleId}`,
                  status: PaymentReceiptStatus.PENDING,
                  currency: Currency.LYD,
                  exchangeRate: new Prisma.Decimal(1),
                  notes: updatedReturn.customer?.name || 'عميل'
                }
              });
            }

            // ب. الشركة الفرعية
            if (branchCompanyReturnValue > 0) {
              let branchSupplierId: number | undefined;
              // @ts-ignore
              if (updated.companyId !== updatedReturn.companyId) { // updatedReturn.companyId usually references Sale's company
                const branchSupplier = await tx.supplier.findFirst({
                  where: {
                    // @ts-ignore
                    name: { contains: updatedReturn.company?.name || '', mode: 'insensitive' }
                  }
                });
                branchSupplierId = branchSupplier?.id;
              }

              await tx.supplierPaymentReceipt.create({
                data: {
                  supplierId: branchSupplierId,
                  saleReturnId: updatedReturn.id,
                  customerId: updatedReturn.customerId,
                  companyId: updated.companyId,
                  amount: new Prisma.Decimal(branchCompanyReturnValue),
                  type: SupplierPaymentType.RETURN,
                  description: `مردود مبيعات (إمارات): ${updatedReturn.customer?.name || 'عميل'} - فاتورة #${updatedReturn.sale?.invoiceNumber || updatedReturn.saleId}`,
                  status: PaymentReceiptStatus.PENDING,
                  currency: Currency.LYD,
                  exchangeRate: new Prisma.Decimal(1),
                  notes: updatedReturn.customer?.name || 'عميل'
                }
              });
            }

            // ج. تحديث كشف حساب العميل
            if (updatedReturn.customerId) {
              try {
                const CustomerAccountService = (await import('./CustomerAccountService')).default;
                await CustomerAccountService.createAccountEntry({
                  customerId: updatedReturn.customerId,
                  transactionType: 'CREDIT',
                  amount: Number(updatedReturn.total),
                  referenceType: 'RETURN',
                  referenceId: updatedReturn.id,
                  description: `مردود مبيعات - فاتورة #${updatedReturn.sale?.invoiceNumber || updatedReturn.saleId}`,
                  transactionDate: new Date()
                }, tx);
              } catch (error) {
                console.error(`[ERROR] Failed to create Account Entry for Return #${updatedReturn.id}:`, error);
              }
            }
          }
        }

        // إذا تم رفض الاستلام (إلغاء الأمر)، نحدث حالة المردود إلى مرفوض
        else if (data.status === 'CANCELLED') {
          await tx.saleReturn.update({
            where: { id: updated.saleReturnId },
            data: { status: 'REJECTED' as any }
          });
        }

        return updated;
      });

      return returnOrder;
    } catch (error) {
      console.error('Error updating return order status:', error);
      throw error;
    }
  }

  /**
   * حذف أمر صرف
   */
  async deleteDispatchOrder(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const where: any = { id };
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      const existingOrder = await this.prisma.dispatchOrder.findFirst({
        where
      });

      if (!existingOrder) {
        throw new Error('Dispatch order not found');
      }

      // لا يمكن حذف أمر مكتمل
      if (existingOrder.status === 'COMPLETED') {
        throw new Error('Cannot delete a completed dispatch order');
      }

      await this.prisma.dispatchOrder.delete({
        where: { id }
      });

      return { message: 'Dispatch order deleted successfully' };
    } catch (error) {
      console.error('Error deleting dispatch order:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات أوامر الصرف
   */
  async getDispatchOrderStats(userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const where: any = {};
      if (!isSystemUser) {
        where.companyId = userCompanyId;
      }

      const [total, pending, inProgress, completed] = await Promise.all([
        this.prisma.dispatchOrder.count({ where }),
        this.prisma.dispatchOrder.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.dispatchOrder.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        this.prisma.dispatchOrder.count({ where: { ...where, status: 'COMPLETED' } })
      ]);

      return {
        total,
        pending,
        inProgress,
        completed
      };
    } catch (error) {
      console.error('Error fetching dispatch order stats:', error);
      throw error;
    }
  }
}
