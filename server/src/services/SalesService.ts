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
   * إنشاء فاتورة مبيعات جديدة (كفاتورة مبدئية)
   * 
   * @param data - بيانات الفاتورة (بدون saleType و paymentMethod)
   * @param userCompanyId - معرف الشركة المستهدفة للفاتورة
   * @param isSystemUser - هل المستخدم System User (يمكنه البيع من أي شركة)
   * 
   * ملاحظة: الفاتورة تُنشأ بحالة DRAFT ولا يتم خصم المخزون حتى يعتمدها المحاسب
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

      // ملاحظة: لا نتحقق من المخزون هنا لأن الفاتورة مبدئية
      // سيتم التحقق من المخزون عند اعتماد الفاتورة من المحاسب

      // توليد رقم الفاتورة تلقائياً
      const invoiceNumber = await this.generateInvoiceNumber(userCompanyId);
      console.log('🧾 رقم الفاتورة المولد:', invoiceNumber);

      // حساب المجموع الإجمالي
      let total = 0;
      for (const line of data.lines) {
        const subTotal = line.qty * line.unitPrice;
        total += subTotal;
      }

      // إنشاء الفاتورة كمسودة (DRAFT)
      const sale = await this.prisma.sale.create({
        data: {
          companyId: userCompanyId,
          customerId: data.customerId,
          invoiceNumber: invoiceNumber,
          total: total,
          status: 'DRAFT', // فاتورة مبدئية
          notes: data.notes || null,
          // جميع الفواتير آجلة
          saleType: 'CREDIT', // ✅ آجلة دائماً
          paymentMethod: null,
          paidAmount: 0,
          remainingAmount: total, // ✅ المبلغ المتبقي = المجموع (لم يُدفع شيء)
          isFullyPaid: false,
          lines: {
            create: data.lines.map(line => ({
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.unitPrice,
              subTotal: line.qty * line.unitPrice,
              // للأصناف من الشركة الأم
              isFromParentCompany: line.isFromParentCompany || false,
              parentUnitPrice: line.parentUnitPrice || null,
              branchUnitPrice: line.branchUnitPrice || null
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

      // ملاحظة: لا يتم خصم المخزون هنا لأن الفاتورة مبدئية
      // سيتم خصم المخزون عند اعتماد الفاتورة من المحاسب
      console.log('📝 تم إنشاء فاتورة مبدئية بدون خصم مخزون');

      return {
        id: sale.id,
        companyId: sale.companyId,
        company: sale.company,
        customerId: sale.customerId,
        customer: sale.customer,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        status: sale.status,
        notes: sale.notes,
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
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

      // إذا تم تحديد companyId في الـ query، استخدمه (للمحاسب: فلتر حسب الشركة)
      if (query.companyId) {
        where.companyId = query.companyId;
        console.log('🔍 فلترة الفواتير حسب الشركة:', query.companyId);
      }

      if (query.search) {
        where.OR = [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          { customer: { phone: { contains: query.search, mode: 'insensitive' } } }
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

      // فلتر حسب إصدار إيصال القبض
      if (query.receiptIssued !== undefined) {
        where.receiptIssued = query.receiptIssued;
      }

      // فلتر حسب اليوم الحالي فقط
      if (query.todayOnly) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        };
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
            },
            dispatchOrders: {
              select: { id: true, status: true }
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                receiptNumber: true,
                amount: true,
                paymentMethod: true,
                paymentDate: true,
                notes: true,
                createdAt: true
              }
            }
          }
        }),
        this.prisma.sale.count({ where })
      ]);

      // Debug: عرض الشركات في النتائج
      if (query.companyId) {
        const companies = [...new Set(sales.map(s => s.companyId))];
        console.log(`✅ النتيجة: ${sales.length} فاتورة، الشركات: [${companies.join(', ')}]`);
      }

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
            status: sale.status,
            notes: sale.notes,
            isAutoGenerated: sale.isAutoGenerated || false, // ✅ فاتورة تلقائية من التقازي؟
            saleType: sale.saleType,
            paymentMethod: sale.paymentMethod,
            paidAmount: Number(sale.paidAmount || 0), // ✅ المبلغ المدفوع
            remainingAmount: Number(sale.remainingAmount || 0), // ✅ المبلغ المتبقي
            isFullyPaid: sale.isFullyPaid || false, // ✅ هل تم السداد كاملاً
            approvedAt: sale.approvedAt,
            approvedBy: sale.approvedBy,
            dispatchOrders: sale.dispatchOrders,
            payments: sale.payments, // ✅ قائمة المدفوعات
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
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
          },
          dispatchOrders: {
            select: { id: true, status: true }
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
        status: sale.status,
        notes: sale.notes,
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        approvedAt: sale.approvedAt,
        approvedBy: sale.approvedBy,
        dispatchOrders: sale.dispatchOrders,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
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
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  createdByCompanyId: true,
                  unit: true,
                  unitsPerBox: true
                }
              }
            }
          }
        }
      });

      if (!existingSale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية لتعديلها');
      }

      // 🛡️ منع التعديل المباشر على فواتير التقازي التلقائية
      const parentComplexSale = await this.prisma.sale.findFirst({
        where: {
          OR: [
            { relatedParentSaleId: id },
            { relatedBranchPurchaseId: id }
          ]
        },
        select: {
          id: true,
          invoiceNumber: true,
          customer: { select: { name: true } }
        }
      });

      if (parentComplexSale) {
        const customerName = parentComplexSale.customer?.name || 'غير محدد';
        const invoiceRef = parentComplexSale.invoiceNumber || `#${parentComplexSale.id}`;
        throw new Error(
          `⛔ لا يمكن تعديل هذه الفاتورة مباشرة!\n\n` +
          `هذه فاتورة تم إنشاؤها تلقائياً من فاتورة معقدة.\n\n` +
          `📋 الفاتورة الأصلية: ${invoiceRef}\n` +
          `👤 العميل: ${customerName}\n\n` +
          `💡 لتعديل هذه الفاتورة، اذهب إلى الفاتورة الأصلية وعدّلها.`
        );
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
          
          // استخدام upsert لضمان إنشاء السجل إذا لم يكن موجوداً
          await this.prisma.stock.upsert({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            update: {
              boxes: {
                increment: boxesToIncrement
              }
            },
            create: {
              companyId: userCompanyId,
              productId: line.productId,
              boxes: boxesToIncrement
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

      // حساب المبلغ المتبقي الجديد
      const currentPaidAmount = Number(existingSale.paidAmount) || 0;
      const newRemainingAmount = total - currentPaidAmount;

      // تحديث الفاتورة
      const updatedSale = await this.prisma.sale.update({
        where: { id },
        data: {
          customerId: data.customerId,
          invoiceNumber: data.invoiceNumber,
          saleType: data.saleType,
          paymentMethod: data.paymentMethod,
          total: data.lines ? total : undefined,
          remainingAmount: data.lines ? newRemainingAmount : undefined, // ✅ تحديث المبلغ المتبقي
          isFullyPaid: data.lines ? (newRemainingAmount <= 0) : undefined, // ✅ تحديث حالة الدفع
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
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true, createdByCompanyId: true }
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
          
          // الحصول على المخزون الحالي
          const currentStock = await this.prisma.stock.findUnique({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            }
          });
          
          const currentBoxes = currentStock ? Number(currentStock.boxes) : 0;
          const newBoxes = Math.max(0, currentBoxes - boxesToDecrement);
          
          // استخدام upsert لضمان التعامل مع الحالة حتى لو لم يكن السجل موجوداً
          await this.prisma.stock.upsert({
            where: {
              companyId_productId: {
                companyId: userCompanyId,
                productId: line.productId
              }
            },
            update: {
              boxes: newBoxes
            },
            create: {
              companyId: userCompanyId,
              productId: line.productId,
              boxes: 0 // إذا لم يكن موجوداً، نبدأ من 0
            }
          });
        }
      }

      // 🔄 تحديث فاتورة التقازي وفاتورة المشتريات المرتبطة إذا كانت موجودة
      if (data.lines && existingSale.relatedParentSaleId) {
        console.log('🔄 تحديث فاتورة التقازي وفاتورة المشتريات...');
        
        // جلب فاتورة التقازي القديمة للحصول على الأسعار الأصلية (سعر الجملة الثابت)
        const oldParentSale = await this.prisma.sale.findUnique({
          where: { id: existingSale.relatedParentSaleId },
          include: { lines: true }
        });

        // فصل أصناف التقازي من البنود الجديدة
        const parentCompanyLines = data.lines.filter(line => {
          const product = updatedSale.lines.find(l => l.productId === line.productId)?.product;
          return product && product.createdByCompanyId === 1; // ID الشركة الأم = 1
        });

        if (parentCompanyLines.length > 0 && oldParentSale) {
          // حذف البنود القديمة من فاتورة التقازي
          await this.prisma.saleLine.deleteMany({
            where: { saleId: existingSale.relatedParentSaleId }
          });

          // حساب المجموع الجديد لفاتورة التقازي (الكمية فقط، السعر ثابت)
          let parentSaleTotal = 0;
          const parentSaleNewLines = [];

          for (const line of parentCompanyLines) {
            const product = updatedSale.lines.find(l => l.productId === line.productId)?.product;
            if (!product) continue;

            // ✅ استخدام السعر الأصلي من فاتورة التقازي القديمة (سعر الجملة الثابت)
            const oldLine = oldParentSale.lines.find(l => l.productId === line.productId);
            let originalPrice;
            
            if (oldLine) {
              // الصنف موجود في الفاتورة القديمة → استخدم سعره القديم
              originalPrice = Number(oldLine.unitPrice);
            } else {
              // صنف جديد → احصل على سعر الجملة من CompanyProductPrice للتقازي (ID=1)
              const priceRecord = await this.prisma.companyProductPrice.findUnique({
                where: {
                  companyId_productId: {
                    companyId: 1, // التقازي
                    productId: line.productId
                  }
                }
              });
              originalPrice = priceRecord ? Number(priceRecord.sellPrice) : line.unitPrice;
            }
            
            // ✅ الكمية الجديدة × السعر الأصلي (الجملة)
            const lineTotal = line.qty * originalPrice;
            parentSaleTotal += lineTotal;

            parentSaleNewLines.push({
              productId: line.productId,
              qty: line.qty,
              unitPrice: originalPrice, // ✅ السعر الأصلي (ثابت)
              subTotal: lineTotal
            });
          }

          // تحديث فاتورة التقازي
          await this.prisma.sale.update({
            where: { id: existingSale.relatedParentSaleId },
            data: {
              total: parentSaleTotal,
              remainingAmount: parentSaleTotal, // ✅ تحديث المبلغ المتبقي (آجلة دائماً)
              lines: {
                create: parentSaleNewLines
              }
            }
          });
          console.log('✅ تم تحديث فاتورة التقازي بنجاح (الكمية فقط، السعر ثابت)');

          // 🔄 تحديث فاتورة المشتريات أيضاً
          if (existingSale.relatedBranchPurchaseId) {
            console.log('🔄 تحديث فاتورة المشتريات المرتبطة...');
            
            // حذف البنود القديمة من فاتورة المشتريات
            await this.prisma.purchaseLine.deleteMany({
              where: { purchaseId: existingSale.relatedBranchPurchaseId }
            });

            // إنشاء بنود جديدة (نفس بنود فاتورة التقازي)
            await this.prisma.purchase.update({
              where: { id: existingSale.relatedBranchPurchaseId },
              data: {
                total: parentSaleTotal,
                remainingAmount: parentSaleTotal,
                lines: {
                  create: parentSaleNewLines.map(line => ({
                    productId: line.productId,
                    qty: line.qty,
                    unitPrice: line.unitPrice,
                    subTotal: line.subTotal
                  }))
                }
              }
            });
            console.log('✅ تم تحديث فاتورة المشتريات بنجاح');
          }
        } else {
          console.log('⚠️ لا توجد أصناف تقازي في التعديل الجديد');
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
   * حذف فاتورة مبيعات (مع الحذف المتسلسل للفواتير المرتبطة)
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

      // التحقق من أن هذه الفاتورة ليست فاتورة تابعة لفاتورة معقدة
      // (أي أنها فاتورة من الشركة الأم تم إنشاؤها تلقائياً)
      const parentComplexSale = await this.prisma.sale.findFirst({
        where: {
          OR: [
            { relatedParentSaleId: id },
            { relatedBranchPurchaseId: id }
          ]
        },
        select: {
          id: true,
          invoiceNumber: true,
          customer: { select: { name: true } }
        }
      });

      if (parentComplexSale) {
        const customerName = parentComplexSale.customer?.name || 'غير محدد';
        const invoiceRef = parentComplexSale.invoiceNumber || `#${parentComplexSale.id}`;
        throw new Error(
          `⛔ لا يمكن حذف هذه الفاتورة مباشرة!\n\n` +
          `هذه فاتورة تم إنشاؤها تلقائياً من فاتورة معقدة.\n\n` +
          `📋 الفاتورة الأصلية: ${invoiceRef}\n` +
          `👤 العميل: ${customerName}\n\n` +
          `💡 لحذف هذه الفاتورة، اذهب إلى الفاتورة الأصلية واحذفها.`
        );
      }

      console.log('🗑️ بدء حذف الفاتورة وجميع الفواتير المرتبطة...');

      // 1. حذف الفواتير المرتبطة (Cascade Delete) إذا كانت فاتورة معقدة
      if (existingSale.relatedParentSaleId || existingSale.relatedBranchPurchaseId || existingSale.relatedPurchaseFromParentId) {
        console.log('🔗 فاتورة معقدة - سيتم حذف الفواتير المرتبطة');

        // حذف فاتورة الشركة الأم
        if (existingSale.relatedParentSaleId) {
          console.log(`📄 حذف فاتورة الشركة الأم (ID: ${existingSale.relatedParentSaleId})...`);
          const parentSale = await this.prisma.sale.findUnique({
            where: { id: existingSale.relatedParentSaleId },
            include: { lines: true }
          });

          if (parentSale) {
            // إرجاع مخزون الشركة الأم
            for (const line of parentSale.lines) {
              await this.prisma.stock.upsert({
                where: {
                  companyId_productId: {
                    companyId: parentSale.companyId,
                    productId: line.productId
                  }
                },
                update: {
                  boxes: {
                    increment: Number(line.qty)
                  }
                },
                create: {
                  companyId: parentSale.companyId,
                  productId: line.productId,
                  boxes: Number(line.qty)
                }
              });
            }

            // حذف أسطر وإيصالات الفاتورة
            await this.prisma.saleLine.deleteMany({ where: { saleId: parentSale.id } });
            await this.prisma.salePayment.deleteMany({ where: { saleId: parentSale.id } });
            await this.prisma.sale.delete({ where: { id: parentSale.id } });
            console.log('✅ تم حذف فاتورة الشركة الأم');
          }
        }

        // حذف فاتورة مشتريات الشركة التابعة
        if (existingSale.relatedBranchPurchaseId) {
          console.log(`📄 حذف فاتورة مشتريات الشركة التابعة (ID: ${existingSale.relatedBranchPurchaseId})...`);
          const branchPurchase = await this.prisma.purchase.findUnique({
            where: { id: existingSale.relatedBranchPurchaseId },
            include: { lines: true }
          });

          if (branchPurchase) {
            // ملاحظة: لا نحتاج لإرجاع المخزون لأن affectsInventory = false

            // حذف أسطر ودفعات الفاتورة
            await this.prisma.purchaseLine.deleteMany({ where: { purchaseId: branchPurchase.id } });
            await this.prisma.purchasePayment.deleteMany({ where: { purchaseId: branchPurchase.id } });
            await this.prisma.purchase.delete({ where: { id: branchPurchase.id } });
            console.log('✅ تم حذف فاتورة مشتريات الشركة التابعة');
          }
        }

        // حذف سجل PurchaseFromParent
        if (existingSale.relatedPurchaseFromParentId) {
          console.log(`📄 حذف سجل PurchaseFromParent (ID: ${existingSale.relatedPurchaseFromParentId})...`);
          const purchaseFromParent = await this.prisma.purchaseFromParent.findUnique({
            where: { id: existingSale.relatedPurchaseFromParentId }
          });

          if (purchaseFromParent) {
            // حذف الأسطر والإيصالات
            await this.prisma.purchaseFromParentLine.deleteMany({ where: { purchaseId: purchaseFromParent.id } });
            await this.prisma.purchaseFromParentReceipt.deleteMany({ where: { purchaseId: purchaseFromParent.id } });
            await this.prisma.purchaseFromParent.delete({ where: { id: purchaseFromParent.id } });
            console.log('✅ تم حذف سجل PurchaseFromParent');
          }
        }
      }

      // 2. إرجاع مخزون الفاتورة الأصلية
      console.log('🔄 بدء إرجاع المخزون للفاتورة الأصلية...');
      for (const line of existingSale.lines) {
        const currentStock = await this.prisma.stock.findUnique({
          where: {
            companyId_productId: {
              companyId: existingSale.companyId,
              productId: line.productId
            }
          }
        });
        
        const boxesToIncrement = Number(line.qty);
        
        console.log('📦 Stock Return:', {
          productId: line.productId,
          qtyFromDB: line.qty,
          boxesToIncrement,
          currentStockBoxes: currentStock?.boxes ? Number(currentStock.boxes) : 0,
          afterReturn: currentStock?.boxes ? Number(currentStock.boxes) + boxesToIncrement : boxesToIncrement
        });
        
        // استخدام upsert لضمان إنشاء السجل إذا لم يكن موجوداً
        await this.prisma.stock.upsert({
          where: {
            companyId_productId: {
              companyId: existingSale.companyId,
              productId: line.productId
            }
          },
          update: {
            boxes: {
              increment: boxesToIncrement
            }
          },
          create: {
            companyId: existingSale.companyId,
            productId: line.productId,
            boxes: boxesToIncrement
          }
        });
        
        console.log(`✅ تم إرجاع ${boxesToIncrement} إلى المخزون للصنف: ${line.productId}`);
      }
      console.log('✅ تم إرجاع المخزون بنجاح');

      // 3. حذف البنود والإيصالات
      await this.prisma.saleLine.deleteMany({
        where: { saleId: id }
      });

      await this.prisma.salePayment.deleteMany({
        where: { saleId: id }
      });

      // 4. حذف الفاتورة الأصلية
      await this.prisma.sale.delete({
        where: { id }
      });

      console.log('✅ تم حذف الفاتورة وجميع الفواتير المرتبطة بنجاح');
      return { message: 'تم حذف الفاتورة وجميع الفواتير المرتبطة بنجاح' };
    } catch (error) {
      console.error('خطأ في حذف الفاتورة:', error);
      throw error;
    }
  }

  /**
   * إصدار إيصال قبض لفاتورة نقدية
   */
  async issueReceipt(saleId: number, userName: string) {
    try {
      // التحقق من وجود الفاتورة
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          customer: true,
          company: true,
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      if (!sale) {
        throw new Error('الفاتورة غير موجودة');
      }

      // التحقق من أن الفاتورة نقدية
      if (sale.saleType !== 'CASH') {
        throw new Error('لا يمكن إصدار إيصال قبض إلا للفواتير النقدية');
      }

      // التحقق من أنه لم يتم إصدار إيصال قبض مسبقاً
      if (sale.receiptIssued) {
        throw new Error('تم إصدار إيصال قبض لهذه الفاتورة مسبقاً');
      }

      // تحديث الفاتورة
      const updatedSale = await this.prisma.sale.update({
        where: { id: saleId },
        data: {
          receiptIssued: true,
          receiptIssuedAt: new Date(),
          receiptIssuedBy: userName
        },
        include: {
          customer: true,
          company: true,
          lines: {
            include: {
              product: true
            }
          }
        }
      });

      console.log(`✅ تم إصدار إيصال قبض للفاتورة #${saleId} بواسطة ${userName}`);

      return {
        success: true,
        message: 'تم إصدار إيصال القبض بنجاح',
        data: {
          id: updatedSale.id,
          companyId: updatedSale.companyId,
          company: updatedSale.company,
          customerId: updatedSale.customerId,
          customer: updatedSale.customer,
          invoiceNumber: updatedSale.invoiceNumber,
          total: Number(updatedSale.total),
          saleType: updatedSale.saleType,
          paymentMethod: updatedSale.paymentMethod,
          receiptIssued: updatedSale.receiptIssued,
          receiptIssuedAt: updatedSale.receiptIssuedAt,
          receiptIssuedBy: updatedSale.receiptIssuedBy,
          createdAt: updatedSale.createdAt,
          lines: updatedSale.lines.map(line => ({
            id: line.id,
            productId: line.productId,
            product: line.product,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            subTotal: Number(line.subTotal)
          }))
        }
      };
    } catch (error) {
      console.error('خطأ في إصدار إيصال القبض:', error);
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
    // التأكد من عدم إرسال id في البيانات
    const customerData = {
      name: data.name,
      phone: data.phone || null,
      note: data.note || null
    };

    try {
      const customer = await this.prisma.customer.create({
        data: customerData
      });

      return customer;
    } catch (error: any) {
      console.error('خطأ في إنشاء العميل:', error);
      
      // إذا كانت المشكلة في الـ unique constraint على id
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        // إصلاح الـ sequence في قاعدة البيانات
        try {
          console.log('🔧 محاولة إصلاح الـ sequence...');
          
          // الحصول على أعلى ID موجود
          const lastCustomer = await this.prisma.customer.findFirst({
            orderBy: { id: 'desc' }
          });
          
          const maxId = lastCustomer?.id || 0;
          console.log(`📊 أعلى ID موجود: ${maxId}`);
          
          // إصلاح الـ sequence
          await this.prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"Customer"', 'id'), ${maxId}, true);`
          );
          
          console.log('✅ تم إصلاح الـ sequence، إعادة المحاولة...');
          
          // إعادة المحاولة بدون تحديد ID
          const customer = await this.prisma.customer.create({
            data: customerData
          });
          
          console.log('✅ تم إنشاء العميل بنجاح بعد إصلاح الـ sequence');
          return customer;
        } catch (retryError) {
          console.error('❌ فشلت إعادة المحاولة:', retryError);
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
      // الحصول على آخر فاتورة
      const lastSale = await this.prisma.sale.findFirst({
        orderBy: { id: 'desc' },
        select: { invoiceNumber: true }
      });

      let nextNumber = 1;
      
      if (lastSale?.invoiceNumber) {
        // استخراج الرقم من آخر فاتورة
        const lastNumber = parseInt(lastSale.invoiceNumber);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // تنسيق الرقم ليكون 6 أرقام (000001, 000002, ...)
      return String(nextNumber).padStart(6, '0');
    } catch (error) {
      console.error('خطأ في توليد رقم الفاتورة:', error);
      // في حالة الخطأ، استخدم رقم عشوائي
      return String(Math.floor(Math.random() * 900000) + 100000);
    }
  }

  /**
   * اعتماد فاتورة مبدئية وخصم المخزون
   * @param bypassAutoGeneratedCheck - السماح باعتماد الفواتير التلقائية برمجياً (للاستخدام الداخلي فقط)
   */
  async approveSale(
    id: number, 
    approvalData: { saleType: 'CASH' | 'CREDIT'; paymentMethod?: 'CASH' | 'BANK' | 'CARD' },
    userCompanyId: number, 
    approvedBy: string,
    isSystemUser: boolean = false,
    bypassAutoGeneratedCheck: boolean = false
  ) {
    try {
      console.log(`🔍 محاولة اعتماد الفاتورة #${id}...`);
      
      // أولاً: جلب الفاتورة للتحقق من حالتها
      const saleCheck = await this.prisma.sale.findUnique({
        where: { id },
        select: { 
          status: true, 
          companyId: true, 
          invoiceNumber: true,
          isAutoGenerated: true 
        }
      });

      if (!saleCheck) {
        throw new Error('الفاتورة غير موجودة');
      }

      console.log(`📋 حالة الفاتورة: ${saleCheck.status}, تلقائية: ${saleCheck.isAutoGenerated}`);

      // التحقق: الفاتورة التلقائية لا يمكن اعتمادها يدوياً (إلا إذا تم تجاوز الفحص)
      if (saleCheck.isAutoGenerated && !bypassAutoGeneratedCheck) {
        throw new Error('لا يمكن اعتماد الفواتير التلقائية يدوياً');
      }

      // التحقق: الفاتورة معتمدة بالفعل
      if (saleCheck.status === 'APPROVED') {
        console.log('⚠️ الفاتورة معتمدة بالفعل، تخطي الاعتماد');
        throw new Error('الفاتورة معتمدة بالفعل');
      }

      if (saleCheck.status !== 'DRAFT') {
        throw new Error(`لا يمكن اعتماد فاتورة بحالة: ${saleCheck.status}`);
      }

      // التحقق من وجود الفاتورة وأنها مبدئية
      const existingSale = await this.prisma.sale.findFirst({
        where: {
          id,
          status: 'DRAFT',
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          company: {
            select: { id: true, name: true, code: true, parentId: true }
          }
        }
      });

      if (!existingSale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية لاعتمادها');
      }

      console.log(`🏢 اعتماد فاتورة للشركة: ${existingSale.company.name} (ID: ${existingSale.companyId})`);

      // جلب معلومات الشركة الأم إذا كانت الشركة الحالية فرعية
      let parentCompanyId: number | null = null;
      let parentCompanyName = '';
      
      if (existingSale.company.parentId) {
        parentCompanyId = existingSale.company.parentId;
        const parentCompany = await this.prisma.company.findUnique({
          where: { id: parentCompanyId },
          select: { name: true }
        });
        parentCompanyName = parentCompany?.name || '';
        console.log(`   الشركة الأم: ${parentCompanyName} (ID: ${parentCompanyId})`);
      }

      // التحقق من توفر المخزون قبل الاعتماد
      for (const line of existingSale.lines) {
        console.log(`📦 التحقق من مخزون: ${line.product.name} (ID: ${line.productId})`);
        console.log(`   الكمية المطلوبة: ${line.qty} صندوق`);
        console.log(`   من الشركة الأم؟: ${line.isFromParentCompany ? 'نعم' : 'لا'}`);
        
        // تحديد من أي شركة سيتم خصم المخزون
        const stockCompanyId = line.isFromParentCompany && parentCompanyId 
          ? parentCompanyId  // خصم من الشركة الأم
          : existingSale.companyId;  // خصم من الشركة الحالية
        
        const stockCompanyName = line.isFromParentCompany && parentCompanyName
          ? parentCompanyName
          : existingSale.company.name;
        
        console.log(`   سيتم الخصم من: ${stockCompanyName} (ID: ${stockCompanyId})`);
        
        // جلب المخزون من الشركة المناسبة
        const stock = await this.prisma.stock.findUnique({
          where: {
            companyId_productId: {
              companyId: stockCompanyId,
              productId: line.productId
            }
          }
        });

        const requiredBoxes = Number(line.qty);
        const availableBoxes = Number(stock?.boxes || 0);
        
        console.log(`   المتوفر في ${stockCompanyName}: ${availableBoxes} صندوق`);
        
        if (!stock || availableBoxes < requiredBoxes) {
          throw new Error(`المخزون غير كافي للصنف: ${line.product.name}. المتوفر في ${stockCompanyName}: ${availableBoxes} صندوق، المطلوب: ${requiredBoxes} صندوق`);
        }
      }

      // حساب المبالغ حسب نوع البيع
      const total = Number(existingSale.total);
      const paidAmount = approvalData.saleType === 'CASH' ? total : 0;
      const remainingAmount = approvalData.saleType === 'CASH' ? 0 : total;
      const isFullyPaid = approvalData.saleType === 'CASH';

      // اعتماد الفاتورة وتحديث بياناتها
      const approvedSale = await this.prisma.sale.update({
        where: { id },
        data: {
          status: 'APPROVED',
          saleType: approvalData.saleType,
          paymentMethod: approvalData.paymentMethod || null,
          paidAmount,
          remainingAmount,
          isFullyPaid,
          approvedAt: new Date(),
          approvedBy
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

      // خصم المخزون
      console.log('🔄 بدء خصم المخزون بعد اعتماد الفاتورة...');
      for (const line of existingSale.lines) {
        const boxesToDecrement = Number(line.qty);
        
        // تحديد من أي شركة سيتم خصم المخزون (نفس المنطق المستخدم في التحقق)
        const stockCompanyId = line.isFromParentCompany && parentCompanyId 
          ? parentCompanyId  // خصم من الشركة الأم
          : existingSale.companyId;  // خصم من الشركة الحالية
        
        const stockCompanyName = line.isFromParentCompany && parentCompanyName
          ? parentCompanyName
          : existingSale.company.name;
        
        console.log(`   خصم ${boxesToDecrement} صندوق من ${line.product.name} في ${stockCompanyName}`);
        
        // الحصول على المخزون الحالي
        const currentStock = await this.prisma.stock.findUnique({
          where: {
            companyId_productId: {
              companyId: stockCompanyId,
              productId: line.productId
            }
          }
        });
        
        const currentBoxes = currentStock ? Number(currentStock.boxes) : 0;
        const newBoxes = Math.max(0, currentBoxes - boxesToDecrement);
        
        console.log(`   المخزون قبل الخصم: ${currentBoxes} صندوق، بعد الخصم: ${newBoxes} صندوق`);
        
        // استخدام upsert لضمان إنشاء السجل إذا لم يكن موجوداً
        await this.prisma.stock.upsert({
          where: {
            companyId_productId: {
              companyId: stockCompanyId,
              productId: line.productId
            }
          },
          update: {
            boxes: newBoxes
          },
          create: {
            companyId: existingSale.companyId,
            productId: line.productId,
            boxes: 0 // إذا لم يكن موجوداً، نبدأ من 0 (تم البيع بالفعل)
          }
        });
        
        console.log(`✅ تم خصم ${boxesToDecrement} صندوق من المخزون للصنف: ${line.product.name}`);
      }
      console.log('✅ تم خصم المخزون بنجاح');

      // 🔄 إنشاء الفواتير التلقائية (إذا كانت هناك أصناف من الشركة الأم)
      const linesFromParent = existingSale.lines.filter(line => line.isFromParentCompany);
      if (linesFromParent.length > 0 && parentCompanyId) {
        console.log('\n🔄 إنشاء الفواتير التلقائية للأصناف من الشركة الأم...');
        try {
          await this.createAutoGeneratedInvoices(
            existingSale,
            linesFromParent,
            parentCompanyId,
            parentCompanyName
          );
          console.log('✅ تم إنشاء الفواتير التلقائية بنجاح\n');
        } catch (error: any) {
          console.error('❌ خطأ في إنشاء الفواتير التلقائية:', error.message);
          // لا نوقف العملية، الفاتورة الأساسية تم اعتمادها بنجاح
        }
      }

      // تسجيل قيد محاسبي في حساب العميل (إذا كانت مبيعات آجلة وهناك عميل)
      if (approvalData.saleType === 'CREDIT' && approvedSale.customerId) {
        const CustomerAccountService = (await import('./CustomerAccountService')).default;
        await CustomerAccountService.createAccountEntry({
          customerId: approvedSale.customerId,
          transactionType: 'DEBIT', // عليه - زيادة في دين العميل
          amount: total,
          referenceType: 'SALE',
          referenceId: approvedSale.id,
          description: `فاتورة مبيعات آجلة رقم ${approvedSale.invoiceNumber || approvedSale.id}`,
          transactionDate: new Date()
        });
        console.log(`✅ تم تسجيل قيد محاسبي (عليه) بمبلغ ${total} دينار في حساب العميل`);
      }

      return {
        id: approvedSale.id,
        companyId: approvedSale.companyId,
        company: approvedSale.company,
        customerId: approvedSale.customerId,
        customer: approvedSale.customer,
        invoiceNumber: approvedSale.invoiceNumber,
        total: Number(approvedSale.total),
        status: approvedSale.status,
        notes: approvedSale.notes,
        saleType: approvedSale.saleType,
        paymentMethod: approvedSale.paymentMethod,
        paidAmount: Number(approvedSale.paidAmount),
        remainingAmount: Number(approvedSale.remainingAmount),
        isFullyPaid: approvedSale.isFullyPaid,
        approvedAt: approvedSale.approvedAt,
        approvedBy: approvedSale.approvedBy,
        createdAt: approvedSale.createdAt,
        updatedAt: approvedSale.updatedAt,
        lines: approvedSale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: line.product,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        }))
      };
    } catch (error) {
      console.error('خطأ في اعتماد الفاتورة:', error);
      throw error;
    }
  }

  /**
   * إنشاء الفواتير التلقائية عند اعتماد فاتورة تحتوي على أصناف من الشركة الأم
   */
  private async createAutoGeneratedInvoices(
    branchSale: any,
    linesFromParent: any[],
    parentCompanyId: number,
    parentCompanyName: string
  ) {
    console.log(`   📋 إنشاء فواتير تلقائية لـ ${linesFromParent.length} صنف من ${parentCompanyName}`);

    // حساب إجمالي الأصناف من الشركة الأم
    const parentSaleTotal = linesFromParent.reduce((sum, line) => 
      sum + (Number(line.qty) * Number(line.parentUnitPrice || 0)), 0
    );

    console.log(`   💰 إجمالي قيمة الأصناف من الشركة الأم: ${parentSaleTotal} دينار`);

    // 1️⃣ إنشاء أو الحصول على عميل وهمي يمثل الشركة الفرعية
    let branchAsCustomer = await this.prisma.customer.findFirst({
      where: {
        phone: `BRANCH-${branchSale.companyId}`
      }
    });

    if (!branchAsCustomer) {
      branchAsCustomer = await this.prisma.customer.create({
        data: {
          name: branchSale.company.name,
          phone: `BRANCH-${branchSale.companyId}`,
          note: `عميل وهمي يمثل ${branchSale.company.name}`
        }
      });
      console.log(`   ✅ تم إنشاء عميل وهمي: ${branchAsCustomer.name}`);
    }

    // 2️⃣ إنشاء فاتورة بيع تلقائية من التقازي للإمارات (آجلة دائماً)
    const parentSale = await this.prisma.sale.create({
      data: {
        companyId: parentCompanyId,
        customerId: branchAsCustomer.id,
        invoiceNumber: `AUTO-${parentCompanyId}-${Date.now()}`,
        total: parentSaleTotal,
        saleType: 'CREDIT', // آجلة دائماً للإمارات
        paymentMethod: null,
        paidAmount: 0,
        remainingAmount: parentSaleTotal,
        isFullyPaid: false,
        status: 'APPROVED', // معتمدة مباشرة
        isAutoGenerated: true,
        approvedAt: new Date(),
        approvedBy: 'SYSTEM',
        lines: {
          create: linesFromParent.map(line => ({
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.parentUnitPrice || 0,
            subTotal: Number(line.qty) * Number(line.parentUnitPrice || 0)
          }))
        }
      }
    });

    console.log(`   ✅ فاتورة بيع تلقائية: ${parentSale.invoiceNumber} (${parentSaleTotal} دينار)`);

    // 3️⃣ تسجيل قيد محاسبي في حساب العميل (الإمارات كعميل للتقازي)
    const CustomerAccountService = (await import('./CustomerAccountService')).default;
    await CustomerAccountService.createAccountEntry({
      customerId: branchAsCustomer.id,
      transactionType: 'DEBIT', // عليه - دين الإمارات للتقازي
      amount: parentSaleTotal,
      referenceType: 'SALE',
      referenceId: parentSale.id,
      description: `فاتورة تلقائية من ${parentCompanyName} - ${parentSale.invoiceNumber}`,
      transactionDate: new Date()
    });

    console.log(`   ✅ قيد محاسبي: ${parentSaleTotal} دينار (عليه ${branchSale.company.name})`);

    // 4️⃣ إنشاء مورد وهمي يمثل الشركة الأم
    let parentAsSupplier = await this.prisma.supplier.findFirst({
      where: {
        phone: `PARENT-${parentCompanyId}`
      }
    });

    if (!parentAsSupplier) {
      parentAsSupplier = await this.prisma.supplier.create({
        data: {
          name: parentCompanyName,
          phone: `PARENT-${parentCompanyId}`,
          note: `مورد وهمي يمثل ${parentCompanyName}`
        }
      });
      console.log(`   ✅ تم إنشاء مورد وهمي: ${parentAsSupplier.name}`);
    }

    // 5️⃣ إنشاء فاتورة مشتريات للإمارات من التقازي
    const branchPurchase = await this.prisma.purchase.create({
      data: {
        companyId: branchSale.companyId,
        supplierId: parentAsSupplier.id,
        invoiceNumber: `PUR-AUTO-${branchSale.companyId}-${Date.now()}`,
        total: parentSaleTotal,
        status: 'APPROVED', // معتمدة مباشرة
        purchaseType: 'CREDIT', // آجلة دائماً
        paymentMethod: null,
        paidAmount: 0,
        remainingAmount: parentSaleTotal,
        isFullyPaid: false,
        affectsInventory: false, // مهم! لا تؤثر على المخزون (تم الخصم بالفعل)
        lines: {
          create: linesFromParent.map(line => ({
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.parentUnitPrice || 0,
            subTotal: Number(line.qty) * Number(line.parentUnitPrice || 0)
          }))
        }
      }
    });

    console.log(`   ✅ فاتورة مشتريات: ${branchPurchase.invoiceNumber} (${parentSaleTotal} دينار)`);

    // 6️⃣ ربط الفواتير مع بعضها
    await this.prisma.sale.update({
      where: { id: branchSale.id },
      data: {
        relatedParentSaleId: parentSale.id,
        relatedBranchPurchaseId: branchPurchase.id
      }
    });

    console.log(`   ✅ تم ربط الفواتير بنجاح`);
  }
}
