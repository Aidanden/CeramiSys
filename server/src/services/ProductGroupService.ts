import { PrismaClient, ProductGroup, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductGroupService {
  /**
   * الحصول على جميع مجموعات الأصناف مع تفاصيل المورد وعدد الأصناف
   */
  async getAllProductGroups(): Promise<any[]> {
    const groups = await prisma.productGroup.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        suppliers: {
          select: {
            id: true,
            isPrimary: true,
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups.map((group) => ({
      ...group,
      productsCount: group._count.products,
      suppliers: group.suppliers.map((s) => ({
        ...s.supplier,
        isPrimary: s.isPrimary,
      })),
      _count: undefined,
    }));
  }

  /**
   * الحصول على مجموعة أصناف محددة بالـ ID
   */
  async getProductGroupById(id: number): Promise<any> {
    const group = await prisma.productGroup.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        suppliers: {
          select: {
            id: true,
            isPrimary: true,
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            cost: true,
            unitsPerBox: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('مجموعة الأصناف غير موجودة');
    }

    return {
      ...group,
      productsCount: group._count.products,
      suppliers: group.suppliers.map((s) => ({
        ...s.supplier,
        isPrimary: s.isPrimary,
      })),
      _count: undefined,
    };
  }

  /**
   * إنشاء مجموعة أصناف جديدة
   */
  async createProductGroup(data: {
    name: string;
    supplierId?: number;
    supplierIds?: number[];
    currency?: string;
    maxDiscountPercentage?: number;
  }): Promise<ProductGroup> {
    // التحقق من عدم وجود مجموعة بنفس الاسم
    const existing = await prisma.productGroup.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('اسم مجموعة الأصناف موجود مسبقاً');
    }

    // التحقق من وجود المورد الرئيسي إذا تم تحديده
    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId },
      });

      if (!supplier) {
        throw new Error('المورد الرئيسي غير موجود');
      }
    }

    // التحقق من وجود الموردين الإضافيين
    if (data.supplierIds && data.supplierIds.length > 0) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: data.supplierIds } },
      });

      if (suppliers.length !== data.supplierIds.length) {
        throw new Error('بعض الموردين غير موجودين');
      }
    }

    // إنشاء المجموعة مع الموردين
    return await prisma.productGroup.create({
      data: {
        name: data.name,
        supplierId: data.supplierId,
        currency: data.currency || 'USD',
        maxDiscountPercentage: data.maxDiscountPercentage
          ? new Prisma.Decimal(data.maxDiscountPercentage)
          : null,
        suppliers: data.supplierIds
          ? {
            create: data.supplierIds.map((supplierId, index) => ({
              supplierId,
              isPrimary: index === 0 && !data.supplierId, // أول مورد يكون رئيسي إذا لم يتم تحديد مورد رئيسي
            })),
          }
          : undefined,
      },
    });
  }

  /**
   * تحديث مجموعة أصناف
   */
  async updateProductGroup(
    id: number,
    data: {
      name?: string;
      supplierId?: number;
      supplierIds?: number[];
      currency?: string;
      maxDiscountPercentage?: number | null;
    }
  ): Promise<ProductGroup> {
    // التحقق من وجود المجموعة
    const existing = await prisma.productGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('مجموعة الأصناف غير موجودة');
    }

    // التحقق من عدم تكرار الاسم
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.productGroup.findUnique({
        where: { name: data.name },
      });

      if (nameExists) {
        throw new Error('اسم مجموعة الأصناف موجود مسبقاً');
      }
    }

    // التحقق من وجود المورد الرئيسي إذا تم تحديده
    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId },
      });

      if (!supplier) {
        throw new Error('المورد الرئيسي غير موجود');
      }
    }

    // التحقق من وجود الموردين الإضافيين
    if (data.supplierIds && data.supplierIds.length > 0) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: data.supplierIds } },
      });

      if (suppliers.length !== data.supplierIds.length) {
        throw new Error('بعض الموردين غير موجودين');
      }
    }

    // تحديث الموردين إذا تم تمرير قائمة جديدة
    if (data.supplierIds !== undefined) {
      // حذف الموردين الحاليين
      await prisma.productGroupSupplier.deleteMany({
        where: { productGroupId: id },
      });

      // إضافة الموردين الجدد
      if (data.supplierIds.length > 0) {
        await prisma.productGroupSupplier.createMany({
          data: data.supplierIds.map((supplierId, index) => ({
            productGroupId: id,
            supplierId,
            isPrimary: index === 0 && !data.supplierId,
          })),
        });
      }
    }

    return await prisma.productGroup.update({
      where: { id },
      data: {
        name: data.name,
        supplierId: data.supplierId,
        currency: data.currency,
        maxDiscountPercentage:
          data.maxDiscountPercentage !== undefined
            ? data.maxDiscountPercentage !== null
              ? new Prisma.Decimal(data.maxDiscountPercentage)
              : null
            : undefined,
      },
    });
  }

  /**
   * حذف مجموعة أصناف
   */
  async deleteProductGroup(id: number): Promise<void> {
    // التحقق من وجود المجموعة
    const group = await prisma.productGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('مجموعة الأصناف غير موجودة');
    }

    // منع الحذف إذا كانت المجموعة تحتوي على أصناف
    if (group._count.products > 0) {
      throw new Error(
        `لا يمكن حذف مجموعة الأصناف لأنها تحتوي على ${group._count.products} صنف. يرجى حذف أو نقل الأصناف أولاً.`
      );
    }

    await prisma.productGroup.delete({
      where: { id },
    });
  }

  /**
   * الحصول على الأصناف التابعة لمجموعة معينة
   */
  async getProductsByGroup(groupId: number): Promise<any[]> {
    const group = await prisma.productGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new Error('مجموعة الأصناف غير موجودة');
    }

    return await prisma.product.findMany({
      where: { groupId },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        cost: true,
        unitsPerBox: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * البحث في مجموعات الأصناف
   */
  async searchProductGroups(query: string): Promise<any[]> {
    const groups = await prisma.productGroup.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          {
            supplier: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
        ],
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return groups.map((group) => ({
      ...group,
      productsCount: group._count.products,
      _count: undefined,
    }));
  }

  /**
   * الحصول على تقرير المشتريات لمجموعة أصناف
   */
  async getGroupPurchaseReport(groupId: number): Promise<any> {
    const group = await prisma.productGroup.findUnique({
      where: { id: groupId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        products: {
          include: {
            purchaseLineItems: {
              select: {
                id: true,
                qty: true,
                unitPrice: true,
                purchase: {
                  select: {
                    id: true,
                    invoiceNumber: true,
                    createdAt: true,
                    approvedAt: true,
                    currency: true,
                    status: true,
                  },
                },
              },
              where: {
                purchase: {
                  status: 'APPROVED',
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new Error('مجموعة الأصناف غير موجودة');
    }

    // حساب إجمالي المشتريات
    let totalPurchases = 0;
    const productsPurchaseData: any[] = [];

    for (const product of group.products) {
      let productTotal = 0;
      let totalQuantity = 0;

      for (const line of product.purchaseLineItems) {
        const lineTotal = Number(line.qty) * Number(line.unitPrice);
        productTotal += lineTotal;
        totalQuantity += Number(line.qty);
      }

      if (totalQuantity > 0) {
        productsPurchaseData.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          totalQuantity,
          totalAmount: productTotal,
          purchasesCount: product.purchaseLineItems.length,
        });

        totalPurchases += productTotal;
      }
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        currency: group.currency,
      },
      supplier: group.supplier,
      totalPurchases,
      productsCount: group.products.length,
      productsPurchaseData,
    };
  }
}
