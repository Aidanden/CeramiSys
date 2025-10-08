/**
 * Provisional Sales DTOs
 * كائنات نقل البيانات للفواتير المبدئية
 */

import { z } from 'zod';

// ============== Enums ==============

export const ProvisionalSaleStatusEnum = z.enum([
  'DRAFT',     // مسودة
  'PENDING',   // معلقة
  'APPROVED',  // معتمدة
  'CONVERTED', // مرحلة
  'CANCELLED'  // ملغية
]);

export type ProvisionalSaleStatus = z.infer<typeof ProvisionalSaleStatusEnum>;

// ============== Line Item DTOs ==============

export const CreateProvisionalSaleLineDto = z.object({
  productId: z.number().int().positive('معرف المنتج مطلوب'),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().positive('سعر الوحدة يجب أن يكون أكبر من صفر')
});

export const UpdateProvisionalSaleLineDto = z.object({
  id: z.number().int().positive('معرف السطر مطلوب'),
  productId: z.number().int().positive('معرف المنتج مطلوب'),
  qty: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().positive('سعر الوحدة يجب أن يكون أكبر من صفر')
});

export type CreateProvisionalSaleLineDto = z.infer<typeof CreateProvisionalSaleLineDto>;
export type UpdateProvisionalSaleLineDto = z.infer<typeof UpdateProvisionalSaleLineDto>;

// ============== Main DTOs ==============

export const CreateProvisionalSaleDto = z.object({
  companyId: z.number().int().positive('معرف الشركة مطلوب'),
  customerId: z.number().int().positive().optional(),
  invoiceNumber: z.string().optional(),
  status: ProvisionalSaleStatusEnum.default('DRAFT'),
  notes: z.string().optional(),
  lines: z.array(CreateProvisionalSaleLineDto).min(1, 'يجب إضافة منتج واحد على الأقل')
});

export const UpdateProvisionalSaleDto = z.object({
  customerId: z.number().int().positive().optional(),
  invoiceNumber: z.string().optional(),
  status: ProvisionalSaleStatusEnum.optional(),
  notes: z.string().optional(),
  lines: z.array(UpdateProvisionalSaleLineDto).optional()
});

export const GetProvisionalSalesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  companyId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  status: ProvisionalSaleStatusEnum.optional(),
  isConverted: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'total', 'invoiceNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const ConvertToSaleDto = z.object({
  saleType: z.enum(['CASH', 'CREDIT']).default('CREDIT'),
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD']).optional()
});

export type CreateProvisionalSaleDto = z.infer<typeof CreateProvisionalSaleDto>;
export type UpdateProvisionalSaleDto = z.infer<typeof UpdateProvisionalSaleDto>;
export type GetProvisionalSalesQueryDto = z.infer<typeof GetProvisionalSalesQueryDto>;
export type ConvertToSaleDto = z.infer<typeof ConvertToSaleDto>;

// ============== Response DTOs ==============

export interface ProvisionalSaleLineResponseDto {
  id: number;
  productId: number;
  product: {
    id: number;
    sku: string;
    name: string;
    unit?: string;
  };
  qty: number;
  unitPrice: number;
  subTotal: number;
}

export interface ProvisionalSaleResponseDto {
  id: number;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  customerId?: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  invoiceNumber?: string;
  total: number;
  status: ProvisionalSaleStatus;
  isConverted: boolean;
  convertedSaleId?: number;
  convertedSale?: {
    id: number;
    invoiceNumber?: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  convertedAt?: Date;
  lines: ProvisionalSaleLineResponseDto[];
}

export interface ProvisionalSalesListResponseDto {
  provisionalSales: ProvisionalSaleResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============== Validation Schemas ==============

export const CreateProvisionalSaleDtoSchema = CreateProvisionalSaleDto;
export const UpdateProvisionalSaleDtoSchema = UpdateProvisionalSaleDto;
export const GetProvisionalSalesQueryDtoSchema = GetProvisionalSalesQueryDto;
export const ConvertToSaleDtoSchema = ConvertToSaleDto;
