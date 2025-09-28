/**
 * Product Service
 * خدمة إدارة الأصناف
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  GetProductsQueryDto,
  UpdateStockDto,
  UpdatePriceDto,
  ProductResponseDto,
  ProductsResponseDto,
  ProductStatsResponseDto
} from '../dto/productDto';

export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * الحصول على جميع الأصناف مع التصفية والبحث
   */
  async getProducts(query: GetProductsQueryDto, userCompanyId: number): Promise<ProductsResponseDto> {
    try {
      const { page = 1, limit = 10, search, companyId, unit } = query;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const whereConditions: Prisma.ProductWhereInput = {
        // كل شركة ترى فقط الأصناف الخاصة بها
        createdByCompanyId: userCompanyId,
      };

      // إضافة شرط البحث
      if (search) {
        whereConditions.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      // إضافة شرط الوحدة
      if (unit) {
        whereConditions.unit = unit;
      }

      // الحصول على العدد الإجمالي
      const total = await this.prisma.product.count({ where: whereConditions });

      // الحصول على الأصناف
      const products = await this.prisma.product.findMany({
        where: whereConditions,
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          },
          stocks: {
            where: { companyId: userCompanyId },
            select: { boxes: true, updatedAt: true }
          },
          prices: {
            where: { companyId: userCompanyId },
            select: { sellPrice: true, updatedAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // تحويل البيانات للتنسيق المطلوب
      const formattedProducts: ProductResponseDto[] = products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit ?? undefined,
        unitsPerBox: product.unitsPerBox ? Number(product.unitsPerBox) : undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stock: product.stocks[0] ? {
          boxes: Number(product.stocks[0].boxes),
          updatedAt: product.stocks[0].updatedAt
        } : undefined,
        price: product.prices[0] ? {
          sellPrice: Number(product.prices[0].sellPrice),
          updatedAt: product.prices[0].updatedAt
        } : undefined,
      }));

      const pages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'تم جلب الأصناف بنجاح',
        data: {
          products: formattedProducts,
          pagination: { page, limit, total, pages }
        }
      };
    } catch (error) {
      console.error('خطأ في جلب الأصناف:', error);
      throw new Error('فشل في جلب الأصناف');
    }
  }

  /**
   * الحصول على صنف واحد بالمعرف
   */
  async getProductById(id: number, userCompanyId: number): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { 
          id,
          createdByCompanyId: userCompanyId // التأكد من أن الصنف ينتمي لنفس الشركة
        },
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          },
          stocks: {
            where: { companyId: userCompanyId },
            select: { boxes: true, updatedAt: true }
          },
          prices: {
            where: { companyId: userCompanyId },
            select: { sellPrice: true, updatedAt: true }
          }
        },
      });

      if (!product) {
        throw new Error('الصنف غير موجود أو ليس لديك صلاحية للوصول إليه');
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit ?? undefined,
        unitsPerBox: product.unitsPerBox ? Number(product.unitsPerBox) : undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stock: product.stocks[0] ? {
          boxes: Number(product.stocks[0].boxes),
          updatedAt: product.stocks[0].updatedAt
        } : undefined,
        price: product.prices[0] ? {
          sellPrice: Number(product.prices[0].sellPrice),
          updatedAt: product.prices[0].updatedAt
        } : undefined,
      };
    } catch (error) {
      console.error('خطأ في جلب الصنف:', error);
      throw error;
    }
  }

  /**
   * إنشاء صنف جديد
   */
  async createProduct(data: CreateProductDto): Promise<ProductResponseDto> {
    try {
      // التحقق من عدم وجود SKU مكرر
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku: data.sku }
      });

      if (existingProduct) {
        throw new Error(`رمز الصنف "${data.sku}" موجود مسبقاً`);
      }

      // التحقق من وجود الشركة
      const company = await this.prisma.company.findUnique({
        where: { id: data.createdByCompanyId }
      });

      if (!company) {
        throw new Error('الشركة غير موجودة');
      }

      // إنشاء الصنف
      const product = await this.prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          unit: data.unit,
          createdByCompanyId: data.createdByCompanyId,
        },
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      // إنشاء السعر الأولي إذا تم تحديده
      if (data.sellPrice !== undefined) {
        await this.prisma.companyProductPrice.create({
          data: {
            companyId: data.createdByCompanyId,
            productId: product.id,
            sellPrice: data.sellPrice,
          }
        });
      }

      // إنشاء مخزون أولي إذا تم تحديده
      if (data.initialBoxes !== undefined) {
        console.log('Creating stock with data:', {
          companyId: data.createdByCompanyId,
          productId: product.id,
          boxes: data.initialBoxes,
        });
        await this.prisma.stock.create({
          data: {
            companyId: data.createdByCompanyId,
            productId: product.id,
            boxes: data.initialBoxes,
          }
        });
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit ?? undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    } catch (error) {
      console.error('خطأ في إنشاء الصنف:', error);
      throw error;
    }
  }

  /**
   * تحديث صنف
   */
  async updateProduct(id: number, data: UpdateProductDto, userCompanyId: number): Promise<ProductResponseDto> {
    try {
      // التحقق من وجود الصنف
      const existingProduct = await this.prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error('الصنف غير موجود');
      }

      // التحقق من الصلاحية (فقط الشركة المنشئة يمكنها التعديل)
      if (existingProduct.createdByCompanyId !== userCompanyId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا الصنف');
      }

      // التحقق من عدم وجود SKU مكرر (إذا تم تغييره)
      if (data.sku && data.sku !== existingProduct.sku) {
        const duplicateSku = await this.prisma.product.findUnique({
          where: { sku: data.sku }
        });

        if (duplicateSku) {
          throw new Error(`رمز الصنف "${data.sku}" موجود مسبقاً`);
        }
      }

      // تحديث الصنف
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(data.sku && { sku: data.sku }),
          ...(data.name && { name: data.name }),
          ...(data.unit !== undefined && { unit: data.unit }),
        },
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          },
          stocks: {
            where: { companyId: userCompanyId },
            select: { boxes: true, updatedAt: true }
          },
          prices: {
            where: { companyId: userCompanyId },
            select: { sellPrice: true, updatedAt: true }
          }
        }
      });

      // تحديث السعر إذا تم تحديده
      if (data.sellPrice !== undefined) {
        await this.prisma.companyProductPrice.upsert({
          where: {
            companyId_productId: {
              companyId: userCompanyId,
              productId: id,
            }
          },
          update: { sellPrice: data.sellPrice },
          create: {
            companyId: userCompanyId,
            productId: id,
            sellPrice: data.sellPrice,
          }
        });
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit ?? undefined,
        unitsPerBox: product.unitsPerBox ? Number(product.unitsPerBox) : undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stock: product.stocks[0] ? {
          boxes: Number(product.stocks[0].boxes),
          updatedAt: product.stocks[0].updatedAt
        } : undefined,
        price: product.prices[0] ? {
          sellPrice: Number(product.prices[0].sellPrice),
          updatedAt: product.prices[0].updatedAt
        } : undefined,
      };
    } catch (error) {
      console.error('خطأ في تحديث الصنف:', error);
      throw error;
    }
  }

  /**
   * حذف صنف
   */
  async deleteProduct(id: number, userCompanyId: number): Promise<void> {
    try {
      // التحقق من وجود الصنف
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
        include: {
          saleLines: true,
          purchaseLines: true,
        }
      });

      if (!existingProduct) {
        throw new Error('الصنف غير موجود');
      }

      // التحقق من الصلاحية
      if (existingProduct.createdByCompanyId !== userCompanyId) {
        throw new Error('ليس لديك صلاحية لحذف هذا الصنف');
      }

      // التحقق من وجود معاملات مرتبطة
      if (existingProduct.saleLines.length > 0 || existingProduct.purchaseLines.length > 0) {
        throw new Error('لا يمكن حذف الصنف لوجود معاملات مرتبطة به');
      }

      // حذف البيانات المرتبطة أولاً
      await this.prisma.stock.deleteMany({
        where: { productId: id }
      });

      await this.prisma.companyProductPrice.deleteMany({
        where: { productId: id }
      });

      // حذف الصنف
      await this.prisma.product.delete({
        where: { id }
      });
    } catch (error) {
      console.error('خطأ في حذف الصنف:', error);
      throw error;
    }
  }

  /**
   * تحديث المخزون
   */
  async updateStock(data: UpdateStockDto): Promise<void> {
    try {
      await this.prisma.stock.upsert({
        where: {
          companyId_productId: {
            companyId: data.companyId,
            productId: data.productId,
          }
        },
        update: { boxes: data.quantity },
        create: {
          companyId: data.companyId,
          productId: data.productId,
          boxes: data.quantity,
        }
      });
    } catch (error) {
      console.error('خطأ في تحديث المخزون:', error);
      throw new Error('فشل في تحديث المخزون');
    }
  }

  /**
   * تحديث السعر
   */
  async updatePrice(data: UpdatePriceDto): Promise<void> {
    try {
      await this.prisma.companyProductPrice.upsert({
        where: {
          companyId_productId: {
            companyId: data.companyId,
            productId: data.productId,
          }
        },
        update: { sellPrice: data.sellPrice },
        create: {
          companyId: data.companyId,
          productId: data.productId,
          sellPrice: data.sellPrice,
        }
      });
    } catch (error) {
      console.error('خطأ في تحديث السعر:', error);
      throw new Error('فشل في تحديث السعر');
    }
  }

  /**
   * الحصول على إحصائيات الأصناف
   */
  async getProductStats(userCompanyId: number): Promise<ProductStatsResponseDto> {
    try {
      // إحصائيات الأصناف
      const totalProducts = await this.prisma.product.count({
        where: { createdByCompanyId: userCompanyId }
      });

      const productsWithStock = await this.prisma.stock.count({
        where: {
          companyId: userCompanyId,
          boxes: { gt: 0 }
        }
      });

      const productsWithoutStock = totalProducts - productsWithStock;

      // قيمة المخزون الإجمالية - استخدام Prisma ORM بدلاً من raw query
      const stockWithPrices = await this.prisma.stock.findMany({
        where: { companyId: userCompanyId },
        include: {
          product: {
            include: {
              prices: {
                where: { companyId: userCompanyId }
              }
            }
          }
        }
      });

      const totalStockValue = stockWithPrices.reduce((total, stock) => {
        const price = stock.product.prices[0]?.sellPrice || 0;
        const unitsPerBox = stock.product.unitsPerBox || 1;
        const totalUnits = Number(stock.boxes) * Number(unitsPerBox);
        return total + (totalUnits * Number(price));
      }, 0);

      // متوسط سعر الأصناف
      const avgPrice = await this.prisma.companyProductPrice.aggregate({
        where: { companyId: userCompanyId },
        _avg: { sellPrice: true }
      });

      const averageProductPrice = parseFloat(avgPrice._avg.sellPrice?.toString() || '0');

      return {
        success: true,
        message: 'تم جلب الإحصائيات بنجاح',
        data: {
          totalProducts,
          productsWithStock,
          productsWithoutStock,
          totalStockValue,
          averageProductPrice,
        }
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الأصناف:', error);
      throw new Error('فشل في جلب الإحصائيات');
    }
  }
}
