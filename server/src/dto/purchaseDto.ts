import { z } from 'zod';

// DTO for creating a purchase
export const CreatePurchaseDto = z.object({
  companyId: z.number().int().positive(),
  supplierId: z.number().int().positive().optional(),
  invoiceNumber: z.string().regex(/^\d{6}$/, 'رقم الفاتورة يجب أن يكون 6 أرقام فقط').optional(),
  purchaseType: z.enum(['CASH', 'CREDIT']),
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD']).optional(),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    qty: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

// DTO for updating a purchase
export const UpdatePurchaseDto = z.object({
  supplierId: z.number().int().positive().optional(),
  invoiceNumber: z.string().regex(/^\d{6}$/, 'رقم الفاتورة يجب أن يكون 6 أرقام فقط').optional(),
  purchaseType: z.enum(['CASH', 'CREDIT']).optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD']).optional(),
  lines: z.array(z.object({
    id: z.number().int().positive().optional(), // for existing lines
    productId: z.number().int().positive(),
    qty: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'يجب إضافة صنف واحد على الأقل').optional(),
});

// DTO for purchase payment
export const CreatePurchasePaymentDto = z.object({
  purchaseId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  receiptNumber: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK', 'CARD']),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// DTO for supplier
export const CreateSupplierDto = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  note: z.string().optional(),
});

export const UpdateSupplierDto = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  note: z.string().optional(),
});

// Query DTOs
export const GetPurchasesQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  companyId: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  purchaseType: z.enum(['CASH', 'CREDIT']).optional(),
  isFullyPaid: z.coerce.boolean().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  supplierName: z.string().optional(),
  supplierPhone: z.string().optional(),
  invoiceNumber: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const GetSuppliersQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(10),
  search: z.string().optional(),
});

// Type exports
export type CreatePurchaseRequest = z.infer<typeof CreatePurchaseDto>;
export type UpdatePurchaseRequest = z.infer<typeof UpdatePurchaseDto>;
export type CreatePurchasePaymentRequest = z.infer<typeof CreatePurchasePaymentDto>;
export type CreateSupplierRequest = z.infer<typeof CreateSupplierDto>;
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierDto>;
export type GetPurchasesQuery = z.infer<typeof GetPurchasesQueryDto>;
export type GetSuppliersQuery = z.infer<typeof GetSuppliersQueryDto>;

// Response types
export interface PurchaseLine {
  id: number;
  productId: number;
  product: {
    id: number;
    sku: string;
    name: string;
    unit: string | null;
  };
  qty: number;
  unitPrice: number;
  subTotal: number;
}

export interface PurchaseExpense {
  id: number;
  purchaseId: number;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  supplierId: number | null;
  supplier: {
    id: number;
    name: string;
  } | null;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  companyId: number;
  company: {
    id: number;
    name: string;
    code: string;
  };
  supplierId: number | null;
  supplier: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  invoiceNumber: string | null;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  purchaseType: 'CASH' | 'CREDIT';
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | null;
  isFullyPaid: boolean;
  createdAt: string;
  lines: PurchaseLine[];
  payments: PurchasePayment[];
  expenses?: PurchaseExpense[];
}

export interface PurchasePayment {
  id: number;
  purchaseId: number;
  companyId: number;
  receiptNumber: string | null;
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'CARD';
  paymentDate: string;
  notes: string | null;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  _count?: {
    purchases: number;
  };
}

export interface PurchaseStats {
  totalPurchases: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  cashPurchases: number;
  creditPurchases: number;
  averagePurchase: number;
}

