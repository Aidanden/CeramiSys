import prisma from '../models/prismaClient';
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

export class PurchaseService {
  // Generate invoice number
  private static async generateInvoiceNumber(): Promise<string> {
    try {
      // الحصول على آخر فاتورة
      const lastPurchase = await prisma.purchase.findFirst({
        orderBy: { id: 'desc' },
        select: { invoiceNumber: true }
      });

      let nextNumber = 1;

      if (lastPurchase?.invoiceNumber) {
        // استخراج الرقم من آخر فاتورة
        const lastNumber = parseInt(lastPurchase.invoiceNumber);
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

  // Create a new purchase
  static async createPurchase(data: CreatePurchaseRequest): Promise<Purchase> {
    let { companyId, supplierId, invoiceNumber, purchaseType, paymentMethod, lines } = data;

    // إذا لم يتم تقديم رقم فاتورة، قم بتوليده تلقائياً
    if (!invoiceNumber) {
      invoiceNumber = await this.generateInvoiceNumber();
    }

    // جلب معلومات المنتجات لحساب الـ subTotal بشكل صحيح
    const productIds = lines.map(line => line.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, unit: true, unitsPerBox: true }
    });

    // Calculate total (Assume unit prices in the lines are in the selected currency)
    const currency = data.currency || 'LYD';
    const exchangeRate = data.exchangeRate || 1.0;

    // حساب الإجمالي مع الأخذ في الاعتبار وحدة المنتج
    const totalForeign = lines.reduce((sum, line) => {
      const product = products.find(p => p.id === line.productId);
      let lineTotal = line.qty * line.unitPrice;
      
      // إذا كانت الوحدة صندوق، يجب ضرب الكمية في unitsPerBox
      if (product && product.unit === 'صندوق' && product.unitsPerBox) {
        const totalMeters = line.qty * Number(product.unitsPerBox);
        lineTotal = totalMeters * line.unitPrice;
      }
      
      return sum + lineTotal;
    }, 0);

    // Convert to LYD for the main total field
    const total = currency === 'LYD' ? totalForeign : totalForeign * exchangeRate;

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
        currency,
        exchangeRate,
        totalForeign: currency === 'LYD' ? null : totalForeign,
        paidAmount,
        remainingAmount,
        purchaseType,
        paymentMethod: purchaseType === 'CASH' ? paymentMethod : null,
        isFullyPaid,
        lines: {
          create: lines.map(line => {
            const product = products.find(p => p.id === line.productId);
            let subTotal = line.qty * line.unitPrice;
            
            // إذا كانت الوحدة صندوق، يجب ضرب الكمية في unitsPerBox
            if (product && product.unit === 'صندوق' && product.unitsPerBox) {
              const totalMeters = line.qty * Number(product.unitsPerBox);
              subTotal = totalMeters * line.unitPrice;
            }
            
            return {
              productId: line.productId,
              qty: line.qty,
              unitPrice: line.unitPrice, // This price is in the selected currency
              subTotal: subTotal,
            };
          }),
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
                unitsPerBox: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    // لا نحدث المخزون هنا - سيتم تحديثه عند اعتماد الفاتورة
    // Update stock for each product - MOVED TO APPROVAL PROCESS
    // for (const line of lines) {
    //   await this.updateStock(companyId, line.productId, line.qty);
    // }

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

    }

    return {
      ...purchase,
      total: Number(purchase.total),
      currency: purchase.currency as any,
      exchangeRate: Number(purchase.exchangeRate),
      totalForeign: purchase.totalForeign ? Number(purchase.totalForeign) : null,
      paidAmount: Number(purchase.paidAmount),
      remainingAmount: Number(purchase.remainingAmount),
      createdAt: purchase.createdAt.toISOString(),
      lines: purchase.lines.map(line => {
        const mappedLine: any = {
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        };
        if (line.product) {
          mappedLine.product = {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          };
        }
        return mappedLine;
      }),
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
      endDate,
      supplierName,
      supplierPhone,
      invoiceNumber,
      dateFrom,
      dateTo
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

    // البحث السريع
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // فلتر اسم المورد
    if (supplierName) {
      where.supplier = {
        ...where.supplier,
        name: { contains: supplierName, mode: 'insensitive' }
      };
    }

    // فلتر رقم هاتف المورد
    if (supplierPhone) {
      where.supplier = {
        ...where.supplier,
        phone: { contains: supplierPhone, mode: 'insensitive' }
      };
    }

    // فلتر رقم الفاتورة - بحث دقيق بالأرقام
    if (invoiceNumber) {
      where.invoiceNumber = invoiceNumber;
    }

    // فلتر التاريخ (startDate و endDate للتوافق مع الكود القديم)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // فلتر التاريخ الجديد (dateFrom و dateTo)
    if (dateFrom || dateTo) {
      where.createdAt = where.createdAt || {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // إضافة 23:59:59 لنهاية اليوم
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
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
                  unitsPerBox: true,
                },
              },
            },
          },
          payments: true,
          expenses: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return {
      purchases: purchases.map(purchase => ({
        ...purchase,
        total: Number(purchase.total),
        currency: purchase.currency as any,
        exchangeRate: Number(purchase.exchangeRate),
        totalForeign: purchase.totalForeign ? Number(purchase.totalForeign) : null,
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => {
          const mappedLine: any = {
            ...line,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            subTotal: Number(line.subTotal)
          };
          if (line.product) {
            mappedLine.product = {
              ...line.product,
              unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
            };
          }
          return mappedLine;
        }),
        payments: purchase.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
          createdAt: payment.createdAt.toISOString(),
        })),
        expenses: purchase.expenses?.map(expense => ({
          ...expense,
          amount: Number(expense.amount),
          currency: expense.currency as any,
          exchangeRate: Number(expense.exchangeRate),
          amountForeign: expense.amountForeign ? Number(expense.amountForeign) : null,
          description: (expense as any).notes || null,
          createdAt: expense.createdAt.toISOString(),
        })) || [],
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
                unitsPerBox: true,
              },
            },
          },
        },
        payments: true,
        expenses: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return purchase ? {
      ...purchase,
      total: Number(purchase.total),
      currency: purchase.currency as any,
      exchangeRate: Number(purchase.exchangeRate),
      totalForeign: purchase.totalForeign ? Number(purchase.totalForeign) : null,
      paidAmount: Number(purchase.paidAmount),
      remainingAmount: Number(purchase.remainingAmount),
      createdAt: purchase.createdAt.toISOString(),
      lines: purchase.lines.map(line => {
        const mappedLine: any = {
          ...line,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
          subTotal: Number(line.subTotal)
        };
        if (line.product) {
          mappedLine.product = {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          };
        }
        return mappedLine;
      }),
      payments: purchase.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      })),
      expenses: purchase.expenses?.map(expense => ({
        ...expense,
        amount: Number(expense.amount),
        currency: expense.currency as any,
        exchangeRate: Number(expense.exchangeRate),
        amountForeign: expense.amountForeign ? Number(expense.amountForeign) : null,
        description: (expense as any).notes || null,
        createdAt: expense.createdAt.toISOString(),
      })) || [],
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

    // If lines are being updated, we need to handle stock changes (only for approved purchases)
    if (data.lines) {
      // Revert old stock changes only if purchase was approved
      if (existingPurchase.isApproved) {
        const revertStockUpdates = existingPurchase.lines.map(line =>
          prisma.stock.upsert({
            where: {
              companyId_productId: {
                companyId: existingPurchase.companyId,
                productId: line.productId,
              },
            },
            update: {
              boxes: {
                decrement: line.qty
              },
            },
            create: {
              companyId: existingPurchase.companyId,
              productId: line.productId,
              boxes: -line.qty,
            },
          })
        );

        await prisma.$transaction(revertStockUpdates);
      }

      // جلب معلومات المنتجات لحساب الإجمالي بشكل صحيح
      const productIds = data.lines.map(line => line.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, unit: true, unitsPerBox: true }
      });

      // Calculate new total مع الأخذ في الاعتبار وحدة المنتج
      const total = data.lines.reduce((sum, line) => {
        const product = products.find(p => p.id === line.productId);
        let lineTotal = line.qty * line.unitPrice;
        
        // إذا كانت الوحدة صندوق، يجب ضرب الكمية في unitsPerBox
        if (product && product.unit === 'صندوق' && product.unitsPerBox) {
          const totalMeters = line.qty * Number(product.unitsPerBox);
          lineTotal = totalMeters * line.unitPrice;
        }
        
        return sum + lineTotal;
      }, 0);

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
                  unitsPerBox: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      // Apply new stock changes only if purchase is approved
      if (existingPurchase.isApproved) {
        const applyStockUpdates = data.lines.map(line =>
          prisma.stock.upsert({
            where: {
              companyId_productId: {
                companyId: existingPurchase.companyId,
                productId: line.productId,
              },
            },
            update: {
              boxes: {
                increment: line.qty,
              },
            },
            create: {
              companyId: existingPurchase.companyId,
              productId: line.productId,
              boxes: line.qty,
            },
          })
        );

        await prisma.$transaction(applyStockUpdates);
      }

      return {
        ...purchase,
        total: Number(purchase.total),
        currency: purchase.currency as any,
        exchangeRate: Number(purchase.exchangeRate),
        totalForeign: purchase.totalForeign ? Number(purchase.totalForeign) : null,
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => {
          const mappedLine: any = {
            ...line,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            subTotal: Number(line.subTotal)
          };
          if (line.product) {
            mappedLine.product = {
              ...line.product,
              unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
            };
          }
          return mappedLine;
        }),
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
                  unitsPerBox: true,
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
        currency: purchase.currency as any,
        exchangeRate: Number(purchase.exchangeRate),
        totalForeign: purchase.totalForeign ? Number(purchase.totalForeign) : null,
        paidAmount: Number(purchase.paidAmount),
        remainingAmount: Number(purchase.remainingAmount),
        createdAt: purchase.createdAt.toISOString(),
        lines: purchase.lines.map(line => {
          const mappedLine: any = {
            ...line,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            subTotal: Number(line.subTotal)
          };
          if (line.product) {
            mappedLine.product = {
              ...line.product,
              unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
            };
          }
          return mappedLine;
        }),
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
      include: {
        lines: true,
        payments: true,
        expenses: true,
        paymentReceipts: true
      },
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

    // التحقق من حالة إيصالات الدفع - يجب أن تكون معلقة فقط
    const nonPendingReceipts = purchase.paymentReceipts.filter(receipt => receipt.status !== 'PENDING');
    if (nonPendingReceipts.length > 0) {
      throw new Error('لا يمكن حذف الفاتورة. يوجد إيصالات دفع معتمدة أو مدفوعة مرتبطة بهذه الفاتورة.');
    }

    // استخدام transaction لضمان الحذف الآمن
    await prisma.$transaction(async (tx) => {
      // حذف إيصالات الدفع المعلقة
      if (purchase.paymentReceipts.length > 0) {
        await tx.supplierPaymentReceipt.deleteMany({
          where: { purchaseId: id }
        });
      }

      // حذف المدفوعات
      if (purchase.payments.length > 0) {
        await tx.purchasePayment.deleteMany({
          where: { purchaseId: id }
        });
      }

      // حذف المصروفات
      if (purchase.expenses.length > 0) {
        await tx.purchaseExpense.deleteMany({
          where: { purchaseId: id }
        });
      }

      // حذف بنود الفاتورة
      if (purchase.lines.length > 0) {
        await tx.purchaseLine.deleteMany({
          where: { purchaseId: id }
        });
      }

      // إرجاع المخزون إذا كانت الفاتورة معتمدة (أي أثرت على المخزون)
      if (purchase.isApproved) {
        const stockUpdates = purchase.lines.map(line =>
          tx.stock.upsert({
            where: {
              companyId_productId: {
                companyId: purchase.companyId,
                productId: line.productId,
              },
            },
            update: {
              boxes: {
                decrement: line.qty,
              },
            },
            create: {
              companyId: purchase.companyId,
              productId: line.productId,
              boxes: -line.qty,
            },
          })
        );

        await Promise.all(stockUpdates);
      }

      // تحديث حساب المورد إذا كان موجود
      if (purchase.supplierId && purchase.total.toNumber() > 0) {
        await tx.supplierAccount.updateMany({
          where: {
            supplierId: purchase.supplierId
          },
          data: {
            balance: {
              decrement: purchase.total
            }
          }
        });
      }

      // حذف الفاتورة نفسها
      await tx.purchase.delete({
        where: { id },
      });
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
