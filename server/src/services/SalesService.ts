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
   * 
   * @param data - بيانات الفاتورة (يمكن أن تحتوي على companyId للـ System User)
   * @param userCompanyId - معرف الشركة المستهدفة للفاتورة
   * @param isSystemUser - هل المستخدم System User (يمكنه البيع من أي شركة)
   * 
   * ملاحظة: userCompanyId هنا يمثل الشركة التي سيتم البيع منها (targetCompanyId)
   * وليس شركة المستخدم الأصلية
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
          stocks: isSystemUser ? true : {
            where: { companyId: userCompanyId }
          },
          prices: isSystemUser ? true : {
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

        // للـ System User: نبحث عن المخزون في الشركة المحددة في الفاتورة
        // للمستخدم العادي: نستخدم مخزون شركته فقط
        const stock = isSystemUser 
          ? product.stocks.find(s => s.companyId === userCompanyId)
          : product.stocks[0];
        
        // حساب الصناديق المطلوبة:
        // - إذا كان الصنف بالصندوق: line.qty هي بالأمتار، نحولها لصناديق ونقرب للأعلى
        // - إذا كان الصنف بوحدة أخرى: line.qty هي عدد الصناديق مباشرة
        let requiredBoxes = line.qty;
        let actualMetersToSell = line.qty; // الأمتار الفعلية التي سيحصل عليها العميل
        
        if (product.unit === 'صندوق' && product.unitsPerBox && Number(product.unitsPerBox) > 0) {
          // البيع بالمتر المربع: line.qty = عدد الأمتار المطلوبة
          const requestedMeters = line.qty;
          const unitsPerBox = Number(product.unitsPerBox);
          
          // حساب عدد الصناديق (التقريب للأعلى)
          requiredBoxes = Math.ceil(requestedMeters / unitsPerBox);
          
          // حساب الأمتار الفعلية (الصناديق الكاملة × الوحدات في الصندوق)
          actualMetersToSell = requiredBoxes * unitsPerBox;
          
          // Debug logging
          if (process.env.NODE_ENV !== 'production') {
            console.log('📐 Meter Calculation:', {
              productName: product.name,
              requestedMeters,
              unitsPerBox,
              requiredBoxes,
              actualMetersToSell
            });
          }
        }
        
        // Debug logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('📦 Stock Check Debug:', {
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            isSystemUser,
            userCompanyId,
            stocksFound: product.stocks.length,
            allStocks: product.stocks.map(s => ({ companyId: s.companyId, boxes: Number(s.boxes) })),
            selectedStock: stock ? {
              companyId: stock.companyId,
              boxes: Number(stock.boxes)
            } : 'NO_STOCK',
            requiredBoxes
          });
        }
        
        if (!stock || Number(stock.boxes) < requiredBoxes) {
          // عرض الكمية المتوفرة بالوحدة المناسبة
          const availableBoxes = Number(stock?.boxes || 0);
          let availableUnits = '';
          
          if (product.unit === 'صندوق' && product.unitsPerBox) {
            const availableMeters = availableBoxes * Number(product.unitsPerBox);
            availableUnits = `${availableMeters.toFixed(2)} ${product.unit || 'متر مربع'} (${availableBoxes} صندوق)`;
          } else {
            availableUnits = `${availableBoxes} صندوق`;
          }
          
          const requestedUnits = product.unit === 'صندوق' && product.unitsPerBox
            ? `${actualMetersToSell.toFixed(2)} ${product.unit || 'متر مربع'} (${requiredBoxes} صندوق)`
            : `${requiredBoxes} صندوق`;
          
          throw new Error(`المخزون غير كافي للصنف: ${product.name}. المتوفر: ${availableUnits}، المطلوب: ${requestedUnits}`);
        }
      }

      // توليد رقم الفاتورة تلقائياً
      const invoiceNumber = await this.generateInvoiceNumber(userCompanyId);
      console.log('🧾 رقم الفاتورة المولد:', invoiceNumber);

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
          invoiceNumber: invoiceNumber,
          total: total,
          paidAmount: data.saleType === 'CASH' ? total : 0, // للبيع النقدي: مدفوع بالكامل، للآجل: 0
          remainingAmount: data.saleType === 'CASH' ? 0 : total, // للبيع النقدي: 0، للآجل: المبلغ كامل
          saleType: data.saleType,
          paymentMethod: data.paymentMethod,
          isFullyPaid: data.saleType === 'CASH', // البيع النقدي مسدد بالكامل
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
        const product = products.find(p => p.id === line.productId);
        if (!product) continue;
        
        // حساب الصناديق المطلوبة:
        // للأصناف بوحدة "صندوق": line.qty = عدد الصناديق مباشرة (من الواجهة الأمامية)
        // للأصناف الأخرى: line.qty = الكمية بالوحدة
        let boxesToDecrement = Number(line.qty);
        
        await this.prisma.stock.update({
          where: {
            companyId_productId: {
              companyId: userCompanyId,
              productId: line.productId
            }
          },
          data: {
            boxes: {
              decrement: boxesToDecrement
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
        // الحصول على بيانات الأصناف للبنود القديمة
        const oldProductIds = existingSale.lines.map(line => line.productId);
        const oldProducts = await this.prisma.product.findMany({
          where: {
            id: { in: oldProductIds }
          },
          select: {
            id: true,
            unit: true,
            unitsPerBox: true
          }
        });
        
        for (const line of existingSale.lines) {
          const oldProduct = oldProducts.find(p => p.id === line.productId);
          if (!oldProduct) continue;
          
          // حساب الصناديق المطلوبة:
          // للأصناف بوحدة "صندوق": line.qty = عدد الصناديق مباشرة
          // للأصناف الأخرى: line.qty = الكمية بالوحدة
          let boxesToIncrement = Number(line.qty);
          
          await this.prisma.stock.update({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            data: {
              boxes: {
                increment: boxesToIncrement
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
            stocks: isSystemUser ? true : {
              where: { companyId: userCompanyId }
            }
          }
        });

        for (const line of data.lines) {
          const product = products.find(p => p.id === line.productId);
          if (!product) continue;

          // للـ System User: نبحث عن المخزون في الشركة المحددة
          const stock = isSystemUser 
            ? product.stocks.find(s => s.companyId === userCompanyId)
            : product.stocks[0];
          
          // حساب الصناديق المطلوبة:
          let requiredBoxes = line.qty;
          let actualMetersToSell = line.qty;
          
          if (product.unit === 'صندوق' && product.unitsPerBox && Number(product.unitsPerBox) > 0) {
            // البيع بالمتر المربع: line.qty = عدد الأمتار المطلوبة
            const requestedMeters = line.qty;
            const unitsPerBox = Number(product.unitsPerBox);
            
            // حساب عدد الصناديق (التقريب للأعلى)
            requiredBoxes = Math.ceil(requestedMeters / unitsPerBox);
            
            // حساب الأمتار الفعلية (الصناديق الكاملة × الوحدات في الصندوق)
            actualMetersToSell = requiredBoxes * unitsPerBox;
          }
          
          if (!stock || Number(stock.boxes) < requiredBoxes) {
            const availableBoxes = Number(stock?.boxes || 0);
            let availableUnits = '';
            
            if (product.unit === 'صندوق' && product.unitsPerBox) {
              const availableMeters = availableBoxes * Number(product.unitsPerBox);
              availableUnits = `${availableMeters.toFixed(2)} ${product.unit || 'متر مربع'} (${availableBoxes} صندوق)`;
            } else {
              availableUnits = `${availableBoxes} صندوق`;
            }
            
            const requestedUnits = product.unit === 'صندوق' && product.unitsPerBox
              ? `${actualMetersToSell.toFixed(2)} ${product.unit || 'متر مربع'} (${requiredBoxes} صندوق)`
              : `${requiredBoxes} صندوق`;
            
            throw new Error(`المخزون غير كافي للصنف: ${product.name}. المتوفر: ${availableUnits}، المطلوب: ${requestedUnits}`);
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
        // الحصول على بيانات الأصناف للبنود الجديدة
        const newProductIds = data.lines.map(line => line.productId);
        const newProducts = await this.prisma.product.findMany({
          where: {
            id: { in: newProductIds }
          },
          select: {
            id: true,
            unit: true,
            unitsPerBox: true
          }
        });
        
        for (const line of data.lines) {
          const product = newProducts.find((p: any) => p.id === line.productId);
          if (!product) continue;
          
          // حساب الصناديق المطلوبة:
          // للأصناف بوحدة "صندوق": line.qty = عدد الصناديق مباشرة
          // للأصناف الأخرى: line.qty = الكمية بالوحدة
          let boxesToDecrement = Number(line.qty);
          
          await this.prisma.stock.update({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            data: {
              boxes: {
                decrement: boxesToDecrement
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
      // الحصول على بيانات الأصناف للبنود
      const productIds = existingSale.lines.map(line => line.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds }
        },
        select: {
          id: true,
          unit: true,
          unitsPerBox: true
        }
      });
      
      for (const line of existingSale.lines) {
        const product = products.find(p => p.id === line.productId);
        if (!product) continue;
        
        // حساب الصناديق المطلوبة للإرجاع:
        // للأصناف بوحدة "صندوق": line.qty = عدد الصناديق مباشرة
        // للأصناف الأخرى: line.qty = الكمية بالوحدة
        let boxesToIncrement = Number(line.qty);
        
        console.log(`إرجاع المخزون - الصنف ${line.productId}: ${boxesToIncrement} صندوق`);
        
        await this.prisma.stock.update({
          where: {
            companyId_productId: {
              companyId: userCompanyId,
              productId: line.productId
            }
          },
          data: {
            boxes: {
              increment: boxesToIncrement
            }
          }
        });
      }

      // حذف البنود أولاً
      await this.prisma.saleLine.deleteMany({
        where: { saleId: id }
      });

      // حذف إيصالات القبض المرتبطة بالفاتورة (إن وجدت)
      await this.prisma.salePayment.deleteMany({
        where: { saleId: id }
      });

      // حذف الفاتورة
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

  /**
   * الحصول على بيانات المبيعات اليومية للرسم البياني
   * @param days - عدد الأيام (افتراضي: 30 يوم)
   */
  async getDailySalesChart(userCompanyId: number, isSystemUser: boolean = false, days: number = 30) {
    try {
      const where: any = {
        ...(isSystemUser !== true && { companyId: userCompanyId })
      };

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // جلب جميع المبيعات في الفترة المحددة
      const sales = await this.prisma.sale.findMany({
        where: {
          ...where,
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          total: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // تجميع المبيعات حسب اليوم
      const dailyData: { [key: string]: { date: string; revenue: number; count: number } } = {};

      // إنشاء جميع الأيام في الفترة
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0] || '';
        if (dateKey) {
          dailyData[dateKey] = {
            date: dateKey,
            revenue: 0,
            count: 0
          };
        }
      }

      // ملء البيانات من المبيعات
      sales.forEach(sale => {
        const dateKey = sale.createdAt.toISOString().split('T')[0] || '';
        if (dateKey && dailyData[dateKey]) {
          dailyData[dateKey].revenue += Number(sale.total);
          dailyData[dateKey].count += 1;
        }
      });

      // تحويل إلى مصفوفة مرتبة
      const chartData = Object.values(dailyData).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return {
        success: true,
        message: 'تم جلب بيانات الرسم البياني بنجاح',
        data: chartData
      };
    } catch (error) {
      console.error('خطأ في جلب بيانات الرسم البياني:', error);
      throw error;
    }
  }

  // ============== إدارة العملاء ==============

  /**
   * إنشاء عميل جديد
   */
  async createCustomer(data: CreateCustomerDto) {
    try {
      // التأكد من عدم إرسال id في البيانات
      const customerData: any = {
        name: data.name,
        phone: data.phone || null,
        note: data.note || null
      };

      const customer = await this.prisma.customer.create({
        data: customerData
      });

      return customer;
    } catch (error: any) {
      console.error('خطأ في إنشاء العميل:', error);
      
      // إذا كانت المشكلة في الـ unique constraint على id
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        // محاولة إصلاح المشكلة بإعادة المحاولة
        try {
          // الحصول على أعلى ID موجود
          const lastCustomer = await this.prisma.customer.findFirst({
            orderBy: { id: 'desc' }
          });
          
          // إعادة المحاولة مع تحديد ID يدوياً
          const newId = (lastCustomer?.id || 0) + 1;
          const retryCustomerData = {
            id: newId,
            name: data.name,
            phone: data.phone || null,
            note: data.note || null
          };
          
          const customer = await this.prisma.customer.create({
            data: retryCustomerData
          });
          
          return customer;
        } catch (retryError) {
          console.error('فشلت إعادة المحاولة:', retryError);
          throw new Error('فشل في إنشاء العميل. يرجى المحاولة مرة أخرى.');
        }
      }
      
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

  /**
   * توليد رقم فاتورة تلقائي
   */
  private async generateInvoiceNumber(companyId: number): Promise<string> {
    try {
      // الحصول على آخر فاتورة للشركة
      const lastSale = await this.prisma.sale.findFirst({
        where: { companyId },
        orderBy: { id: 'desc' },
        select: { id: true, invoiceNumber: true }
      });

      // الحصول على تاريخ اليوم
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      // تنسيق التاريخ: YYYYMMDD
      const datePrefix = `${year}${month}${day}`;

      // البحث عن آخر رقم فاتورة لنفس اليوم
      const todaySales = await this.prisma.sale.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(year, today.getMonth(), today.getDate()),
            lt: new Date(year, today.getMonth(), today.getDate() + 1)
          }
        }
      });

      // رقم تسلسلي جديد
      const sequenceNumber = String(todaySales + 1).padStart(4, '0');

      // تكوين رقم الفاتورة: INV-YYYYMMDD-XXXX
      const invoiceNumber = `INV-${datePrefix}-${sequenceNumber}`;

      return invoiceNumber;
    } catch (error) {
      console.error('خطأ في توليد رقم الفاتورة:', error);
      // في حالة الخطأ، استخدم timestamp كبديل
      const timestamp = Date.now();
      return `INV-${timestamp}`;
    }
  }
}
