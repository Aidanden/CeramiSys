/**
 * Warehouse Service
 * خدمة أوامر صرف المخزن
 */

import { DispatchOrderStatus } from '@prisma/client';
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
      console.log('🚀 بدء عملية إنشاء أمر صرف...');

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

      console.log(`📋 الفاتورة: ${sale.invoiceNumber} (ID: ${sale.id})`);
      console.log(`🏢 الشركة: ${sale.company.name}`);
      console.log(`📊 relatedParentSaleId: ${sale.relatedParentSaleId}`);

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

      console.log(`✅ تم إنشاء أمر الصرف بنجاح (ID: ${dispatchOrder.id})`);

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
      if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
        throw new Error('Cannot update a completed or cancelled dispatch order');
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

      const dispatchOrder = await this.prisma.dispatchOrder.update({
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

        // إذا اكتمل الاستلام، نحدث حالة المردود في الشاشة الرئيسية
        if (data.status === 'COMPLETED') {
          await tx.saleReturn.update({
            where: { id: updated.saleReturnId },
            data: { status: 'RECEIVED_WAREHOUSE' as any }
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
