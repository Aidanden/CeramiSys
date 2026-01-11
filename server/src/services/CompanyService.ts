import { PrismaClient, Company } from '@prisma/client';
import { CreateCompanyRequest, UpdateCompanyRequest, GetCompaniesQuery } from '../dto/CompanyDto';

export class CompanyService {
  constructor(private prisma: PrismaClient) { }

  // إنشاء شركة جديدة
  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    // التحقق من عدم تكرار الكود
    const existingCompany = await this.prisma.company.findUnique({
      where: { code: data.code }
    });

    if (existingCompany) {
      throw new Error('كود الشركة موجود مسبقاً');
    }

    // إذا كانت شركة تابعة، التحقق من وجود الشركة الأم
    if (!data.isParent && data.parentId) {
      const parentCompany = await this.prisma.company.findFirst({
        where: {
          id: data.parentId,
          isParent: true
        }
      });

      if (!parentCompany) {
        throw new Error('الشركة الأم غير موجودة أو غير صحيحة');
      }
    }

    // إذا كانت شركة أم، لا يجب أن يكون لها parent
    if (data.isParent && data.parentId) {
      throw new Error('الشركة الأم لا يمكن أن تكون تابعة لشركة أخرى');
    }

    try {
      const result = await this.prisma.company.create({
        data: {
          name: data.name,
          code: data.code,
          isParent: data.isParent,
          parentId: data.isParent ? null : data.parentId,
        },
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
            }
          }
        }
      });

      // إذا كانت شركة فرعية، أنشئ عميل وهمي يمثلها
      if (!data.isParent && result.id) {
        try {
          await this.prisma.customer.create({
            data: {
              name: result.name,
              phone: `BRANCH-${result.id}`,
              notes: `عميل وهمي يمثل الشركة الفرعية: ${result.name}`
            }
          });
        } catch (customerError) {
          console.error('⚠️ Failed to create dummy customer (non-critical):', customerError);
          // لا نرمي خطأ هنا لأن الشركة تم إنشاؤها بنجاح
        }
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error creating company:', error);

      // معالجة خاصة لخطأ Unique constraint على ID
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        throw new Error('خطأ في تسلسل معرف الشركة. يرجى الاتصال بالدعم الفني.');
      }

      // معالجة خطأ تكرار الكود
      if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
        throw new Error('كود الشركة موجود مسبقاً');
      }

      throw error;
    }
  }

  // الحصول على جميع الشركات مع التصفية والبحث
  async getCompanies(query: GetCompaniesQuery) {
    const { page, limit, search, isParent, parentId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isParent !== undefined) {
      where.isParent = isParent === 'true';
    }

    if (parentId) {
      where.parentId = parentId;
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              code: true,
              isParent: true,
            }
          },
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
            }
          }
        },
        orderBy: [
          { isParent: 'desc' },
          { name: 'asc' }
        ]
      }),
      this.prisma.company.count({ where })
    ]);

    return {
      companies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // الحصول على شركة بواسطة المعرف
  async getCompanyById(id: number): Promise<Company | null> {
    return await this.prisma.company.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            isParent: true,
          }
        },
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
          }
        }
      }
    });
  }

  // تحديث الشركة
  async updateCompany(id: number, data: UpdateCompanyRequest): Promise<Company> {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      throw new Error('الشركة غير موجودة');
    }

    // التحقق من عدم تكرار الكود (إذا تم تغييره)
    if (data.code && data.code !== existingCompany.code) {
      const codeExists = await this.prisma.company.findUnique({
        where: { code: data.code }
      });

      if (codeExists) {
        throw new Error('كود الشركة موجود مسبقاً');
      }
    }

    // التحقق من صحة parentId (إذا تم تغييره)
    if (data.parentId !== undefined) {
      if (data.parentId && !data.isParent) {
        const parentCompany = await this.prisma.company.findFirst({
          where: {
            id: data.parentId,
            isParent: true
          }
        });

        if (!parentCompany) {
          throw new Error('الشركة الأم غير موجودة أو غير صحيحة');
        }

        // منع الشركة من أن تكون parent لنفسها
        if (data.parentId === id) {
          throw new Error('لا يمكن للشركة أن تكون تابعة لنفسها');
        }
      }

      // إذا كانت شركة أم، لا يجب أن يكون لها parent
      if (data.isParent && data.parentId) {
        data.parentId = null;
      }
    }

    return await this.prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.isParent !== undefined && { isParent: data.isParent }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
          }
        }
      }
    });
  }

  // حذف الشركة
  async deleteCompany(id: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        children: true,
        users: true,
        products: true,
        sales: true,
      }
    });

    if (!company) {
      throw new Error('الشركة غير موجودة');
    }

    // منع حذف الشركة إذا كان لديها شركات تابعة
    if (company.children.length > 0) {
      throw new Error('لا يمكن حذف الشركة لأن لديها شركات تابعة');
    }

    // منع حذف الشركة إذا كان لديها مستخدمين
    if (company.users.length > 0) {
      throw new Error('لا يمكن حذف الشركة لأن لديها مستخدمين');
    }

    // منع حذف الشركة إذا كان لديها منتجات
    if (company.products.length > 0) {
      throw new Error('لا يمكن حذف الشركة لأن لديها منتجات');
    }

    // منع حذف الشركة إذا كان لديها مبيعات
    if (company.sales.length > 0) {
      throw new Error('لا يمكن حذف الشركة لأن لديها مبيعات');
    }

    await this.prisma.company.delete({
      where: { id }
    });
  }

  // الحصول على الهيكل الهرمي للشركات
  async getCompanyHierarchy() {
    const parentCompanies = await this.prisma.company.findMany({
      where: { isParent: true },
      include: {
        children: {
          include: {
            _count: {
              select: {
                users: true,
                products: true,
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            products: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return parentCompanies.map(parent => ({
      id: parent.id,
      name: parent.name,
      code: parent.code,
      isParent: parent.isParent,
      userCount: parent._count.users,
      productCount: parent._count.products,
      children: parent.children.map(child => ({
        id: child.id,
        name: child.name,
        code: child.code,
        isParent: child.isParent,
        userCount: child._count.users,
        productCount: child._count.products,
      }))
    }));
  }

  // إحصائيات الشركات
  async getCompanyStats() {
    try {
      const totalCompanies = await this.prisma.company.count();
      const parentCompanies = await this.prisma.company.count({ where: { isParent: true } });
      const branchCompanies = await this.prisma.company.count({ where: { isParent: false } });

      let finalActiveUsers = 0;
      try {
        finalActiveUsers = await this.prisma.users.count({ where: { IsActive: true } });
      } catch (userError) {
        console.error('❌ Error querying users:', userError);
      }

      let finalTotalProducts = 0;
      try {
        finalTotalProducts = await this.prisma.product.count();
      } catch (productError) {
        console.error('❌ Error querying products:', productError);
      }

      let finalTotalSales = 0;
      try {
        finalTotalSales = await this.prisma.sale.count();
      } catch (saleError) {
        console.error('❌ Error querying sales:', saleError);
      }

      return {
        totalCompanies,
        parentCompanies,
        branchCompanies,
        activeUsers: finalActiveUsers,
        totalProducts: finalTotalProducts,
        totalSales: finalTotalSales,
      };
    } catch (error) {
      console.error('❌ CompanyService.getCompanyStats - Error calculating stats:', error);
      throw error;
    }
  }

  // الحصول على الشركات التابعة للشركة الأم
  async getBranchCompanies(parentId: number) {
    return await this.prisma.company.findMany({
      where: {
        parentId,
        isParent: false
      },
      include: {
        _count: {
          select: {
            users: true,
            sales: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }
}
