/**
 * Product Service
 * خدمة إدارة الأصناف
 */

import { PrismaClient, Prisma } from '@prisma/client';
import QRCode from 'qrcode';
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
  async getProducts(query: GetProductsQueryDto, userCompanyId: number, isSystemUser?: boolean): Promise<ProductsResponseDto> {
    try {
      const { page = 1, limit = 10, search, companyId, unit } = query;
      const skip = (page - 1) * limit;

      // بناء شروط البحث
      const whereConditions: Prisma.ProductWhereInput = {};

      // فلترة حسب الشركة
      if (isSystemUser) {
        // مستخدم النظام: يمكنه فلترة بأي شركة أو رؤية الكل
        if (companyId) {
          whereConditions.createdByCompanyId = companyId;
        }
      } else {
        // مستخدم عادي: يرى فقط أصناف شركته (تجاهل companyId من الفلتر)
        whereConditions.createdByCompanyId = userCompanyId;
      }

      // إضافة شرط البحث
      if (search) {
        whereConditions.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      // إضافة شرط الوحدة
      if (unit && unit !== 'الكل') {
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
            where: {
              ...(isSystemUser !== true && { companyId: userCompanyId })
            },
            select: { boxes: true, updatedAt: true }
          },
          prices: {
            where: {
              ...(isSystemUser !== true && { companyId: userCompanyId })
            },
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
        qrCode: product.qrCode ?? undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stock: product.stocks[0] ? {
          boxes: Number(product.stocks[0].boxes),
          updatedAt: product.stocks[0].updatedAt
        } : {
          boxes: 0,
          updatedAt: new Date()
        },
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
  async getProductById(id: number, userCompanyId: number, isSystemUser?: boolean): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { 
          id,
          // مستخدمو النظام يمكنهم الوصول لجميع الأصناف، المستخدمون العاديون للشركة فقط
          ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
        },
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          },
          stocks: {
            where: {
              ...(isSystemUser !== true && { companyId: userCompanyId })
            },
            select: { boxes: true, updatedAt: true }
          },
          prices: {
            where: {
              ...(isSystemUser !== true && { companyId: userCompanyId })
            },
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
        qrCode: product.qrCode ?? undefined,
        createdByCompanyId: product.createdByCompanyId,
        createdByCompany: product.createdByCompany,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stock: product.stocks[0] ? {
          boxes: Number(product.stocks[0].boxes),
          updatedAt: product.stocks[0].updatedAt
        } : {
          boxes: 0,
          updatedAt: new Date()
        },
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

      // إنشاء الصنف أولاً بدون QR Code
      const product = await this.prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          unit: data.unit,
          unitsPerBox: data.unitsPerBox,
          createdByCompanyId: data.createdByCompanyId,
        },
        include: {
          createdByCompany: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      // توليد QR Code للصنف
      try {
        const productData = JSON.stringify({
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitsPerBox: product.unitsPerBox ? Number(product.unitsPerBox) : undefined
        });

        const qrCodeDataUrl = await QRCode.toDataURL(productData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // تحديث الصنف بـ QR Code
        await this.prisma.product.update({
          where: { id: product.id },
          data: { qrCode: qrCodeDataUrl }
        });

        // إضافة QR Code للـ product object
        (product as any).qrCode = qrCodeDataUrl;
      } catch (qrError) {
        console.error('خطأ في توليد QR Code:', qrError);
        // نستمر حتى لو فشل توليد QR Code
      }

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

      // إنشاء مخزون أولي (افتراضياً 0 إذا لم يتم تحديد قيمة)
      const initialBoxes = data.initialBoxes !== undefined ? data.initialBoxes : 0;
      
      // Enhanced debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('ProductService - Create Stock Debug:', { 
          receivedInitialBoxes: data.initialBoxes, 
          typeOfReceived: typeof data.initialBoxes, 
          finalInitialBoxes: initialBoxes,
          typeOfFinal: typeof initialBoxes,
          willCreateStockWith: {
            companyId: data.createdByCompanyId,
            productId: 'will be set after product creation',
            boxes: initialBoxes
          }
        });
      }
      await this.prisma.stock.create({
        data: {
          companyId: data.createdByCompanyId,
          productId: product.id,
          boxes: initialBoxes,
        }
      });

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
      };
    } catch (error) {
      console.error('خطأ في إنشاء الصنف:', error);
      throw error;
    }
  }

  /**
   * تحديث صنف
   */
  async updateProduct(id: number, data: UpdateProductDto, userCompanyId: number, isSystemUser?: boolean): Promise<ProductResponseDto> {
    try {
      // التحقق من وجود الصنف
      const existingProduct = await this.prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error('الصنف غير موجود');
      }

      // التحقق من الصلاحية (فقط الشركة المنشئة أو مستخدمو النظام يمكنهم التعديل)
      if (!isSystemUser && existingProduct.createdByCompanyId !== userCompanyId) {
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
        // البحث عن السعر الموجود - أولاً في شركة المستخدم، ثم في الشركة المالكة للصنف
        let existingPrice = await this.prisma.companyProductPrice.findFirst({
          where: {
            companyId: userCompanyId,
            productId: id,
          }
        });

        // إذا لم يوجد في شركة المستخدم، ابحث في الشركة المالكة للصنف
        if (!existingPrice) {
          existingPrice = await this.prisma.companyProductPrice.findFirst({
            where: {
              companyId: existingProduct.createdByCompanyId,
              productId: id,
            }
          });
        }

        if (existingPrice) {
          // تحديث السعر الموجود فقط
          await this.prisma.companyProductPrice.update({
            where: { id: existingPrice.id },
            data: { sellPrice: data.sellPrice }
          });
        } else {
          // إنشاء سعر جديد فقط إذا لم يوجد أي سعر
          await this.prisma.companyProductPrice.create({
            data: {
              companyId: userCompanyId,
              productId: id,
              sellPrice: data.sellPrice,
            }
          });
        }
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
  async deleteProduct(id: number, userCompanyId: number, isSystemUser?: boolean): Promise<void> {
    try {
      // التحقق من وجود الصنف
      const whereConditions = isSystemUser !== true ? { id, createdByCompanyId: userCompanyId } : { id };

      const existingProduct = await this.prisma.product.findUnique({
        where: whereConditions,
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
    // التحقق من وجود الصنف
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: {
        saleLines: { select: { id: true }, take: 1 },
        purchaseLines: { select: { id: true }, take: 1 },
      }
    });

    if (!product) {
      throw new Error('الصنف غير موجود');
    }

    // التحقق من استخدام الصنف في فواتير
    if (product.saleLines.length > 0 || product.purchaseLines.length > 0) {
      throw new Error('لا يمكن تعديل مخزون صنف مستخدم في فواتير مبيعات أو مشتريات');
    }

    // البحث عن المخزون - أولاً في شركة المستخدم، ثم في الشركة المالكة للصنف
    let existingStock = await this.prisma.stock.findFirst({
      where: {
        companyId: data.companyId,
        productId: data.productId,
      }
    });

    // إذا لم يوجد في شركة المستخدم، ابحث في الشركة المالكة للصنف
    if (!existingStock) {
      existingStock = await this.prisma.stock.findFirst({
        where: {
          companyId: product.createdByCompanyId,
          productId: data.productId,
        }
      });
    }

    if (!existingStock) {
      throw new Error('لا يوجد مخزون لهذا الصنف');
    }

    // تحديث السطر الموجود فقط - لا إنشاء أبداً
    await this.prisma.stock.update({
      where: { id: existingStock.id },
      data: { boxes: data.quantity }
    });
  }

  /**
   * تحديث السعر
   */
  async updatePrice(data: UpdatePriceDto): Promise<void> {
    // التحقق من وجود الصنف
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      throw new Error('الصنف غير موجود');
    }

    // البحث عن السعر الموجود - أولاً في شركة المستخدم، ثم في الشركة المالكة للصنف
    let existingPrice = await this.prisma.companyProductPrice.findFirst({
      where: {
        companyId: data.companyId,
        productId: data.productId,
      }
    });

    // إذا لم يوجد في شركة المستخدم، ابحث في الشركة المالكة للصنف
    if (!existingPrice) {
      existingPrice = await this.prisma.companyProductPrice.findFirst({
        where: {
          companyId: product.createdByCompanyId,
          productId: data.productId,
        }
      });
    }

    if (!existingPrice) {
      throw new Error('لا يوجد سعر لهذا الصنف');
    }

    // تحديث السعر الموجود فقط - لا إنشاء أبداً
    await this.prisma.companyProductPrice.update({
      where: { id: existingPrice.id },
      data: { sellPrice: data.sellPrice }
    });
  }

  /**
   * الحصول على إحصائيات الأصناف
   */
  async getProductStats(userCompanyId: number, isSystemUser?: boolean): Promise<ProductStatsResponseDto> {
    try {
      // شروط البحث حسب نوع المستخدم
      const whereConditions = isSystemUser !== true ? { createdByCompanyId: userCompanyId } : {};

      // إحصائيات الأصناف
      const totalProducts = await this.prisma.product.count({
        where: whereConditions
      });

      // حساب عدد المنتجات الفريدة التي لها مخزون (boxes > 0)
      const stocksWithPositiveBoxes = await this.prisma.stock.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId }),
          boxes: { gt: 0 }
        },
        select: {
          productId: true
        },
        distinct: ['productId']
      });

      const productsWithStock = stocksWithPositiveBoxes.length;

      // حساب عدد المنتجات الفريدة بدون مخزون (boxes = 0 أو لا يوجد سجل مخزون)
      const stocksWithZeroBoxes = await this.prisma.stock.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId }),
          boxes: { lte: 0 }
        },
        select: {
          productId: true
        },
        distinct: ['productId']
      });

      // المنتجات التي ليس لها سجل مخزون أصلاً
      const productsWithStockRecords = await this.prisma.stock.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        select: {
          productId: true
        },
        distinct: ['productId']
      });

      const productIdsWithStock = new Set(productsWithStockRecords.map(s => s.productId));
      
      // المنتجات بدون مخزون = المنتجات التي لها boxes = 0 + المنتجات بدون سجل مخزون
      const productsWithoutStock = stocksWithZeroBoxes.length + (totalProducts - productIdsWithStock.size);

      // قيمة المخزون الإجمالية - استخدام Prisma ORM بدلاً من raw query
      const stockWithPrices = await this.prisma.stock.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          product: {
            include: {
              prices: {
                where: {
                  ...(isSystemUser !== true && { companyId: userCompanyId })
                }
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
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
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

  /**
   * الحصول على الأصناف الأكثر مبيعاً
   */
  async getTopSellingProducts(userCompanyId: number, isSystemUser?: boolean, limit: number = 10, companyId?: number): Promise<any> {
    try {
      const whereConditions: any = {};
      
      // تحديد الشركة للبحث
      if (companyId) {
        whereConditions.companyId = companyId;
      } else if (isSystemUser !== true) {
        whereConditions.companyId = userCompanyId;
      }

      // جلب الأصناف الأكثر مبيعاً
      const topProducts = await this.prisma.saleLine.groupBy({
        by: ['productId'],
        where: {
          sale: whereConditions
        },
        _sum: {
          qty: true,
          subTotal: true
        },
        _count: {
          productId: true
        },
        orderBy: {
          _sum: {
            qty: 'desc'
          }
        },
        take: limit
      });

      // جلب تفاصيل الأصناف
      const productIds = topProducts.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds }
        },
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true
        }
      });

      // دمج البيانات
      const result = topProducts.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'غير محدد',
          sku: product?.sku || 'غير محدد',
          totalQuantitySold: Number(item._sum.qty || 0),
          totalRevenue: Number(item._sum.subTotal || 0),
          unit: product?.unit || 'وحدة'
        };
      });

      return {
        success: true,
        message: 'تم جلب الأصناف الأكثر مبيعاً بنجاح',
        data: result
      };
    } catch (error) {
      console.error('خطأ في جلب الأصناف الأكثر مبيعاً:', error);
      throw error;
    }
  }

  /**
   * الحصول على أصناف الشركة الأم مع أسعارها
   */
  async getParentCompanyProducts(userCompanyId: number, parentCompanyId: number, isSystemUser?: boolean): Promise<any> {
    try {
      // التحقق من الصلاحيات
      if (!isSystemUser && userCompanyId !== parentCompanyId) {
        // التحقق من أن الشركة الحالية تابعة للشركة الأم
        const userCompany = await this.prisma.company.findUnique({
          where: { id: userCompanyId },
          include: { parent: true }
        });

        if (!userCompany || userCompany.parentId !== parentCompanyId) {
          throw new Error('غير مصرح لك بالوصول إلى أصناف هذه الشركة');
        }
      }

      // جلب الأصناف مع أسعارها من الشركة الأم
      const products = await this.prisma.product.findMany({
        where: {
          createdByCompanyId: parentCompanyId
        },
        include: {
          stocks: {
            where: { companyId: parentCompanyId },
            select: { boxes: true }
          },
          prices: {
            where: { companyId: parentCompanyId },
            select: { sellPrice: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      const result = products.map(product => {
        const stock = product.stocks[0];
        const price = product.prices[0];
        
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitsPerBox: product.unitsPerBox,
          currentStock: stock ? Number(stock.boxes) : 0,
          unitPrice: price ? Number(price.sellPrice) : 0
        };
      });

      return {
        success: true,
        message: 'تم جلب أصناف الشركة الأم بنجاح',
        data: result
      };

    } catch (error) {
      console.error('خطأ في جلب أصناف الشركة الأم:', error);
      throw error;
    }
  }

  /**
   * الحصول على الأصناف التي ستنتهي قريباً
   */
  async getLowStockProducts(userCompanyId: number, isSystemUser?: boolean, limit: number = 10, companyId?: number): Promise<any> {
    try {
      const whereConditions: any = {};
      
      // تحديد الشركة للبحث
      if (companyId) {
        whereConditions.companyId = companyId;
      } else if (isSystemUser !== true) {
        whereConditions.companyId = userCompanyId;
      }

      // جلب الأصناف ذات المخزون المنخفض
      const lowStockProducts = await this.prisma.stock.findMany({
        where: {
          ...whereConditions,
          OR: [
            { boxes: { lte: 0 } }, // نفد المخزون
            { boxes: { lte: 20 } }  // مخزون منخفض (أقل من 20 صندوق أو قطعة)
          ]
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              unitsPerBox: true
            }
          }
        },
        orderBy: {
          boxes: 'asc'
        },
        take: limit
      });

      // تحويل البيانات
      const result = lowStockProducts.map(stock => {
        const currentStock = Number(stock.boxes);
        const unitsPerBox = Number(stock.product.unitsPerBox || 1);
        const totalUnits = currentStock * unitsPerBox;
        
        let stockStatus: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' = 'LOW';
        
        if (currentStock === 0) {
          stockStatus = 'OUT_OF_STOCK';
        } else if (currentStock <= 5) {
          stockStatus = 'CRITICAL';
        } else if (currentStock <= 20) {
          stockStatus = 'LOW';
        }

        return {
          productId: stock.product.id,
          productName: stock.product.name,
          sku: stock.product.sku,
          currentStock: currentStock,
          totalUnits: totalUnits,
          unit: stock.product.unit || 'صندوق',
          unitsPerBox: unitsPerBox,
          stockStatus
        };
      });

      return {
        success: true,
        message: 'تم جلب الأصناف التي ستنتهي قريباً بنجاح',
        data: result
      };
    } catch (error) {
      console.error('خطأ في جلب الأصناف التي ستنتهي قريباً:', error);
      throw error;
    }
  }
}
