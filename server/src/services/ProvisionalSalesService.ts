/**
 * Provisional Sales Service
 * خدمة الفواتير المبدئية
 */

import { PrismaClient, ProvisionalSale, ProvisionalSaleLine, Prisma } from '@prisma/client';
import { 
  CreateProvisionalSaleDto, 
  UpdateProvisionalSaleDto, 
  GetProvisionalSalesQueryDto,
  ConvertToSaleDto,
  ProvisionalSaleResponseDto,
  ProvisionalSalesListResponseDto,
  ProvisionalSaleStatus
} from '../dto/provisionalSalesDto';

const prisma = new PrismaClient();

export class ProvisionalSalesService {

  // ============== إنشاء فاتورة مبدئية جديدة ==============

  async createProvisionalSale(data: CreateProvisionalSaleDto): Promise<ProvisionalSaleResponseDto> {
    try {
      // التحقق من وجود الشركة
      const company = await prisma.company.findUnique({
        where: { id: data.companyId }
      });

      if (!company) {
        throw new Error('الشركة غير موجودة');
      }

      // التحقق من وجود العميل إذا تم تحديده
      if (data.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: data.customerId }
        });

        if (!customer) {
          throw new Error('العميل غير موجود');
        }
      }

      // التحقق من وجود المنتجات
      const productIds = data.lines.map(line => line.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });

      if (products.length !== productIds.length) {
        throw new Error('بعض المنتجات غير موجودة');
      }

      // حساب المجموع الكلي
      const total = new Prisma.Decimal(
        data.lines.reduce((sum, line) => {
          return sum + (line.qty * line.unitPrice);
        }, 0)
      );

      // إنشاء الفاتورة المبدئية مع السطور
      const provisionalSale = await prisma.provisionalSale.create({
        data: {
          companyId: data.companyId,
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          total: total,
          status: data.status,
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
          company: {
            select: { id: true, name: true, code: true }
          },
          customer: {
            select: { id: true, name: true, phone: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true }
              }
            }
          }
        }
      });

      return this.formatProvisionalSaleResponse(provisionalSale);
    } catch (error) {
      console.error('خطأ في إنشاء الفاتورة المبدئية:', error);
      throw error;
    }
  }

  // ============== تحديث فاتورة مبدئية ==============

  async updateProvisionalSale(id: number, data: UpdateProvisionalSaleDto, userCompanyId?: number, isSystemUser?: boolean): Promise<ProvisionalSaleResponseDto> {
    try {
      // التحقق من وجود الفاتورة المبدئية
      const existingProvisionalSale = await prisma.provisionalSale.findUnique({
        where: { id },
        include: { lines: true }
      });

      if (!existingProvisionalSale) {
        throw new Error('الفاتورة المبدئية غير موجودة');
      }

      // التحقق من ملكية الفاتورة للمستخدمين العاديين
      if (!isSystemUser && userCompanyId && existingProvisionalSale.companyId !== userCompanyId) {
        throw new Error('ليس لديك صلاحية لتعديل هذه الفاتورة المبدئية');
      }

      // التحقق من أن الفاتورة لم يتم ترحيلها بعد
      if (existingProvisionalSale.isConverted) {
        throw new Error('لا يمكن تعديل فاتورة مبدئية تم ترحيلها');
      }

      // التحقق من وجود العميل إذا تم تحديده
      if (data.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: data.customerId }
        });

        if (!customer) {
          throw new Error('العميل غير موجود');
        }
      }

      let total = existingProvisionalSale.total;

      // تحديث السطور إذا تم تمريرها
      if (data.lines) {
        // التحقق من وجود المنتجات
        const productIds = data.lines.map(line => line.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } }
        });

        if (products.length !== productIds.length) {
          throw new Error('بعض المنتجات غير موجودة');
        }

        // حذف السطور القديمة
        await prisma.provisionalSaleLine.deleteMany({
          where: { provisionalSaleId: id }
        });

        // حساب المجموع الجديد
        total = new Prisma.Decimal(
          data.lines.reduce((sum, line) => {
            return sum + (line.qty * line.unitPrice);
          }, 0)
        );
      }

      // تحديث الفاتورة المبدئية
      const provisionalSale = await prisma.provisionalSale.update({
        where: { id },
        data: {
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          status: data.status,
          notes: data.notes,
          total: data.lines ? total : undefined,
          lines: data.lines ? {
            create: data.lines.map(line => ({
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.unitPrice,
              subTotal: line.qty * line.unitPrice
            }))
          } : undefined
        },
        include: {
          company: {
            select: { id: true, name: true, code: true }
          },
          customer: {
            select: { id: true, name: true, phone: true }
          },
          convertedSale: {
            select: { id: true, invoiceNumber: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true }
              }
            }
          }
        }
      });

      return this.formatProvisionalSaleResponse(provisionalSale);
    } catch (error) {
      console.error('خطأ في تحديث الفاتورة المبدئية:', error);
      throw error;
    }
  }

  // ============== الحصول على قائمة الفواتير المبدئية ==============

  async getProvisionalSales(query: GetProvisionalSalesQueryDto): Promise<ProvisionalSalesListResponseDto> {
    try {
      const { page, limit, companyId, customerId, status, isConverted, search, sortBy, sortOrder, todayOnly } = query;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const where: Prisma.ProvisionalSaleWhereInput = {};

      if (companyId) {
        where.companyId = companyId;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      if (status) {
        where.status = status;
      }

      if (isConverted !== undefined) {
        where.isConverted = isConverted;
      }

      // فلترة حسب اليوم الحالي فقط
      if (todayOnly) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        };
      }

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { notes: { contains: search, mode: 'insensitive' } }
        ];
      }

      // الحصول على العدد الكلي
      const total = await prisma.provisionalSale.count({ where });

      // الحصول على البيانات
      const provisionalSales = await prisma.provisionalSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {
            select: { id: true, name: true, code: true }
          },
          customer: {
            select: { id: true, name: true, phone: true }
          },
          convertedSale: {
            select: { id: true, invoiceNumber: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true }
              }
            }
          }
        }
      });

      return {
        provisionalSales: provisionalSales.map(sale => this.formatProvisionalSaleResponse(sale)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('خطأ في الحصول على الفواتير المبدئية:', error);
      throw error;
    }
  }

  // ============== الحصول على فاتورة مبدئية واحدة ==============

  async getProvisionalSaleById(id: number): Promise<ProvisionalSaleResponseDto> {
    try {
      const provisionalSale = await prisma.provisionalSale.findUnique({
        where: { id },
        include: {
          company: {
            select: { id: true, name: true, code: true }
          },
          customer: {
            select: { id: true, name: true, phone: true }
          },
          convertedSale: {
            select: { id: true, invoiceNumber: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true }
              }
            }
          }
        }
      });

      if (!provisionalSale) {
        throw new Error('الفاتورة المبدئية غير موجودة');
      }

      return this.formatProvisionalSaleResponse(provisionalSale);
    } catch (error) {
      console.error('خطأ في الحصول على الفاتورة المبدئية:', error);
      throw error;
    }
  }

  // ============== حذف فاتورة مبدئية ==============

  async deleteProvisionalSale(id: number, userCompanyId?: number, isSystemUser?: boolean): Promise<void> {
    try {
      const provisionalSale = await prisma.provisionalSale.findUnique({
        where: { id }
      });

      if (!provisionalSale) {
        throw new Error('الفاتورة المبدئية غير موجودة');
      }

      // التحقق من ملكية الفاتورة للمستخدمين العاديين
      if (!isSystemUser && userCompanyId && provisionalSale.companyId !== userCompanyId) {
        throw new Error('ليس لديك صلاحية لحذف هذه الفاتورة المبدئية');
      }

      if (provisionalSale.isConverted) {
        throw new Error('لا يمكن حذف فاتورة مبدئية تم ترحيلها');
      }

      // حذف السطور أولاً
      await prisma.provisionalSaleLine.deleteMany({
        where: { provisionalSaleId: id }
      });

      // حذف الفاتورة المبدئية
      await prisma.provisionalSale.delete({
        where: { id }
      });
    } catch (error) {
      console.error('خطأ في حذف الفاتورة المبدئية:', error);
      throw error;
    }
  }

  // ============== ترحيل فاتورة مبدئية إلى فاتورة عادية ==============

  async convertToSale(id: number, data: ConvertToSaleDto): Promise<ProvisionalSaleResponseDto> {
    try {
      console.log('🚀 بدء عملية ترحيل الفاتورة المبدئية:', { id, saleType: data.saleType, paymentMethod: data.paymentMethod });
      
      // التحقق من وجود الفاتورة المبدئية
      const provisionalSale = await prisma.provisionalSale.findUnique({
        where: { id },
        include: {
          lines: {
            include: {
              product: true
            }
          }
        }
      });
      
      console.log('📋 الفاتورة المبدئية:', {
        id: provisionalSale?.id,
        companyId: provisionalSale?.companyId,
        linesCount: provisionalSale?.lines.length,
        isConverted: provisionalSale?.isConverted
      });

      if (!provisionalSale) {
        throw new Error('الفاتورة المبدئية غير موجودة');
      }

      if (provisionalSale.isConverted) {
        throw new Error('الفاتورة المبدئية تم ترحيلها مسبقاً');
      }

      if (provisionalSale.status === 'CANCELLED') {
        throw new Error('لا يمكن ترحيل فاتورة ملغية');
      }

      // اعتماد الفاتورة تلقائياً عند الترحيل إذا لم تكن معتمدة
      if (provisionalSale.status !== 'APPROVED') {
        await prisma.provisionalSale.update({
          where: { id },
          data: { status: 'APPROVED' }
        });
      }

      // إنشاء فاتورة مبيعات عادية
      console.log('📝 إنشاء فاتورة مبيعات من الفاتورة المبدئية...');
      
      const sale = await prisma.sale.create({
        data: {
          companyId: provisionalSale.companyId,
          customerId: provisionalSale.customerId,
          invoiceNumber: provisionalSale.invoiceNumber,
          total: provisionalSale.total,
          saleType: data.saleType,
          paymentMethod: data.paymentMethod,
          paidAmount: data.saleType === 'CASH' ? provisionalSale.total : 0,
          remainingAmount: data.saleType === 'CASH' ? 0 : provisionalSale.total,
          isFullyPaid: data.saleType === 'CASH',
          lines: {
            create: provisionalSale.lines.map(line => ({
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.unitPrice,
              subTotal: line.subTotal
            }))
          }
        }
      });
      
      console.log('✅ تم إنشاء فاتورة المبيعات:', { saleId: sale.id, invoiceNumber: sale.invoiceNumber });

      // تحديث المخزون (خصم الكميات)
      // ملاحظة: line.qty في الفاتورة المبدئية يمثل عدد الصناديق مباشرة
      console.log('🔄 بدء تحديث المخزون للفاتورة المبدئية:', id);
      
      for (const line of provisionalSale.lines) {
        const boxesToDecrement = Number(line.qty);
        
        console.log(`📦 خصم من المخزون - المنتج: ${line.productId}, الكمية: ${boxesToDecrement} صندوق`);

        // الحصول على المخزون الحالي قبل التحديث
        const currentStock = await prisma.stock.findUnique({
          where: {
            companyId_productId: {
              companyId: provisionalSale.companyId,
              productId: line.productId
            }
          }
        });
        
        console.log(`📊 المخزون قبل الخصم:`, currentStock ? `${currentStock.boxes} صندوق` : 'غير موجود');

        const updatedStock = await prisma.stock.upsert({
          where: {
            companyId_productId: {
              companyId: provisionalSale.companyId,
              productId: line.productId
            }
          },
          update: {
            boxes: {
              decrement: boxesToDecrement
            }
          },
          create: {
            companyId: provisionalSale.companyId,
            productId: line.productId,
            boxes: -boxesToDecrement
          }
        });
        
        console.log(`✅ المخزون بعد الخصم: ${updatedStock.boxes} صندوق`);
      }
      
      console.log('✅ تم تحديث المخزون بنجاح');

      // تحديث الفاتورة المبدئية
      const updatedProvisionalSale = await prisma.provisionalSale.update({
        where: { id },
        data: {
          isConverted: true,
          convertedSaleId: sale.id,
          convertedAt: new Date(),
          status: 'CONVERTED'
        },
        include: {
          company: {
            select: { id: true, name: true, code: true }
          },
          customer: {
            select: { id: true, name: true, phone: true }
          },
          convertedSale: {
            select: { id: true, invoiceNumber: true }
          },
          lines: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true }
              }
            }
          }
        }
      });

      return this.formatProvisionalSaleResponse(updatedProvisionalSale);
    } catch (error) {
      console.error('خطأ في ترحيل الفاتورة المبدئية:', error);
      throw error;
    }
  }

  // ============== تنسيق الاستجابة ==============

  private formatProvisionalSaleResponse(provisionalSale: any): ProvisionalSaleResponseDto {
    return {
      id: provisionalSale.id,
      companyId: provisionalSale.companyId,
      company: provisionalSale.company,
      customerId: provisionalSale.customerId,
      customer: provisionalSale.customer,
      invoiceNumber: provisionalSale.invoiceNumber,
      total: Number(provisionalSale.total),
      status: provisionalSale.status,
      isConverted: provisionalSale.isConverted,
      convertedSaleId: provisionalSale.convertedSaleId,
      convertedSale: provisionalSale.convertedSale,
      notes: provisionalSale.notes,
      createdAt: provisionalSale.createdAt,
      updatedAt: provisionalSale.updatedAt,
      convertedAt: provisionalSale.convertedAt,
      lines: provisionalSale.lines.map((line: any) => ({
        id: line.id,
        productId: line.productId,
        product: line.product,
        qty: Number(line.qty),
        unitPrice: Number(line.unitPrice),
        subTotal: Number(line.subTotal)
      }))
    };
  }
}
