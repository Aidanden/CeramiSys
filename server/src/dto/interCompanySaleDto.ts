/**
 * Inter-Company Sale DTOs
 * مبيعات بين الشركات
 */

import { z } from 'zod';

/**
 * DTO لإنشاء فاتورة مبيعات بين الشركات
 */
export const CreateInterCompanySaleDtoSchema = z.object({
  customerId: z.number().int().positive().optional(), // العميل النهائي (اختياري)
  saleType: z.enum(['CASH', 'CREDIT']).default('CASH'), // نوع البيع للعميل النهائي
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD']).optional(), // طريقة الدفع (للبيع النقدي)
  lines: z.array(z.object({
    productId: z.number().int().positive(), // الصنف من الشركة الأم
    qty: z.number().positive(), // الكمية
    parentUnitPrice: z.number().positive(), // سعر الشركة الأم
    branchUnitPrice: z.number().positive(), // سعر الشركة التابعة (مع هامش الربح)
    subTotal: z.number().positive() // الإجمالي للعميل النهائي
  })).min(1, 'يجب إضافة بند واحد على الأقل')
});

/**
 * DTO للاستعلام عن المبيعات بين الشركات
 */
export const GetInterCompanySalesQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  search: z.string().optional(),
  customerId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  saleType: z.enum(['CASH', 'CREDIT']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Types
export type CreateInterCompanySaleDto = z.infer<typeof CreateInterCompanySaleDtoSchema>;
export type GetInterCompanySalesQueryDto = z.infer<typeof GetInterCompanySalesQueryDtoSchema>;
