/**
 * Sales DTOs
 * كائنات نقل البيانات للمبيعات
 */

import { z } from 'zod';

// Enums
export enum SaleType {
  CASH = 'CASH',   // نقدي
  CREDIT = 'CREDIT' // آجل
}

export enum PaymentMethod {
  CASH = 'CASH',   // كاش
  BANK = 'BANK',   // حوالة مصرفية
  CARD = 'CARD'    // بطاقة
}

// Zod Schemas للتحقق من صحة البيانات
export const CreateSaleLineDtoSchema = z.object({
  productId: z.number().int().positive('معرف الصنف يجب أن يكون رقم موجب'),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().min(0, 'سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر')
});

export const CreateSaleDtoSchema = z.object({
  companyId: z.number().int().positive().optional(), // للـ System User: تحديد الشركة التي يريد البيع منها
  customerId: z.number().int().positive().optional(),
  invoiceNumber: z.string().optional(),
  saleType: z.nativeEnum(SaleType, { message: 'نوع البيع غير صحيح' }),
  paymentMethod: z.nativeEnum(PaymentMethod, { message: 'طريقة الدفع غير صحيحة' }).optional(), // اختياري للبيع الآجل
  lines: z.array(CreateSaleLineDtoSchema).min(1, 'يجب إضافة بند واحد على الأقل')
});

export const UpdateSaleDtoSchema = z.object({
  customerId: z.number().int().positive().optional(),
  invoiceNumber: z.string().optional(),
  saleType: z.nativeEnum(SaleType).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  lines: z.array(CreateSaleLineDtoSchema).optional()
});

export const GetSalesQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  search: z.string().transform(val => val === '' ? undefined : val).optional(),
  customerId: z.union([
    z.string().transform(val => val === '' ? undefined : Number(val)).pipe(z.number().int().positive()),
    z.literal('').transform(() => undefined)
  ]).optional(),
  saleType: z.union([z.nativeEnum(SaleType), z.literal('').transform(() => undefined)]).optional(),
  paymentMethod: z.union([z.nativeEnum(PaymentMethod), z.literal('').transform(() => undefined)]).optional(),
  startDate: z.string().transform(val => val === '' ? undefined : val).optional(),
  endDate: z.string().transform(val => val === '' ? undefined : val).optional()
});

// Customer DTOs
export const CreateCustomerDtoSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional(),
  note: z.string().optional()
});

export const UpdateCustomerDtoSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب').optional(),
  phone: z.string().optional(),
  note: z.string().optional()
});

export const GetCustomersQueryDtoSchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(1000)),
  search: z.string().optional()
});

// Types من الـ schemas
export type CreateSaleLineDto = z.infer<typeof CreateSaleLineDtoSchema>;
export type CreateSaleDto = z.infer<typeof CreateSaleDtoSchema>;
export type UpdateSaleDto = z.infer<typeof UpdateSaleDtoSchema>;
export type GetSalesQueryDto = z.infer<typeof GetSalesQueryDtoSchema>;
export type CreateCustomerDto = z.infer<typeof CreateCustomerDtoSchema>;
export type UpdateCustomerDto = z.infer<typeof UpdateCustomerDtoSchema>;
export type GetCustomersQueryDto = z.infer<typeof GetCustomersQueryDtoSchema>;
