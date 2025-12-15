/**
 * Sale Payment DTOs
 * كائنات نقل البيانات لدفعات المبيعات الآجلة
 */

import { z } from 'zod';
import { PaymentMethod } from './salesDto';

// Zod Schemas للتحقق من صحة البيانات

export const CreateSalePaymentDtoSchema = z.object({
  saleId: z.number().int().positive('معرف الفاتورة يجب أن يكون رقم موجب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  paymentMethod: z.nativeEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' }),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  bankAccountId: z.number().int().positive().optional()
});

export const UpdateSalePaymentDtoSchema = z.object({
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر').optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional()
});

export const GetSalePaymentsQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  saleId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const GetCreditSalesQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  search: z.string().optional(),
  customerId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  isFullyPaid: z.string().optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val === 'true';
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Types من الـ schemas
export type CreateSalePaymentDto = z.infer<typeof CreateSalePaymentDtoSchema>;
export type UpdateSalePaymentDto = z.infer<typeof UpdateSalePaymentDtoSchema>;
export type GetSalePaymentsQueryDto = z.infer<typeof GetSalePaymentsQueryDtoSchema>;
export type GetCreditSalesQueryDto = z.infer<typeof GetCreditSalesQueryDtoSchema>;
