/**
 * Sales Service
 * خدمة المبيعات
 */

import { PrismaClient } from '@prisma/client';
import { CreateSaleDto, UpdateSaleDto, GetSalesQueryDto, CreateCustomerDto, UpdateCustomerDto, GetCustomersQueryDto } from '../dto/salesDto';

export class SalesService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * إنشاء فاتورة مبيعات جديدة
   */
  async createSale(data: CreateSaleDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // التحقق من وجود العميل إذا تم تحديده
      if (data.customerId) {
        const customer = await this.prisma.customer.findUnique({
          where: { id: data.customerId }
        });
        if (!customer) {
          throw new Error('العميل غير موجود');
        }
      }

      // التحقق من وجود الأصناف والمخزون
      const productIds = data.lines.map(line => line.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
        },
        include: {
          stocks: {
            where: { companyId: userCompanyId }
          },
          prices: {
            where: { companyId: userCompanyId }
          }
        }
      });

      if (products.length !== productIds.length) {
        throw new Error('بعض الأصناف غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      // التحقق من توفر المخزون
      for (const line of data.lines) {
        const product = products.find(p => p.id === line.productId);
        if (!product) continue;

        const stock = product.stocks[0];
        if (!stock || Number(stock.boxes) < line.qty) {
          throw new Error(`المخزون غير كافي للصنف: ${product.name}`);
        }
      }

      // حساب المجموع الإجمالي
      let total = 0;
      for (const line of data.lines) {
        const subTotal = line.qty * line.unitPrice;
        total += subTotal;
      }

      // إنشاء الفاتورة
      const sale = await this.prisma.sale.create({
        data: {
          companyId: userCompanyId,
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          total: total,
          saleType: data.saleType,
          paymentMethod: data.paymentMethod,
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
          customer: true,
          company: {
            select: { id: true, name: true, code: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
              }
            }
          }
        }
      });

      // تحديث المخزون
      for (const line of data.lines) {
        await this.prisma.stock.update({
          where: {
            companyId_productId: {
              companyId: userCompanyId,
              productId: line.productId
            }
          },
          data: {
            boxes: {
              decrement: line.qty
            }
          }
        });
      }

      return {
        id: sale.id,
        companyId: sale.companyId,
        company: sale.company,
        customerId: sale.customerId,
        customer: sale.customer,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        lines: sale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: line.product,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        }))
      };
    } catch (error) {
      console.error('خطأ في إنشاء فاتورة المبيعات:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة المبيعات
   */
  async getSales(query: GetSalesQueryDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: any = {
        ...(isSystemUser !== true && { companyId: userCompanyId })
      };

      if (query.search) {
        where.OR = [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } }
        ];
      }

      if (query.customerId) {
        where.customerId = query.customerId;
      }

      if (query.saleType) {
        where.saleType = query.saleType;
      }

      if (query.paymentMethod) {
        where.paymentMethod = query.paymentMethod;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      // الحصول على المبيعات
      const [sales, total] = await Promise.all([
        this.prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            company: {
              select: { id: true, name: true, code: true }
            },
            lines: {
              include: {
                product: {
                  select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
                }
              }
            }
          }
        }),
        this.prisma.sale.count({ where })
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'تم جلب المبيعات بنجاح',
        data: {
          sales: sales.map(sale => ({
            id: sale.id,
            companyId: sale.companyId,
            company: sale.company,
            customerId: sale.customerId,
            customer: sale.customer,
            invoiceNumber: sale.invoiceNumber,
            total: Number(sale.total),
            saleType: sale.saleType,
            paymentMethod: sale.paymentMethod,
            createdAt: sale.createdAt,
            lines: sale.lines.map(line => ({
              id: line.id,
              productId: line.productId,
              product: line.product,
              qty: Number(line.qty),
              unitPrice: Number(line.unitPrice),
              subTotal: Number(line.subTotal)
            }))
          })),
          pagination: {
            page,
            limit,
            total,
            pages
          }
        }
      };
    } catch (error) {
      console.error('خطأ في جلب المبيعات:', error);
      throw error;
    }
  }

  /**
   * الحصول على فاتورة مبيعات واحدة
   */
  async getSaleById(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const sale = await this.prisma.sale.findFirst({
        where: {
          id,
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          customer: true,
          company: {
            select: { id: true, name: true, code: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
              }
            }
          }
        }
      });

      if (!sale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      return {
        id: sale.id,
        companyId: sale.companyId,
        company: sale.company,
        customerId: sale.customerId,
        customer: sale.customer,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        lines: sale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: line.product,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        }))
      };
    } catch (error) {
      console.error('خطأ في جلب الفاتورة:', error);
      throw error;
    }
  }

  /**
   * تحديث فاتورة مبيعات
   */
  async updateSale(id: number, data: UpdateSaleDto, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // التحقق من وجود الفاتورة
      const existingSale = await this.prisma.sale.findFirst({
        where: {
          id,
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          lines: true
        }
      });

      if (!existingSale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية لتعديلها');
      }

      // إذا تم تحديث البنود، نحتاج لإعادة حساب المخزون
      if (data.lines) {
        // إرجاع المخزون للحالة السابقة
        for (const line of existingSale.lines) {
          await this.prisma.stock.update({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            data: {
              boxes: {
                increment: Number(line.qty)
              }
            }
          });
        }

        // التحقق من توفر المخزون للبنود الجديدة
        const productIds = data.lines.map(line => line.productId);
        const products = await this.prisma.product.findMany({
          where: {
            id: { in: productIds },
            ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
          },
          include: {
            stocks: {
              where: { companyId: userCompanyId }
            }
          }
        });

        for (const line of data.lines) {
          const product = products.find(p => p.id === line.productId);
          if (!product) continue;

          const stock = product.stocks[0];
          if (!stock || Number(stock.boxes) < line.qty) {
            throw new Error(`المخزون غير كافي للصنف: ${product.name}`);
          }
        }

        // حذف البنود القديمة
        await this.prisma.saleLine.deleteMany({
          where: { saleId: id }
        });
      }

      // حساب المجموع الجديد
      let total = Number(existingSale.total);
      if (data.lines) {
        total = 0;
        for (const line of data.lines) {
          total += line.qty * line.unitPrice;
        }
      }

      // تحديث الفاتورة
      const updatedSale = await this.prisma.sale.update({
        where: { id },
        data: {
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          saleType: data.saleType,
          paymentMethod: data.paymentMethod,
          total: data.lines ? total : undefined,
          ...(data.lines && {
            lines: {
              create: data.lines.map(line => ({
                productId: line.productId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                subTotal: line.qty * line.unitPrice
              }))
            }
          })
        },
        include: {
          customer: true,
          company: {
            select: { id: true, name: true, code: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true }
              }
            }
          }
        }
      });

      // تحديث المخزون للبنود الجديدة
      if (data.lines) {
        for (const line of data.lines) {
          await this.prisma.stock.update({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            data: {
              boxes: {
                decrement: line.qty
              }
            }
          });
        }
      }

      return {
        id: updatedSale.id,
        companyId: updatedSale.companyId,
        company: updatedSale.company,
        customerId: updatedSale.customerId,
        customer: updatedSale.customer,
        invoiceNumber: updatedSale.invoiceNumber,
        total: Number(updatedSale.total),
        saleType: updatedSale.saleType,
        paymentMethod: updatedSale.paymentMethod,
        createdAt: updatedSale.createdAt,
        lines: updatedSale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: line.product,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        }))
      };
    } catch (error) {
      console.error('خطأ في تحديث الفاتورة:', error);
      throw error;
    }
  }

  /**
   * حذف فاتورة مبيعات
   */
  async deleteSale(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // التحقق من وجود الفاتورة
      const existingSale = await this.prisma.sale.findFirst({
        where: {
          id,
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          lines: true
        }
      });

      if (!existingSale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية لحذفها');
      }

      // إرجاع المخزون
      for (const line of existingSale.lines) {
        await this.prisma.stock.update({
          where: {
            companyId_productId: {
              companyId: userCompanyId,
              productId: line.productId
            }
          },
          data: {
            boxes: {
              increment: Number(line.qty)
            }
          }
        });
      }

      // حذف الفاتورة (سيتم حذف البنود تلقائياً بسبب cascade)
      await this.prisma.sale.delete({
        where: { id }
      });

      return { message: 'تم حذف الفاتورة بنجاح' };
    } catch (error) {
      console.error('خطأ في حذف الفاتورة:', error);
      throw error;
    }
  }

  /**
   * إحصائيات المبيعات
   */
  async getSalesStats(userCompanyId: number, isSystemUser: boolean = false) {
    try {
      const where: any = {
        ...(isSystemUser !== true && { companyId: userCompanyId })
      };

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      const [
        totalSales,
        todaySales,
        monthSales,
        yearSales,
        totalRevenue,
        todayRevenue,
        monthRevenue,
        yearRevenue
      ] = await Promise.all([
        this.prisma.sale.count({ where }),
        this.prisma.sale.count({ where: { ...where, createdAt: { gte: startOfDay } } }),
        this.prisma.sale.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
        this.prisma.sale.count({ where: { ...where, createdAt: { gte: startOfYear } } }),
        this.prisma.sale.aggregate({ where, _sum: { total: true } }),
        this.prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { total: true } }),
        this.prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { total: true } }),
        this.prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { total: true } })
      ]);

      return {
        success: true,
        message: 'تم جلب إحصائيات المبيعات بنجاح',
        data: {
          totalSales,
          todaySales,
          monthSales,
          yearSales,
          totalRevenue: Number(totalRevenue._sum.total || 0),
          todayRevenue: Number(todayRevenue._sum.total || 0),
          monthRevenue: Number(monthRevenue._sum.total || 0),
          yearRevenue: Number(yearRevenue._sum.total || 0)
        }
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات المبيعات:', error);
      throw error;
    }
  }

  // ============== إدارة العملاء ==============

  /**
   * إنشاء عميل جديد
   */
  async createCustomer(data: CreateCustomerDto) {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          note: data.note
        }
      });

      return customer;
    } catch (error) {
      console.error('خطأ في إنشاء العميل:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة العملاء
   */
  async getCustomers(query: GetCustomersQueryDto) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.customer.count({ where })
      ]);

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'تم جلب العملاء بنجاح',
        data: {
          customers,
          pagination: {
            page,
            limit,
            total,
            pages
          }
        }
      };
    } catch (error) {
      console.error('خطأ في جلب العملاء:', error);
      throw error;
    }
  }

  /**
   * الحصول على عميل واحد
   */
  async getCustomerById(id: number) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          sales: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!customer) {
        throw new Error('العميل غير موجود');
      }

      return customer;
    } catch (error) {
      console.error('خطأ في جلب العميل:', error);
      throw error;
    }
  }

  /**
   * تحديث عميل
   */
  async updateCustomer(id: number, data: UpdateCustomerDto) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id }
      });

      if (!existingCustomer) {
        throw new Error('العميل غير موجود');
      }

      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          note: data.note
        }
      });

      return customer;
    } catch (error) {
      console.error('خطأ في تحديث العميل:', error);
      throw error;
    }
  }

  /**
   * حذف عميل
   */
  async deleteCustomer(id: number) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          sales: true
        }
      });

      if (!existingCustomer) {
        throw new Error('العميل غير موجود');
      }

      if (existingCustomer.sales.length > 0) {
        throw new Error('لا يمكن حذف العميل لأن لديه فواتير مرتبطة');
      }

      await this.prisma.customer.delete({
        where: { id }
      });

      return { message: 'تم حذف العميل بنجاح' };
    } catch (error) {
      console.error('خطأ في حذف العميل:', error);
      throw error;
    }
  }
}
