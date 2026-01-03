import prisma from '../models/prismaClient';
import {
  CreateDamageReportDto,
  GetDamageReportsQueryDto,
  DamageReportResponseDto,
  DamageReportStatsDto,
} from '../dto/damageReportDto';

export class DamageReportService {
  /**
   * توليد رقم محضر إتلاف فريد
   */
  private async generateReportNumber(companyCode: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `DMG-${companyCode}-${year}${month}`;

    const count = await prisma.damageReport.count({
      where: {
        reportNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * إنشاء محضر إتلاف جديد
   */
  async createDamageReport(
    data: CreateDamageReportDto,
    companyId: number,
    userId: string
  ): Promise<{ success: boolean; message: string; data?: DamageReportResponseDto }> {
    try {
      // التحقق من وجود الشركة
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, code: true },
      });

      if (!company) {
        return {
          success: false,
          message: 'الشركة غير موجودة',
        };
      }

      // التحقق من وجود الأصناف وتوفر الكميات
      for (const line of data.lines) {
        const product = await prisma.product.findUnique({
          where: { id: line.productId },
        });

        if (!product) {
          return {
            success: false,
            message: `الصنف برقم ${line.productId} غير موجود`,
          };
        }

        // التحقق من المخزون
        const stock = await prisma.stock.findFirst({
          where: {
            productId: line.productId,
            companyId: companyId,
          },
        });

        if (!stock || Number(stock.boxes) < line.quantity) {
          return {
            success: false,
            message: `الكمية المتاحة للصنف "${product.name}" غير كافية. المتاح: ${stock?.boxes || 0}، المطلوب: ${line.quantity}`,
          };
        }
      }

      // توليد رقم المحضر
      const reportNumber = await this.generateReportNumber(company.code);

      // إنشاء المحضر مع السطور
      const damageReport = await prisma.damageReport.create({
        data: {
          reportNumber,
          companyId,
          createdByUserId: userId,
          reason: data.reason,
          notes: data.notes,
          status: 'APPROVED', // معتمد مباشرة
          lines: {
            create: data.lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              notes: line.notes,
            })),
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
          createdBy: {
            select: {
              UserID: true,
              FullName: true,
              UserName: true,
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
        },
      });

      // خصم الكميات من المخزون
      for (const line of data.lines) {
        await prisma.stock.updateMany({
          where: {
            productId: line.productId,
            companyId: companyId,
          },
          data: {
            boxes: {
              decrement: line.quantity,
            },
          },
        });
      }

      const response: DamageReportResponseDto = {
        id: damageReport.id,
        reportNumber: damageReport.reportNumber,
        companyId: damageReport.companyId,
        company: damageReport.company,
        createdByUserId: damageReport.createdByUserId,
        createdBy: damageReport.createdBy,
        reason: damageReport.reason,
        notes: damageReport.notes,
        status: damageReport.status,
        lines: damageReport.lines.map((line: any) => ({
          id: line.id,
          productId: line.productId,
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          quantity: Number(line.quantity),
          notes: line.notes,
          createdAt: line.createdAt,
        })),
        createdAt: damageReport.createdAt,
        updatedAt: damageReport.updatedAt,
      };

      return {
        success: true,
        message: 'تم إنشاء محضر الإتلاف بنجاح',
        data: response,
      };
    } catch (error: any) {
      console.error('Error creating damage report:', error);
      return {
        success: false,
        message: error.message || 'فشل في إنشاء محضر الإتلاف',
      };
    }
  }

  /**
   * الحصول على قائمة محاضر الإتلاف
   */
  async getDamageReports(
    query: GetDamageReportsQueryDto,
    companyId: number,
    isSystemUser: boolean
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const whereConditions: any = {};

      // إذا لم يكن system user، يرى فقط محاضر شركته
      if (!isSystemUser) {
        whereConditions.companyId = companyId;
      } else if (query.companyId) {
        whereConditions.companyId = query.companyId;
      }

      // التصفية حسب السبب
      if (query.reason) {
        whereConditions.reason = {
          contains: query.reason,
        };
      }

      // التصفية حسب الصنف (الاسم / الكود)
      if (query.productName || query.productCode) {
        whereConditions.lines = {
          some: {
            product: {
              ...(query.productName
                ? { name: { contains: query.productName } }
                : {}),
              ...(query.productCode
                ? { sku: { contains: query.productCode } }
                : {}),
            },
          },
        };
      }

      // التصفية حسب التاريخ
      if (query.startDate || query.endDate) {
        whereConditions.createdAt = {};
        if (query.startDate) {
          whereConditions.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          whereConditions.createdAt.lte = new Date(query.endDate);
        }
      }

      const total = await prisma.damageReport.count({ where: whereConditions });

      const damageReports = await prisma.damageReport.findMany({
        where: whereConditions,
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
          createdBy: {
            select: {
              UserID: true,
              FullName: true,
              UserName: true,
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
        },
      });

      const formattedReports: DamageReportResponseDto[] = damageReports.map((report: any) => ({
        id: report.id,
        reportNumber: report.reportNumber,
        companyId: report.companyId,
        company: report.company,
        createdByUserId: report.createdByUserId,
        createdBy: report.createdBy,
        reason: report.reason,
        notes: report.notes,
        status: report.status,
        lines: report.lines.map((line: any) => ({
          id: line.id,
          productId: line.productId,
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          quantity: Number(line.quantity),
          notes: line.notes,
          createdAt: line.createdAt,
        })),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      }));

      return {
        success: true,
        message: 'تم جلب محاضر الإتلاف بنجاح',
        data: {
          reports: formattedReports,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      console.error('Error fetching damage reports:', error);
      return {
        success: false,
        message: error.message || 'فشل في جلب محاضر الإتلاف',
      };
    }
  }

  /**
   * الحصول على محضر إتلاف واحد
   */
  async getDamageReportById(
    id: number
  ): Promise<{ success: boolean; message: string; data?: DamageReportResponseDto }> {
    try {
      const damageReport = await prisma.damageReport.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              UserID: true,
              FullName: true,
              UserName: true,
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
        },
      });

      if (!damageReport) {
        return {
          success: false,
          message: 'محضر الإتلاف غير موجود',
        };
      }

      const response: DamageReportResponseDto = {
        id: damageReport.id,
        reportNumber: damageReport.reportNumber,
        companyId: damageReport.companyId,
        company: damageReport.company,
        createdByUserId: damageReport.createdByUserId,
        createdBy: damageReport.createdBy,
        reason: damageReport.reason,
        notes: damageReport.notes,
        status: damageReport.status,
        lines: damageReport.lines.map((line: any) => ({
          id: line.id,
          productId: line.productId,
          product: {
            ...line.product,
            unitsPerBox: line.product.unitsPerBox ? Number(line.product.unitsPerBox) : null
          },
          quantity: Number(line.quantity),
          notes: line.notes,
          createdAt: line.createdAt,
        })),
        createdAt: damageReport.createdAt,
        updatedAt: damageReport.updatedAt,
      };

      return {
        success: true,
        message: 'تم جلب محضر الإتلاف بنجاح',
        data: response,
      };
    } catch (error: any) {
      console.error('Error fetching damage report:', error);
      return {
        success: false,
        message: error.message || 'فشل في جلب محضر الإتلاف',
      };
    }
  }

  /**
   * الحصول على إحصائيات محاضر الإتلاف
   */
  async getDamageReportStats(
    companyId: number,
    isSystemUser: boolean
  ): Promise<{ success: boolean; message: string; data?: DamageReportStatsDto }> {
    try {
      const whereCondition: any = isSystemUser
        ? {}
        : { companyId };

      const [totalReports, pendingReports, approvedReports, rejectedReports, allReports] = await Promise.all([
        prisma.damageReport.count({ where: whereCondition }),
        prisma.damageReport.count({ where: { ...whereCondition, status: 'PENDING' } }),
        prisma.damageReport.count({ where: { ...whereCondition, status: 'APPROVED' } }),
        prisma.damageReport.count({ where: { ...whereCondition, status: 'REJECTED' } }),
        prisma.damageReport.findMany({
          where: whereCondition,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            lines: {
              include: {
                product: {
                  select: {
                    unit: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      let totalDamagedBoxes = 0;
      let totalDamagedPieces = 0;
      let totalDamagedBags = 0;
      let totalDamagedLiters = 0;

      const totalDamagedQuantity = allReports.reduce((sum: number, report: any) => {
        const reportTotal = report.lines.reduce((lineSum: number, line: any) => {
          const qty = Number(line.quantity);
          const unit = line.product?.unit;

          switch (unit) {
            case 'صندوق':
              totalDamagedBoxes += qty;
              break;
            case 'قطعة':
              totalDamagedPieces += qty;
              break;
            case 'كيس':
              totalDamagedBags += qty;
              break;
            case 'لتر':
              totalDamagedLiters += qty;
              break;
            default:
              break;
          }

          return lineSum + qty;
        }, 0);

        return sum + reportTotal;
      }, 0);

      // إحصائيات المحاضر لكل شركة
      const reportsPerCompanyMap = new Map<number, {
        companyId: number;
        companyName: string;
        companyCode: string;
        totalReports: number;
      }>();

      for (const report of allReports) {
        const key = report.companyId as number;
        const companyName = report.company?.name ?? `شركة #${report.companyId}`;
        const companyCode = report.company?.code ?? '';

        const existing = reportsPerCompanyMap.get(key);
        if (existing) {
          existing.totalReports += 1;
        } else {
          reportsPerCompanyMap.set(key, {
            companyId: key,
            companyName,
            companyCode,
            totalReports: 1,
          });
        }
      }

      const reportsPerCompany = Array.from(reportsPerCompanyMap.values()).sort((a, b) =>
        a.companyName.localeCompare(b.companyName, 'ar')
      );

      return {
        success: true,
        message: 'تم جلب الإحصائيات بنجاح',
        data: {
          totalReports,
          pendingReports,
          approvedReports,
          rejectedReports,
          totalDamagedQuantity,
          totalDamagedBoxes,
          totalDamagedPieces,
          totalDamagedBags,
          totalDamagedLiters,
          reportsPerCompany,
        },
      };
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        message: error.message || 'فشل في جلب الإحصائيات',
      };
    }
  }

  /**
   * حذف محضر إتلاف
   */
  async deleteDamageReport(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const damageReport = await prisma.damageReport.findUnique({
        where: { id },
      });

      if (!damageReport) {
        return {
          success: false,
          message: 'محضر الإتلاف غير موجود',
        };
      }

      if (damageReport.status !== 'PENDING') {
        return {
          success: false,
          message: 'لا يمكن حذف محضر معتمد أو مرفوض',
        };
      }

      await prisma.damageReport.delete({ where: { id } });

      return {
        success: true,
        message: 'تم حذف محضر الإتلاف بنجاح',
      };
    } catch (error: any) {
      console.error('Error deleting damage report:', error);
      return {
        success: false,
        message: error.message || 'فشل في حذف محضر الإتلاف',
      };
    }
  }
}
