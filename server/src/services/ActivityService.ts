/**
 * Activity Service
 * خدمة الأنشطة الأخيرة
 */

import { PrismaClient } from '@prisma/client';

export interface ActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'payment' | 'user' | 'product';
  title: string;
  description: string;
  time: string;
  amount?: string;
  createdAt: Date;
}

export class ActivityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * تنسيق الأرقام بالطريقة العربية الصحيحة
   */
  private formatArabicNumber(number: number): string {
    // تحويل الرقم إلى سلسلة نصية
    const numStr = number.toFixed(2);
    
    // تقسيم الرقم إلى أجزاء (قبل وبعد الفاصلة العشرية)
    const parts = numStr.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '00';
    
    // إضافة فواصل الآلاف
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // دمج النتيجة مع الأرقام العربية
    const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
    const englishNumbers = '0123456789';
    
    let result = formattedInteger;
    if (decimalPart && decimalPart !== '00') {
      result += '.' + decimalPart;
    }
    
    // تحويل الأرقام الإنجليزية إلى عربية
    for (let i = 0; i < englishNumbers.length; i++) {
      const englishChar = englishNumbers.charAt(i);
      const arabicChar = arabicNumbers.charAt(i);
      result = result.replace(new RegExp(englishChar, 'g'), arabicChar);
    }
    
    return result;
  }

  /**
   * الحصول على الأنشطة الأخيرة
   */
  async getRecentActivities(userCompanyId: number, isSystemUser?: boolean, limit: number = 10): Promise<ActivityItem[]> {
    try {
      const activities: ActivityItem[] = [];

      // جلب المبيعات الأخيرة
      const recentSales = await this.prisma.sale.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          customer: true,
          company: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2)
      });

      // تحويل المبيعات إلى أنشطة
      for (const sale of recentSales) {
        activities.push({
          id: `sale-${sale.id}`,
          type: 'sale',
          title: sale.saleType === 'CASH' ? 'عملية بيع نقدي' : 'عملية بيع آجل',
          description: `تم بيع منتجات بقيمة ${this.formatArabicNumber(Number(sale.total))} دينار${sale.customer ? ` للعميل ${sale.customer.name}` : ''}`,
          time: this.getTimeAgo(sale.createdAt),
          amount: `+${this.formatArabicNumber(Number(sale.total))} د.ل`,
          createdAt: sale.createdAt
        });
      }

      // جلب المشتريات الأخيرة
      const recentPurchases = await this.prisma.purchase.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          supplier: true,
          company: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2)
      });

      // تحويل المشتريات إلى أنشطة
      for (const purchase of recentPurchases) {
        activities.push({
          id: `purchase-${purchase.id}`,
          type: 'purchase',
          title: purchase.purchaseType === 'CASH' ? 'عملية شراء نقدي' : 'عملية شراء آجل',
          description: `تم شراء مواد بقيمة ${this.formatArabicNumber(Number(purchase.total))} دينار${purchase.supplier ? ` من المورد ${purchase.supplier.name}` : ''}`,
          time: this.getTimeAgo(purchase.createdAt),
          amount: `-${this.formatArabicNumber(Number(purchase.total))} د.ل`,
          createdAt: purchase.createdAt
        });
      }

      // جلب الدفعات الأخيرة
      const recentPayments = await this.prisma.salePayment.findMany({
        where: {
          ...(isSystemUser !== true && { companyId: userCompanyId })
        },
        include: {
          sale: {
            include: {
              customer: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 4)
      });

      // تحويل الدفعات إلى أنشطة
      for (const payment of recentPayments) {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'دفعة مستلمة',
          description: `تم استلام دفعة بقيمة ${this.formatArabicNumber(Number(payment.amount))} دينار${payment.sale?.customer ? ` من العميل ${payment.sale.customer.name}` : ''}`,
          time: this.getTimeAgo(payment.createdAt),
          amount: `+${this.formatArabicNumber(Number(payment.amount))} د.ل`,
          createdAt: payment.createdAt
        });
      }

      // جلب الأصناف الجديدة
      const recentProducts = await this.prisma.product.findMany({
        where: {
          ...(isSystemUser !== true && { createdByCompanyId: userCompanyId })
        },
        include: {
          createdByCompany: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 4)
      });

      // تحويل الأصناف إلى أنشطة
      for (const product of recentProducts) {
        activities.push({
          id: `product-${product.id}`,
          type: 'product',
          title: 'صنف جديد',
          description: `تم إضافة صنف جديد: ${product.name} (${product.sku})`,
          time: this.getTimeAgo(product.createdAt),
          createdAt: product.createdAt
        });
      }

      // ترتيب الأنشطة حسب التاريخ
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // إرجاع العدد المطلوب
      return activities.slice(0, limit);

    } catch (error) {
      console.error('خطأ في جلب الأنشطة الأخيرة:', error);
      throw error;
    }
  }

  /**
   * حساب الوقت المنقضي
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'الآن';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `منذ ${minutes} دقيقة`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `منذ ${hours} ساعة`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `منذ ${days} يوم`;
    }
  }
}
