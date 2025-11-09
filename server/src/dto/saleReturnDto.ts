/**
 * Sale Return DTOs
 * كائنات نقل البيانات لمردودات المبيعات
 */

import { z } from 'zod';
import { PaymentMethod, ReturnStatus } from './salesDto';

// Zod Schemas للتحقق من صحة البيانات

export const CreateSaleReturnLineDtoSchema = z.object({
  productId: z.number().int().positive('معرف الصنف يجب أن يكون رقم موجب'),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().positive('سعر الوحدة يجب أن يكون أكبر من صفر')
});

export const CreateSaleReturnDtoSchema = z.object({
  saleId: z.number().int().positive('معرف الفاتورة يجب أن يكون رقم موجب'),
  reason: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(CreateSaleReturnLineDtoSchema).min(1, 'يجب إضافة صنف واحد على الأقل')
});

export const UpdateSaleReturnDtoSchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  reason: z.string().optional(),
  notes: z.string().optional()
});

export const GetSaleReturnsQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  search: z.string().optional(),
  saleId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  customerId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  status: z.nativeEnum(ReturnStatus).optional(),
  isFullyPaid: z.string().optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val === 'true';
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Return Payment DTOs

export const CreateReturnPaymentDtoSchema = z.object({
  saleReturnId: z.number().int().positive('معرف المردود يجب أن يكون رقم موجب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  paymentMethod: z.nativeEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' }),
  paymentDate: z.string().optional(), // تاريخ الدفع (اختياري، افتراضياً اليوم)
  notes: z.string().optional()
});

export const UpdateReturnPaymentDtoSchema = z.object({
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر').optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional()
});

export const GetReturnPaymentsQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  saleReturnId: z.string().optional().transform(Number).pipe(z.number().int().positive()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Types من الـ schemas
export type CreateSaleReturnLineDto = z.infer<typeof CreateSaleReturnLineDtoSchema>;
export type CreateSaleReturnDto = z.infer<typeof CreateSaleReturnDtoSchema>;
export type UpdateSaleReturnDto = z.infer<typeof UpdateSaleReturnDtoSchema>;
export type GetSaleReturnsQueryDto = z.infer<typeof GetSaleReturnsQueryDtoSchema>;
export type CreateReturnPaymentDto = z.infer<typeof CreateReturnPaymentDtoSchema>;
export type UpdateReturnPaymentDto = z.infer<typeof UpdateReturnPaymentDtoSchema>;
export type GetReturnPaymentsQueryDto = z.infer<typeof GetReturnPaymentsQueryDtoSchema>;

