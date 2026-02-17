/**
 * Sales Service
 * خدمة المبيعات
 */

import prisma from '../models/prismaClient';
import { CreateSaleDto, UpdateSaleDto, GetSalesQueryDto, CreateCustomerDto, UpdateCustomerDto, GetCustomersQueryDto } from '../dto/salesDto';
import { TreasuryController } from '../controllers/TreasuryController';

export class SalesService {
  private prisma = prisma; // Use singleton instead of new instance

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
          ...(isSystemUser !== true && {
            OR: [
              { createdByCompanyId: userCompanyId },
              { createdByCompanyId: 1 } // السماح بمنتجات شركة التقازي
            ]
          })
        },
        include: {
          group: true,
          stocks: isSystemUser ? true : {
            where: {
              OR: [
                { companyId: userCompanyId },
                { companyId: 1 } // جلب مخزون الشركة الأم أيضاً للتحقق
              ]
            }
          },
          prices: isSystemUser ? true : {
            where: { companyId: userCompanyId }
          }
        }
      });

      if (products.length !== productIds.length) {
        throw new Error('بعض الأصناف غير موجودة أو ليس لديك صلاحية للوصول إليها');
      }

      // التحقق من المخزون قبل إنشاء الفاتورة
      for (const line of data.lines) {
        const product = products.find((p: any) => p.id === line.productId);
        if (!product) continue;

        const isParentProduct = product.createdByCompanyId === 1;
        const requiredBoxes = line.qty;

        // البحث عن المخزون المحلي
        const localStock = product.stocks.find((s: any) => s.companyId === userCompanyId);
        const localAvailable = Number(localStock?.boxes || 0);

        // البحث عن مخزون الشركة الأم
        const parentStock = product.stocks.find((s: any) => s.companyId === 1);
        const parentAvailable = Number(parentStock?.boxes || 0);

        // تحديد ما إذا كان المستخدم يطلب صراحة من الشركة الأم
        const requestedFromParent = line.isFromParentCompany;

        // التحقق
        if (requestedFromParent) {
          // إذا طلب من الشركة الأم، نتحقق من مخزون الشركة الأم فقط
          if (parentAvailable < requiredBoxes) {
            throw new Error(`المخزون غير كافي للصنف "${product.name}" في مخازن الشركة الأم. المتوفر: ${parentAvailable}، المطلوب: ${requiredBoxes}`);
          }
        } else {
          // إذا طلب محلياً، نتحقق من المحلي، وإذا لم يكفِ نتحقق من الأم (إذا كان المنتج لها)
          if (localAvailable < requiredBoxes) {
            // هل يمكن تغطيته من الشركة الأم؟
            if (isParentProduct && parentAvailable >= requiredBoxes) {
              // مسموح (سيتم تحويله تلقائياً أو يدوياً لاحقاً)
              // يمكننا هنا تحويله تلقائياً إذا أردنا، لكن سنكتفي بالسماح بالمرور
            } else {
              // غير متوفر لا محلياً ولا في الأم (أو المنتج ليس للأم)
              const extraMsg = isParentProduct ? ` (ولا في الشركة الأم: ${parentAvailable})` : '';
              throw new Error(`المخزون غير كافي للصنف "${product.name}". المتوفر محلياً: ${localAvailable}${extraMsg}، المطلوب: ${requiredBoxes}`);
            }
          }
        }
      }

      // سيتم التحقق مرة أخرى عند الاعتماد لضمان عدم تغير المخزون في تلك الأثناء

      // التحقق من الخصومات المسموح بها
      for (const line of data.lines) {
        if (line.discountPercentage && line.discountPercentage > 0) {
          const product = products.find((p: any) => p.id === line.productId) as any;
          // الحصول على أقصى خصم من المجموعة أو 100 إذا لم تكن هناك مجموعة
          const maxDiscount = product?.group ? Number(product.group.maxDiscountPercentage) : 100;

          if (line.discountPercentage > maxDiscount) {
            throw new Error(`الخصم المحدد للصنف "${product?.name}" (${line.discountPercentage}%) يتجاوز الحد الأقصى المسموح به (${maxDiscount}%)`);
          }
        }
      }

      // توليد رقم الفاتورة تلقائياً
      const invoiceNumber = await this.generateInvoiceNumber(userCompanyId);


      // حساب المجموع الإجمالي من البنود
      let subTotalFromLines = 0;
      for (const line of data.lines) {
        subTotalFromLines += (line.qty * line.unitPrice) - (line.discountAmount || 0);
      }

      // حساب الخصم على إجمالي الفاتورة
      let totalDiscountAmount = 0;
      if (data.totalDiscountAmount && data.totalDiscountAmount > 0) {
        // إذا تم إرسال مبلغ الخصم مباشرة، نستخدمه كما هو (الأولوية للمبلغ لتجنب أخطاء التقريب)
        totalDiscountAmount = data.totalDiscountAmount;
      } else if (data.totalDiscountPercentage && data.totalDiscountPercentage > 0) {
        // إذا أرسلت النسبة فقط، نحسب المبلغ منها
        totalDiscountAmount = (subTotalFromLines * data.totalDiscountPercentage) / 100;
      }

      const total = subTotalFromLines - totalDiscountAmount;

      // إنشاء الفاتورة كمسودة (DRAFT)
      const sale = await this.prisma.sale.create({
        data: {
          companyId: userCompanyId,
          customerId: data.customerId,
          invoiceNumber: invoiceNumber,
          total: total,
          totalDiscountPercentage: data.totalDiscountPercentage || 0,
          totalDiscountAmount: totalDiscountAmount,
          status: 'DRAFT', // فاتورة مبدئية
          notes: data.notes || null,
          // جميع الفواتير آجلة
          saleType: 'CREDIT', // ✅ آجلة دائماً
          paymentMethod: null,
          paidAmount: 0,
          remainingAmount: total, // ✅ المبلغ المتبقي = المجموع (لم يُدفع شيء)
          isFullyPaid: false,
          lines: {
            create: data.lines.map(line => {
              return {
                productId: line.productId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                subTotal: (line.qty * line.unitPrice) - (line.discountAmount || 0),
                // للأصناف من الشركة الأم
                isFromParentCompany: line.isFromParentCompany || false,
                parentUnitPrice: line.parentUnitPrice || null,
                branchUnitPrice: line.branchUnitPrice || null,
                profitMargin: line.profitMargin || null,
                discountPercentage: line.discountPercentage || 0,
                discountAmount: line.discountAmount || 0
              }
            })
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


      return {
        id: sale.id,
        companyId: sale.companyId,
        company: sale.company,
        customerId: sale.customerId,
        customer: sale.customer,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        totalDiscountPercentage: Number(sale.totalDiscountPercentage || 0),
        totalDiscountAmount: Number(sale.totalDiscountAmount || 0),
        status: sale.status,
        notes: sale.notes,
        saleType: sale.saleType,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        lines: sale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          isFromParentCompany: (line as any).isFromParentCompany || false,
          parentUnitPrice: (line as any).parentUnitPrice ? Number((line as any).parentUnitPrice) : undefined,
          branchUnitPrice: (line as any).branchUnitPrice ? Number((line as any).branchUnitPrice) : undefined,
          profitMargin: (line as any).profitMargin ? Number((line as any).profitMargin) : undefined,
          discountPercentage: Number((line as any).discountPercentage || 0),
          discountAmount: Number((line as any).discountAmount || 0),
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

      if (query.status) {
        where.status = query.status;
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

      // الحصول على المبيعات - مع تحسين الأداء
      const [sales, total] = await Promise.all([
        this.prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            companyId: true,
            customerId: true,
            invoiceNumber: true,
            total: true,
            totalDiscountPercentage: true,
            totalDiscountAmount: true,
            status: true,
            notes: true,
            isAutoGenerated: true,
            saleType: true,
            paymentMethod: true,
            paidAmount: true,
            remainingAmount: true,
            isFullyPaid: true,
            approvedAt: true,
            approvedBy: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: { id: true, name: true, phone: true }
            },
            company: {
              select: { id: true, name: true, code: true }
            },
            lines: {
              select: {
                id: true,
                productId: true,
                qty: true,
                unitPrice: true,
                subTotal: true,
                isFromParentCompany: true,
                parentUnitPrice: true,
                branchUnitPrice: true,
                profitMargin: true,
                product: {
                  select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true, groupId: true }
                },
                discountPercentage: true,
                discountAmount: true
              }
            },
            dispatchOrders: {
              select: { id: true, status: true }
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentMethod: true,
                paymentDate: true,
                receiptNumber: true,
                notes: true
              },
              orderBy: { paymentDate: 'desc' }
            },
            _count: {
              select: { payments: true }
            }
          }
        }),
        this.prisma.sale.count({ where })
      ]);

      // Debug: عرض الشركات في النتائج
      if (query.companyId) {
        const companies = [...new Set(sales.map(s => s.companyId))];

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
            totalDiscountPercentage: Number(sale.totalDiscountPercentage || 0),
            totalDiscountAmount: Number(sale.totalDiscountAmount || 0),
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
            payments: sale.payments.map(p => ({
              id: p.id,
              amount: Number(p.amount),
              paymentMethod: p.paymentMethod,
              paymentDate: p.paymentDate,
              receiptNumber: p.receiptNumber,
              notes: p.notes
            })),
            paymentsCount: sale._count.payments, // ✅ عدد المدفوعات فقط
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            lines: sale.lines.map(line => ({
              id: line.id,
              productId: line.productId,
              product: {
                ...line.product,
                unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
              },
              qty: Number(line.qty),
              unitPrice: Number(line.unitPrice),
              isFromParentCompany: (line as any).isFromParentCompany || false,
              parentUnitPrice: (line as any).parentUnitPrice ? Number((line as any).parentUnitPrice) : undefined,
              branchUnitPrice: (line as any).branchUnitPrice ? Number((line as any).branchUnitPrice) : undefined,
              profitMargin: (line as any).profitMargin ? Number((line as any).profitMargin) : undefined,
              discountPercentage: Number((line as any).discountPercentage || 0),
              discountAmount: Number((line as any).discountAmount || 0),
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
                select: { id: true, sku: true, name: true, unit: true, unitsPerBox: true, groupId: true }
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
        totalDiscountPercentage: Number(sale.totalDiscountPercentage || 0),
        totalDiscountAmount: Number(sale.totalDiscountAmount || 0),
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
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          isFromParentCompany: (line as any).isFromParentCompany || false,
          parentUnitPrice: (line as any).parentUnitPrice ? Number((line as any).parentUnitPrice) : undefined,
          branchUnitPrice: (line as any).branchUnitPrice ? Number((line as any).branchUnitPrice) : undefined,
          profitMargin: (line as any).profitMargin ? Number((line as any).profitMargin) : undefined,
          subTotal: Number(line.subTotal),
          discountPercentage: Number((line as any).discountPercentage || 0),
          discountAmount: Number((line as any).discountAmount || 0)
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
    let products: any[] = [];
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

        // 🟢 تحسين: تجميع طلبات تحديث المخزون (إرجاع المخزون)
        // لا يمكننا تجميع التحديثات في استعلام واحد، لكن يمكننا تسريعها عبر transaction
        const stockUpdates = [];

        for (const line of existingSale.lines) {
          const oldProduct = oldProducts.find((p: any) => p.id === line.productId);
          if (!oldProduct) continue;

          // حساب الصناديق المطلوبة:
          // للأصناف بوحدة "صندوق": line.qty = عدد الصناديق مباشرة
          // للأصناف الأخرى: line.qty = الكمية بالوحدة
          let boxesToIncrement = Number(line.qty);

          // إضافة عملية التحديث للقائمة
          stockUpdates.push(
            this.prisma.stock.upsert({
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
            })
          );
        }

        // تنفيذ جميع التحديثات دفعة واحدة
        if (stockUpdates.length > 0 && existingSale.status === 'APPROVED') {
          await this.prisma.$transaction(stockUpdates);
        }



        // التحقق من توفر المخزون للبنود الجديدة
        const productIds = data.lines.map(line => line.productId);
        products = await this.prisma.product.findMany({
          where: {
            id: { in: productIds },
            ...(isSystemUser !== true && {
              OR: [
                { createdByCompanyId: userCompanyId },
                { createdByCompanyId: 1 } // السماح بمنتجات شركة التقازي
              ]
            })
          },
          include: {
            group: true,
            stocks: isSystemUser ? true : {
              where: { companyId: existingSale.companyId }
            }
          }
        });

        // التحقق من الخصومات المسموح بها في التحديث
        for (const line of data.lines) {
          if (line.discountPercentage && line.discountPercentage > 0) {
            const product = products.find((p: any) => p.id === line.productId) as any;
            // الحصول على أقصى خصم من المجموعة أو 100 إذا لم تكن هناك مجموعة
            const maxDiscount = product?.group ? Number(product.group.maxDiscountPercentage) : 100;

            if (line.discountPercentage > maxDiscount) {
              throw new Error(`الخصم المحدد للصنف "${product?.name}" (${line.discountPercentage}%) يتجاوز الحد الأقصى المسموح به (${maxDiscount}%)`);
            }
          }
        }

        for (const line of data.lines) {
          const product = products.find((p: any) => p.id === line.productId);
          if (!product) continue;

          // للـ System User: نبحث عن المخزون في الشركة المحددة
          const stock = isSystemUser
            ? product.stocks.find((s: any) => s.companyId === existingSale.companyId)
            : product.stocks[0];

          // حساب الصناديق المطلوبة:
          // ملاحظة: line.qty دائماً يمثل عدد الصناديق (الواجهة الأمامية ترسل الكمية بالصناديق)
          // السعر unitPrice يكون مضروباً في unitsPerBox للأصناف من نوع "صندوق"
          let requiredBoxes = line.qty;
          let actualUnitsToSell = line.qty;

          if (product.unit === 'صندوق' && product.unitsPerBox && Number(product.unitsPerBox) > 0) {
            // line.qty = عدد الصناديق المطلوبة
            const unitsPerBox = Number(product.unitsPerBox);
            // حساب إجمالي الوحدات (الأمتار) = عدد الصناديق × الوحدات في الصندوق
            actualUnitsToSell = requiredBoxes * unitsPerBox;
          }

          if (!stock || Number(stock.boxes) < requiredBoxes) {
            const availableBoxes = Number(stock?.boxes || 0);
            let availableUnits = '';

            if (product.unit === 'صندوق' && product.unitsPerBox) {
              const availableMeters = availableBoxes * Number(product.unitsPerBox);
              availableUnits = `${availableMeters.toFixed(2)} م² (${availableBoxes} صندوق)`;
            } else {
              availableUnits = `${availableBoxes} ${product.unit || 'وحدة'}`;
            }

            const requestedUnits = product.unit === 'صندوق' && product.unitsPerBox
              ? `${actualUnitsToSell.toFixed(2)} م² (${requiredBoxes} صندوق)`
              : `${requiredBoxes} ${product.unit || 'وحدة'}`;

            throw new Error(`المخزون غير كافي للصنف: ${product.name}. المتوفر: ${availableUnits}، المطلوب: ${requestedUnits}`);
          }
        }

        // حذف البنود القديمة
        await this.prisma.saleLine.deleteMany({
          where: { saleId: id }
        });
      }

      let total = Number(existingSale.total);
      if (data.lines) {
        // إعادة حساب المجموع الجديد
        let subTotalFromLines = 0;
        for (const line of data.lines) {
          subTotalFromLines += (line.qty * line.unitPrice) - (line.discountAmount || 0);
        }

        // حساب الخصم على إجمالي الفاتورة (نستخدم القيم الجديدة إذا توفرت، وإلا القديمة)
        const discPercentage = data.totalDiscountPercentage !== undefined ? data.totalDiscountPercentage : Number(existingSale.totalDiscountPercentage || 0);
        let discAmount = 0;

        if (data.totalDiscountAmount !== undefined && data.totalDiscountAmount > 0) {
          // الأولوية دائماً للمبلغ المباشر لتجنب أي فروقات ناتجة عن النسب المئوية
          discAmount = data.totalDiscountAmount;
        } else if (data.totalDiscountPercentage !== undefined && data.totalDiscountPercentage > 0) {
          discAmount = (subTotalFromLines * discPercentage) / 100;
        } else if (existingSale.totalDiscountAmount && Number(existingSale.totalDiscountAmount) > 0) {
          // إذا لم يرسل المستخدم خصم جديد، نستخدم المبلغ القديم
          discAmount = Number(existingSale.totalDiscountAmount);
        } else if (existingSale.totalDiscountPercentage && Number(existingSale.totalDiscountPercentage) > 0) {
          // وإذا كان القديم نسبة فقط
          discAmount = (subTotalFromLines * Number(existingSale.totalDiscountPercentage)) / 100;
        }

        total = subTotalFromLines - discAmount;
      } else {
        // إذا لم يتم تعديل البنود، نحدث الخصم الإجمالي فقط إذا تغير
        if (data.totalDiscountPercentage !== undefined || data.totalDiscountAmount !== undefined) {
          const currentSubTotal = Number(existingSale.total) + Number(existingSale.totalDiscountAmount || 0);
          const discPercentage = data.totalDiscountPercentage !== undefined ? data.totalDiscountPercentage : Number(existingSale.totalDiscountPercentage || 0);
          let discAmount = data.totalDiscountAmount !== undefined ? data.totalDiscountAmount : Number(existingSale.totalDiscountAmount || 0);

          if (data.totalDiscountPercentage !== undefined) {
            discAmount = (currentSubTotal * discPercentage) / 100;
          }

          total = currentSubTotal - discAmount;
        } else {
          total = Number(existingSale.total);
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
          total: total,
          // ✅ حفظ قيم الخصم المرسلة مباشرة بدلاً من إعادة حسابها
          totalDiscountPercentage: data.totalDiscountPercentage !== undefined ? data.totalDiscountPercentage : existingSale.totalDiscountPercentage,
          totalDiscountAmount: data.totalDiscountAmount !== undefined ? data.totalDiscountAmount : existingSale.totalDiscountAmount,
          remainingAmount: newRemainingAmount, // ✅ تحديث المبلغ المتبقي
          isFullyPaid: newRemainingAmount <= 0, // ✅ تحديث حالة الدفع
          ...(data.lines && {
            lines: {
              create: data.lines.map(line => {
                return {
                  productId: line.productId,
                  qty: line.qty,
                  unitPrice: line.unitPrice,
                  discountPercentage: line.discountPercentage || 0,
                  discountAmount: line.discountAmount || 0,
                  subTotal: (line.qty * line.unitPrice) - (line.discountAmount || 0),
                  isFromParentCompany: line.isFromParentCompany || false,
                  parentUnitPrice: line.parentUnitPrice || null,
                  branchUnitPrice: line.branchUnitPrice || null,
                  profitMargin: line.profitMargin || null
                }
              })
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
        // الحصول على بيانات الأصناف للبنود الجديدة مع المخزون
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

        // 🟢 تحسين: جلب المخزون الحالي دفعة واحدة لتجنب N+1
        const stockKeys = data.lines.map(line => ({
          companyId: existingSale.companyId,
          productId: line.productId
        }));

        const existingStocks = await this.prisma.stock.findMany({
          where: {
            OR: stockKeys
          }
        });

        // تحويل المخزون إلى Map لسهولة الوصول
        const stocksMap = new Map();
        existingStocks.forEach(stock => {
          stocksMap.set(`${stock.companyId}-${stock.productId}`, stock);
        });

        const newStockUpdates = [];

        for (const line of data.lines) {
          const product = newProducts.find((p: any) => p.id === line.productId);
          if (!product) continue;

          let boxesToDecrement = Number(line.qty);

          // الحصول على المخزون الحالي من Map المحملة مسبقاً
          const stockKey = `${existingSale.companyId}-${line.productId}`;
          const currentStock = stocksMap.get(stockKey);

          const currentBoxes = currentStock ? Number(currentStock.boxes) : 0;
          const newBoxes = Math.max(0, currentBoxes - boxesToDecrement);

          // إضافة للتحديثات المجمعة
          newStockUpdates.push(
            this.prisma.stock.upsert({
              where: {
                companyId_productId: {
                  companyId: existingSale.companyId,
                  productId: line.productId
                }
              },
              update: {
                boxes: newBoxes
              },
              create: {
                companyId: existingSale.companyId,
                productId: line.productId,
                boxes: 0 // إذا لم يكن موجوداً، نبدأ من 0
              }
            })
          );
        }

        // تنفيذ التحديثات دفعة واحدة
        if (newStockUpdates.length > 0 && existingSale.status === 'APPROVED') {
          await this.prisma.$transaction(newStockUpdates);
        }
      }

      // 🔄 تحديث فاتورة التقازي وفاتورة المشتريات المرتبطة إذا كانت موجودة
      if (data.lines && existingSale.relatedParentSaleId) {


        // جلب فاتورة التقازي القديمة للحصول على الأسعار الأصلية (سعر الجملة الثابت)
        const oldParentSale = await this.prisma.sale.findUnique({
          where: { id: existingSale.relatedParentSaleId },
          include: { lines: true }
        });

        // فصل أصناف التقازي من البنود الجديدة
        const parentCompanyLines = data.lines.filter(line => {
          const product = updatedSale.lines.find((l: any) => l.productId === line.productId)?.product;
          return product && product.createdByCompanyId === 1; // ID الشركة الأم = 1
        });

        if (parentCompanyLines.length > 0 && oldParentSale) {
          // حذف البنود القديمة من فاتورة التقازي
          await this.prisma.saleLine.deleteMany({
            where: { saleId: existingSale.relatedParentSaleId }
          });

          // 🟢 تحسين: جلب أسعار المنتجات (الجملة) دفعة واحدة لتجنب N+1
          // نحتاج لسعر البيع للشركة الأم (ID: 1)
          const productIdsToCheck = parentCompanyLines.map(l => l.productId);
          const pricesMap = new Map();

          // جلب سجلات الأسعار
          const priceRecords = await this.prisma.companyProductPrice.findMany({
            where: {
              companyId: 1, // التقازي
              productId: { in: productIdsToCheck }
            }
          });

          priceRecords.forEach(p => pricesMap.set(p.productId, Number(p.sellPrice)));

          // حساب المجموع الجديد لفاتورة التقازي (الكمية فقط، السعر ثابت)
          let parentSaleTotal = 0;
          const parentSaleNewLines = [];

          for (const line of parentCompanyLines) {
            const product = updatedSale.lines.find((l: any) => l.productId === line.productId)?.product;
            if (!product) continue;

            // ✅ استخدام السعر الأصلي من فاتورة التقازي القديمة (سعر الجملة الثابت)
            const oldLine = oldParentSale.lines.find((l: any) => l.productId === line.productId);
            let originalPrice;

            if (oldLine) {
              // الصنف موجود في الفاتورة القديمة → استخدم سعره القديم
              originalPrice = Number(oldLine.unitPrice);
            } else {
              // صنف جديد → احصل على سعر الجملة من Map المحمل مسبقاً
              const priceFromMap = pricesMap.get(line.productId);
              originalPrice = priceFromMap !== undefined ? priceFromMap : line.unitPrice;
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


          // 🔄 تحديث فاتورة المشتريات أيضاً
          if (existingSale.relatedBranchPurchaseId) {


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

          }
        } else {

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
        totalDiscountPercentage: Number(updatedSale.totalDiscountPercentage || 0),
        totalDiscountAmount: Number(updatedSale.totalDiscountAmount || 0),
        saleType: updatedSale.saleType,
        paymentMethod: updatedSale.paymentMethod,
        createdAt: updatedSale.createdAt,
        lines: updatedSale.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPercentage: Number((line as any).discountPercentage || 0),
          discountAmount: Number((line as any).discountAmount || 0),
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
        select: { id: true, invoiceNumber: true }
      });

      if (parentComplexSale) {
        throw new Error(`⛔ لا يمكن حذف هذه الفاتورة مباشرة! هذه فاتورة تلقائية مرتبطة بالفاتورة رقم ${parentComplexSale.invoiceNumber}. يجب حذف الفاتورة الأصلية ليتم حذف هذه تلقائياً.`);
      }

      // تنفيذ الحذف كعملية ذرية واحدة
      await this.prisma.$transaction(async (tx) => {
        // 1. حذف الفواتير المرتبطة (Cascade Delete) إذا كانت فاتورة معقدة
        if (existingSale.relatedParentSaleId || existingSale.relatedBranchPurchaseId || existingSale.relatedPurchaseFromParentId) {
          // أ. حذف فاتورة الشركة الأم
          if (existingSale.relatedParentSaleId) {
            const parentSale = await tx.sale.findUnique({
              where: { id: existingSale.relatedParentSaleId },
              include: { lines: true }
            });

            if (parentSale) {
              // إرجاع مخزون الشركة الأم
              for (const line of parentSale.lines) {
                await tx.stock.upsert({
                  where: {
                    companyId_productId: {
                      companyId: parentSale.companyId,
                      productId: line.productId
                    }
                  },
                  update: {
                    boxes: { increment: Number(line.qty) }
                  },
                  create: {
                    companyId: parentSale.companyId,
                    productId: line.productId,
                    boxes: Number(line.qty)
                  }
                });
              }

              // حذف أسطر وإيصالات الفاتورة
              await tx.saleLine.deleteMany({ where: { saleId: parentSale.id } });
              await tx.salePayment.deleteMany({ where: { saleId: parentSale.id } });
              await tx.sale.delete({ where: { id: parentSale.id } });
            }
          }

          // ب. حذف فاتورة مشتريات الشركة التابعة
          if (existingSale.relatedBranchPurchaseId) {
            const branchPurchase = await tx.purchase.findUnique({
              where: { id: existingSale.relatedBranchPurchaseId }
            });

            if (branchPurchase) {
              await tx.purchaseLine.deleteMany({ where: { purchaseId: branchPurchase.id } });
              await tx.purchasePayment.deleteMany({ where: { purchaseId: branchPurchase.id } });
              await tx.purchase.delete({ where: { id: branchPurchase.id } });
            }
          }

          // ج. حذف سجل PurchaseFromParent
          if (existingSale.relatedPurchaseFromParentId) {
            await tx.purchaseFromParentLine.deleteMany({ where: { purchaseId: existingSale.relatedPurchaseFromParentId } });
            await tx.purchaseFromParentReceipt.deleteMany({ where: { purchaseId: existingSale.relatedPurchaseFromParentId } });
            await tx.purchaseFromParent.delete({ where: { id: existingSale.relatedPurchaseFromParentId } });
          }
        }

        // 2. إرجاع مخزون الفاتورة الحالية (إذا كانت معتمدة)
        if (existingSale.status === 'APPROVED') {
          for (const line of existingSale.lines) {
            await tx.stock.upsert({
              where: {
                companyId_productId: {
                  companyId: existingSale.companyId,
                  productId: line.productId
                }
              },
              update: {
                boxes: { increment: Number(line.qty) }
              },
              create: {
                companyId: existingSale.companyId,
                productId: line.productId,
                boxes: Number(line.qty)
              }
            });
          }

          // 3. معالجة الجوانب المالية (حساب العميل والخزينة)
          const salePayments = await tx.salePayment.findMany({
            where: { saleId: id },
            select: { id: true }
          });
          const paymentIds = salePayments.map(p => p.id);

          // أ. حذف قيود حساب العميل
          await tx.customerAccount.deleteMany({
            where: {
              OR: [
                { referenceType: 'SALE' as any, referenceId: id },
                { referenceType: 'PAYMENT' as any, referenceId: id },
                { referenceType: 'PAYMENT' as any, referenceId: { in: paymentIds } }
              ]
            }
          });

          // ب. عكس حركات الخزينة
          const treasuryTransactions = await tx.treasuryTransaction.findMany({
            where: {
              OR: [
                { referenceType: 'Sale', referenceId: id },
                { referenceType: 'SalePayment', referenceId: { in: paymentIds } }
              ]
            }
          });

          for (const ttx of treasuryTransactions) {
            await tx.treasury.update({
              where: { id: ttx.treasuryId },
              data: {
                balance: { decrement: ttx.amount }
              }
            });
            await tx.treasuryTransaction.delete({ where: { id: ttx.id } });
          }

          // ج. حذف أوامر الصرف
          await tx.dispatchOrder.deleteMany({ where: { saleId: id } });

          // د. فك الارتباط بالفواتير الخارجية
          await tx.externalStoreInvoice.updateMany({
            where: { saleId: id },
            data: { saleId: null }
          });
        }

        // 4. تحديث العروض السعرية المحولة (فك الارتباط)
        await tx.provisionalSale.updateMany({
          where: { convertedSaleId: id },
          data: {
            convertedSaleId: null,
            isConverted: false
          }
        });

        // 5. حذف البنود والدفعات والفاتورة الأصلية
        await tx.saleLine.deleteMany({ where: { saleId: id } });
        await tx.salePayment.deleteMany({ where: { saleId: id } });
        await tx.sale.delete({ where: { id } });
      });

      return { message: 'تم حذف الفاتورة بجميع تبعاتها بنجاح' };
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
          totalDiscountPercentage: Number(updatedSale.totalDiscountPercentage || 0),
          totalDiscountAmount: Number(updatedSale.totalDiscountAmount || 0),
          saleType: updatedSale.saleType,
          paymentMethod: updatedSale.paymentMethod,
          receiptIssued: updatedSale.receiptIssued,
          receiptIssuedAt: updatedSale.receiptIssuedAt,
          receiptIssuedBy: updatedSale.receiptIssuedBy,
          createdAt: updatedSale.createdAt,
          lines: updatedSale.lines.map(line => ({
            id: line.id,
            productId: line.productId,
            product: {
              ...line.product,
              unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
            },
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            discountPercentage: Number((line as any).discountPercentage || 0),
            discountAmount: Number((line as any).discountAmount || 0),
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
        ...(isSystemUser !== true && { companyId: userCompanyId }),
        status: 'APPROVED'
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
   * إحصائيات المبيعات لكل شركة
   */
  async getSalesByCompany() {
    try {
      const companies = await this.prisma.company.findMany({
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const companyStats = await Promise.all(
        companies.map(async (company) => {
          const [
            totalRevenue,
            monthRevenue
          ] = await Promise.all([
            this.prisma.sale.aggregate({
              where: {
                companyId: company.id,
                status: 'APPROVED'
              },
              _sum: { total: true }
            }),
            this.prisma.sale.aggregate({
              where: {
                companyId: company.id,
                status: 'APPROVED',
                createdAt: { gte: startOfMonth }
              },
              _sum: { total: true }
            })
          ]);

          return {
            companyId: company.id,
            companyName: company.name,
            companyCode: company.code,
            totalRevenue: Number(totalRevenue._sum.total || 0),
            monthRevenue: Number(monthRevenue._sum.total || 0)
          };
        })
      );

      return {
        success: true,
        message: 'تم جلب إحصائيات المبيعات لكل شركة بنجاح',
        data: companyStats
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات المبيعات لكل شركة:', error);
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
        ...(isSystemUser !== true && { companyId: userCompanyId }),
        status: 'APPROVED'
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
      notes: data.note || null
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


          // الحصول على أعلى ID موجود
          const lastCustomer = await this.prisma.customer.findFirst({
            orderBy: { id: 'desc' }
          });

          const maxId = lastCustomer?.id || 0;


          // إصلاح الـ sequence
          await this.prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"Customer"', 'id'), ${maxId}, true);`
          );



          // إعادة المحاولة بدون تحديد ID
          const customer = await this.prisma.customer.create({
            data: customerData
          });


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
          notes: data.note
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
      // الحصول على آخر رقم فاتورة (رقمي) لنفس الشركة فقط
      // ملاحظة: invoiceNumber قد يتم تعديله يدوياً ليصبح غير رقمي، لذلك نتجاهل القيم غير الرقمية
      const lastSales = await this.prisma.sale.findMany({
        where: {
          companyId,
          invoiceNumber: { not: null }
        },
        orderBy: { id: 'desc' },
        select: { invoiceNumber: true },
        take: 50
      });

      let nextNumber = 1;

      for (const s of lastSales) {
        const raw = (s.invoiceNumber || '').trim();
        if (!raw) continue;
        if (!/^\d+$/.test(raw)) continue;
        const lastNumber = parseInt(raw, 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
          break;
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
    approvalData: { saleType: 'CASH' | 'CREDIT'; paymentMethod?: 'CASH' | 'BANK' | 'CARD'; bankAccountId?: number },
    userCompanyId: number,
    approvedBy: string,
    isSystemUser: boolean = false,
    bypassAutoGeneratedCheck: boolean = false
  ) {
    try {


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



      // التحقق: الفاتورة التلقائية لا يمكن اعتمادها يدوياً (إلا إذا تم تجاوز الفحص)
      if (saleCheck.isAutoGenerated && !bypassAutoGeneratedCheck) {
        throw new Error('لا يمكن اعتماد الفواتير التلقائية يدوياً');
      }

      // التحقق: الفاتورة معتمدة بالفعل
      if (saleCheck.status === 'APPROVED') {
        throw new Error('الفاتورة معتمدة بالفعل');
      }

      if (saleCheck.status !== 'DRAFT') {
        throw new Error(`لا يمكن اعتماد فاتورة بحالة: ${saleCheck.status}`);
      }

      // التحقق من وجود الفاتورة وأنها مبدئية مع جلب العلاقات اللازمة
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
        throw new Error('الفاتورة غير موجودة أو تم اعتمادها بالفعل من قبل مستخدم آخر');
      }

      // جلب معلومات الشركة الأم
      let parentCompanyId = existingSale.company.parentId;
      let parentCompanyName = '';

      if (parentCompanyId) {
        const parentCompany = await this.prisma.company.findUnique({
          where: { id: parentCompanyId },
          select: { name: true }
        });
        parentCompanyName = parentCompany?.name || '';
      }

      // حساب المبالغ حسب نوع البيع
      const total = Number(existingSale.total);
      const paidAmount = approvalData.saleType === 'CASH' ? total : 0;
      const remainingAmount = approvalData.saleType === 'CASH' ? 0 : total;
      const isFullyPaid = approvalData.saleType === 'CASH';
      const shouldIssueReceipt = approvalData.saleType === 'CASH';

      // 1. التحقق من المخزون وتحديد المصادر (Auto-Fix)
      // 🟢 تحسين: جلب جميع المخزونات الممكنة (المحلية والأم) لتقليل الاستعلامات
      const allProductIds = existingSale.lines.map(l => l.productId);
      const relevantCompanyIds = [existingSale.companyId];
      if (parentCompanyId) relevantCompanyIds.push(parentCompanyId);

      const allStocks = await this.prisma.stock.findMany({
        where: {
          productId: { in: allProductIds },
          companyId: { in: relevantCompanyIds }
        }
      });

      const getStockLevel = (companyId: number, productId: number) => {
        const s = allStocks.find(st => st.companyId === companyId && st.productId === productId);
        return s ? Number(s.boxes) : 0;
      };

      // مصفوفة لتخزين تحديثات أسطر الفاتورة إذا احتجنا لتغيير isFromParentCompany
      const lineAttributeUpdates: { id: number; data: any }[] = [];

      for (const line of existingSale.lines) {
        const required = Number(line.qty);
        let currentSourceId = line.isFromParentCompany && parentCompanyId ? parentCompanyId : existingSale.companyId;
        let available = getStockLevel(currentSourceId, line.productId);

        if (available < required) {
          // هل يمكننا الاستعارة من الشركة الأم؟
          let solvedByParent = false;

          if (!line.isFromParentCompany && parentCompanyId && (line.product as any).createdByCompanyId === parentCompanyId) {
            const parentAvailable = getStockLevel(parentCompanyId, line.productId);
            if (parentAvailable >= required) {
              // تغيير المصدر للشركة الأم في الذاكرة وفي قاعدة البيانات لاحقاً
              (line as any).isFromParentCompany = true;
              lineAttributeUpdates.push({
                id: line.id,
                data: { isFromParentCompany: true }
              });
              solvedByParent = true;
            } else {
              // إذا فشل حتى في الشركة الأم، هذا خطأ مزدوج
              throw new Error(`المخزون غير كافي للصنف ${line.product.name}. المتوفر محلياً: ${available} وفي الشركة الأم: ${parentAvailable}. المطلوب: ${required}`);
            }
          }

          if (!solvedByParent) {
            const sourceName = currentSourceId === parentCompanyId ? parentCompanyName : existingSale.company.name;
            // إعادة تفعيل الخطأ لمنع البيع بالسالب
            throw new Error(`المخزون غير كافي للصنف ${line.product.name} في ${sourceName}. المتوفر: ${available}. المطلوب: ${required}`);
          }
        }
      }

      // 2. تنفيذ الاعتماد وخصم المخزون في transaction واحد
      const approvedSale = await this.prisma.$transaction(async (tx) => {
        // أ. تحديث أسطر الفاتورة (إذا تم تغيير مصدر أي صنف)
        if (lineAttributeUpdates.length > 0) {
          for (const updateOp of lineAttributeUpdates) {
            await tx.saleLine.update({
              where: { id: updateOp.id },
              data: updateOp.data
            });
          }
        }

        // ب. تحديث حالة الفاتورة (Optimistic Lock)
        const updated = await tx.sale.update({
          where: { id, status: 'DRAFT' },
          data: {
            status: 'APPROVED',
            saleType: approvalData.saleType,
            paymentMethod: approvalData.paymentMethod || null,
            paidAmount,
            remainingAmount,
            isFullyPaid,
            approvedAt: new Date(),
            approvedBy,
            ...(shouldIssueReceipt ? {
              receiptIssued: true,
              receiptIssuedAt: new Date(),
              receiptIssuedBy: approvedBy
            } : {})
          },
          include: {
            customer: true,
            company: { select: { id: true, name: true, code: true } },
            lines: { include: { product: true } }
          }
        });

        // ج. خصم المخزون
        for (const line of existingSale.lines) {
          // إذا كان الصنف من الشركة الأم، لا نخصم المخزون هنا
          // سيتم خصمه عندما يتم اعتماد الفاتورة التلقائية (Parent Sale)
          console.log(`Processing Stock for Line ${line.id}: Product ${line.productId}, Qty ${line.qty}, isFromParent=${line.isFromParentCompany}, ParentCompanyId=${parentCompanyId}`);

          if (line.isFromParentCompany && parentCompanyId) {
            console.log(`Skipping stock deduction for line ${line.id} (Parent Item)`);
            continue;
          }

          const boxesToDecrement = Number(line.qty);
          const stockCompanyId = existingSale.companyId;

          await tx.stock.upsert({
            where: { companyId_productId: { companyId: stockCompanyId, productId: line.productId } },
            update: { boxes: { decrement: boxesToDecrement } },
            create: { companyId: stockCompanyId, productId: line.productId, boxes: -boxesToDecrement }
          });
        }

        return updated;
      });

      // 3. العمليات اللاحقة (خارج الـ transaction الرئيسي لتجنب تعليق قاعدة البيانات)
      // 🔄 إنشاء الفواتير التلقائية
      const linesFromParent = existingSale.lines.filter(line => line.isFromParentCompany);
      if (linesFromParent.length > 0 && parentCompanyId) {
        try {
          await this.createAutoGeneratedInvoices(existingSale, linesFromParent, parentCompanyId, parentCompanyName);
        } catch (error: any) {
          console.error('❌ خطأ في إنشاء الفواتير التلقائية:', error.message);
        }
      }

      // تسجيل قيد محاسبي في حساب العميل (إذا كان هناك عميل)
      if (approvedSale.customerId) {
        const CustomerAccountService = (await import('./CustomerAccountService')).default;

        if (approvalData.saleType === 'CREDIT') {
          // مبيعات آجلة - قيد مديونية فقط
          await CustomerAccountService.createAccountEntry({
            customerId: approvedSale.customerId,
            transactionType: 'DEBIT', // عليه - زيادة في دين العميل
            amount: total,
            referenceType: 'SALE',
            referenceId: approvedSale.id,
            description: `فاتورة مبيعات آجلة رقم ${approvedSale.invoiceNumber || approvedSale.id}`,
            transactionDate: new Date()
          });
        } else if (approvalData.saleType === 'CASH') {
          // مبيعات نقدية - قيد مديونية + قيد دفع لسدادها فوراً في كشف الحساب
          // 1. قيد المديونية
          await CustomerAccountService.createAccountEntry({
            customerId: approvedSale.customerId,
            transactionType: 'DEBIT',
            amount: total,
            referenceType: 'SALE',
            referenceId: approvedSale.id,
            description: `فاتورة مبيعات نقدية رقم ${approvedSale.invoiceNumber || approvedSale.id}`,
            transactionDate: new Date()
          });

          // 2. قيد الدفع
          await CustomerAccountService.createAccountEntry({
            customerId: approvedSale.customerId,
            transactionType: 'CREDIT', // له - تخفيض من دين العميل
            amount: total,
            referenceType: 'PAYMENT',
            referenceId: approvedSale.id,
            description: `دفع نقداً مقابل فاتورة رقم ${approvedSale.invoiceNumber || approvedSale.id}`,
            transactionDate: new Date()
          });
        }
      }

      // إضافة المبلغ للخزينة (إذا كانت مبيعات نقدية)
      if (approvalData.saleType === 'CASH') {
        try {
          let targetTreasuryId: number | null = null;
          let treasuryName = '';

          // تحديد الخزينة المستهدفة حسب طريقة الدفع
          if (approvalData.paymentMethod === 'CASH') {
            // نقدي كاش - خزينة الشركة
            const companyTreasury = await this.prisma.treasury.findFirst({
              where: {
                companyId: existingSale.companyId,
                type: 'COMPANY',
                isActive: true
              }
            });
            if (companyTreasury) {
              targetTreasuryId = companyTreasury.id;
              treasuryName = companyTreasury.name;
            }
          } else if ((approvalData.paymentMethod === 'BANK' || approvalData.paymentMethod === 'CARD') && approvalData.bankAccountId) {
            // بطاقة أو حوالة مصرفية - الحساب المصرفي المحدد
            const bankAccount = await this.prisma.treasury.findFirst({
              where: {
                id: approvalData.bankAccountId,
                type: 'BANK',
                isActive: true
              }
            });
            if (bankAccount) {
              targetTreasuryId = bankAccount.id;
              treasuryName = bankAccount.name;
            }
          }

          if (targetTreasuryId) {
            // بناء وصف تفصيلي للحركة
            const customerInfo = approvedSale.customer
              ? `- الزبون: ${approvedSale.customer.name}${approvedSale.customer.phone ? ` (${approvedSale.customer.phone})` : ''}`
              : '';
            const description = `فاتورة مبيعات نقدية رقم ${approvedSale.invoiceNumber || approvedSale.id} - ${approvedSale.company.name} ${customerInfo}`.trim();

            await TreasuryController.addToTreasury(
              targetTreasuryId,
              total,
              'SALE',
              'Sale',
              approvedSale.id,
              description,
              approvedBy
            );
          } else {
            // No suitable treasury found
          }
        } catch (treasuryError) {
          console.error('خطأ في تحديث الخزينة:', treasuryError);
          // لا نوقف العملية إذا فشل تحديث الخزينة
        }
      }

      return {
        id: approvedSale.id,
        companyId: approvedSale.companyId,
        company: approvedSale.company,
        customerId: approvedSale.customerId,
        customer: approvedSale.customer,
        invoiceNumber: approvedSale.invoiceNumber,
        total: Number(approvedSale.total),
        totalDiscountPercentage: Number(approvedSale.totalDiscountPercentage || 0),
        totalDiscountAmount: Number(approvedSale.totalDiscountAmount || 0),
        status: approvedSale.status,
        notes: approvedSale.notes,
        saleType: approvedSale.saleType,
        paymentMethod: approvedSale.paymentMethod,
        receiptIssued: approvedSale.receiptIssued,
        receiptIssuedAt: approvedSale.receiptIssuedAt,
        receiptIssuedBy: approvedSale.receiptIssuedBy,
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
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          discountPercentage: Number((line as any).discountPercentage || 0),
          discountAmount: Number((line as any).discountAmount || 0),
          subTotal: Number(line.subTotal)
        }))
      };
    } catch (error) {
      console.error('خطأ في اعتماد الفاتورة:', error);
      throw error;
    }
  }

  /**
   * إلغاء فاتورة مبيعات معتمدة (آجلة فقط ولم يتم استلام دفعات)
   */
  async cancelSale(id: number, userCompanyId: number, isSystemUser: boolean = false) {
    try {
      // 1. التحقق من وجود الفاتورة وحالتها
      const existingSale = await this.prisma.sale.findFirst({
        where: {
          id,
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          lines: true,
          payments: true
        }
      });

      if (!existingSale) {
        throw new Error('الفاتورة غير موجودة أو ليس لديك صلاحية لإلغائها');
      }

      // التحقق من الشروط: معتمدة، آجلة، لا توجد دفعات
      if (existingSale.status !== 'APPROVED') {
        throw new Error('لا يمكن إلغاء فاتورة غير معتمدة. يمكنك حذفها بدلاً من ذلك.');
      }

      if (existingSale.saleType !== 'CREDIT') {
        throw new Error('لا يمكن إلغاء مبيعات نقدية من هذه الشاشة. يرجى مراجعة الإدارة.');
      }

      if (Number(existingSale.paidAmount) > 0 || existingSale.payments.length > 0) {
        throw new Error('لا يمكن إلغاء فاتورة تم استلام دفعات عليها. يرجى حذف الدفعات أولاً إذا كان ذلك مسموحاً.');
      }

      // 2. معالجة الإلغاء في transaction
      await this.prisma.$transaction(async (tx) => {
        // أ. تحديث حالة الفاتورة
        await tx.sale.update({
          where: { id },
          data: {
            status: 'CANCELLED' as any,
            notes: existingSale.notes ? `${existingSale.notes} | [تم الإلغاء في ${new Date().toLocaleString('ar-LY')}]` : `[تم الإلغاء في ${new Date().toLocaleString('ar-LY')}]`
          }
        });

        // ب. إرجاع المخزون للفاتورة الأصلية
        for (const line of existingSale.lines) {
          await tx.stock.upsert({
            where: {
              companyId_productId: {
                companyId: existingSale.companyId,
                productId: line.productId
              }
            },
            update: {
              boxes: { increment: Number(line.qty) }
            },
            create: {
              companyId: existingSale.companyId,
              productId: line.productId,
              boxes: Number(line.qty)
            }
          });
        }

        // ج. معالجة الفواتير المرتبطة (الفواتير التلقائية)
        if (existingSale.relatedParentSaleId || existingSale.relatedBranchPurchaseId || existingSale.relatedPurchaseFromParentId) {

          // 1. إرجاع مخزون الشركة الأم وتحديث فاتورتها
          if (existingSale.relatedParentSaleId) {
            const parentSale = await tx.sale.findUnique({
              where: { id: existingSale.relatedParentSaleId },
              include: { lines: true }
            });

            if (parentSale && parentSale.status === 'APPROVED') {
              for (const line of parentSale.lines) {
                await tx.stock.upsert({
                  where: {
                    companyId_productId: {
                      companyId: parentSale.companyId,
                      productId: line.productId
                    }
                  },
                  update: { boxes: { increment: Number(line.qty) } },
                  create: {
                    companyId: parentSale.companyId,
                    productId: line.productId,
                    boxes: Number(line.qty)
                  }
                });
              }
              await tx.sale.update({
                where: { id: parentSale.id },
                data: { status: 'CANCELLED' as any }
              });
            }
          }

          // 2. تحديث فاتورة مشتريات الشركة التابعة
          if (existingSale.relatedBranchPurchaseId) {
            await tx.purchase.update({
              where: { id: existingSale.relatedBranchPurchaseId },
              data: { status: 'CANCELLED' as any }
            });
          }

          // 3. تحديث سجل PurchaseFromParent
          if (existingSale.relatedPurchaseFromParentId) {
            // PurchaseFromParent does not have a status field. Since the sale is cancelled, 
            // we should remove this inter-company debt record.

            // Delete lines first (no cascade on model)
            await tx.purchaseFromParentLine.deleteMany({
              where: { purchaseId: existingSale.relatedPurchaseFromParentId }
            });

            // Delete the purchase record
            await tx.purchaseFromParent.delete({
              where: { id: existingSale.relatedPurchaseFromParentId }
            });
          }
        }

        // د. حذف قيود حساب العميل المرتبطة بهذه الفاتورة
        await tx.customerAccount.deleteMany({
          where: {
            referenceType: 'SALE',
            referenceId: id
          }
        });

        // هـ. حذف أوامر الصرف المرتبطة بهذه الفاتورة (لإزالتها من شاشة المخزن)
        await tx.dispatchOrder.deleteMany({
          where: { saleId: id }
        });

        // ملاحظة: بما أنها مبيعات آجلة ولم يتم دفع شيء، لا نحتاج لتعديل الخزينة
      });

      return { message: 'تم إلغاء الفاتورة وجميع التبعات المرتبطة بنجاح' };
    } catch (error) {
      console.error('خطأ في إلغاء الفاتورة:', error);
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

    // جلب معلومات المنتجات لحساب الإجمالي بشكل صحيح
    const productIds = linesFromParent.map(line => line.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, unit: true, unitsPerBox: true }
    });

    // حساب إجمالي الأصناف من الشركة الأم
    // ملاحظة: نحسب المجموع من subTotal المحسوب في البنود لتجنب الحساب المزدوج
    const parentSaleTotal = linesFromParent.reduce((sum, line) => {
      const product = products.find(p => p.id === line.productId);
      const qty = Number(line.qty);
      const parentUnitPrice = Number(line.parentUnitPrice || 0);

      // حساب المجموع الفرعي بشكل صحيح
      // qty × parentUnitPrice (السعر يجب أن يكون بالفعل لكل صندوق أو لكل وحدة حسب نوع المنتج)
      const lineTotal = qty * parentUnitPrice;

      return sum + lineTotal;
    }, 0);



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
          notes: `عميل وهمي يمثل ${branchSale.company.name}`
        }
      });

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
        status: 'DRAFT', // نبدأ بـ DRAFT ثم نعتمدها
        isAutoGenerated: true,
        lines: {
          create: linesFromParent.map(line => {
            const qty = Number(line.qty);
            const parentUnitPrice = Number(line.parentUnitPrice || 0);
            const subTotal = qty * parentUnitPrice;
            return {
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.parentUnitPrice || 0,
              subTotal: subTotal
            };
          })
        }
      }
    });

    // اعتماد الفاتورة التلقائية لخصم المخزون وتسجيل القيود
    await this.approveSale(
      parentSale.id,
      { saleType: 'CREDIT', paymentMethod: 'CASH' },
      parentCompanyId,
      'SYSTEM',
      true,
      true
    );

    // ❌ (تمت الإزالة) لا نسجل قيد محاسبي يدوياً لأنه يتم داخل approveSale



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

    }

    // 5️⃣ إنشاء فاتورة مشتريات للإمارات من التقازي
    const branchPurchase = await this.prisma.purchase.create({
      data: {
        companyId: branchSale.companyId,
        supplierId: parentAsSupplier.id,
        invoiceNumber: `PUR-AUTO-${branchSale.companyId}-${Date.now()}`,
        total: parentSaleTotal,
        status: 'APPROVED', // معتمدة مباشرة
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'SYSTEM',
        purchaseType: 'CREDIT', // آجلة دائماً
        paymentMethod: null,
        paidAmount: 0,
        remainingAmount: parentSaleTotal,
        isFullyPaid: false,
        affectsInventory: false, // مهم! لا تؤثر على المخزون (تم الخصم بالفعل)
        lines: {
          create: linesFromParent.map(line => {
            const qty = Number(line.qty);
            const parentUnitPrice = Number(line.parentUnitPrice || 0);
            const subTotal = qty * parentUnitPrice;
            return {
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.parentUnitPrice || 0,
              subTotal: subTotal
            };
          })
        }
      }
    });



    // 6️⃣ تسجيل قيد محاسبي في حساب المورد (التقازي كمورد للإمارات)
    const SupplierAccountService = (await import('./SupplierAccountService')).default;
    await SupplierAccountService.createAccountEntry({
      supplierId: parentAsSupplier.id,
      transactionType: 'CREDIT', // له - دين على الإمارات للتقازي
      amount: parentSaleTotal,
      referenceType: 'PURCHASE',
      referenceId: branchPurchase.id,
      description: `فاتورة مشتريات تلقائية من ${parentCompanyName} - ${branchPurchase.invoiceNumber}`,
      transactionDate: new Date()
    });

    // 7️⃣ إنشاء إيصال دفع معلق (للسداد لاحقاً)
    await this.prisma.supplierPaymentReceipt.create({
      data: {
        supplierId: parentAsSupplier.id,
        purchaseId: branchPurchase.id,
        companyId: branchSale.companyId,
        amount: parentSaleTotal,
        type: 'MAIN_PURCHASE',
        status: 'PENDING',
        description: `استحقاق تلقائي لفاتورة المشتريات رقم ${branchPurchase.invoiceNumber} من ${parentCompanyName}`,
        createdAt: new Date(),
        currency: 'LYD',
        exchangeRate: 1
      }
    });

    // 8️⃣ ربط الفواتير مع بعضها
    await this.prisma.sale.update({
      where: { id: branchSale.id },
      data: {
        relatedParentSaleId: parentSale.id,
        relatedBranchPurchaseId: branchPurchase.id
      }
    });


  }
}
