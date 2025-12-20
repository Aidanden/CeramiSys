import { z } from 'zod';

// DTO for creating a purchase expense
export const CreatePurchaseExpenseDto = z.object({
  categoryId: z.number().int().positive(),
  supplierId: z.number().int().positive(), // المورد إجباري
  amount: z.number().positive(),
  currency: z.enum(['LYD', 'USD', 'EUR']).default('LYD'),
  exchangeRate: z.number().positive().default(1),
  amountForeign: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
});

// DTO for approving a purchase with expenses
export const ApprovePurchaseDto = z.object({
  purchaseId: z.number().int().positive(),
  expenses: z.array(CreatePurchaseExpenseDto).min(0, 'يمكن اعتماد الفاتورة بدون مصروفات'),
});

// DTO for creating expense category
export const CreateExpenseCategoryDto = z.object({
  name: z.string().min(1, 'اسم الفئة مطلوب'),
  description: z.string().optional(),
  supplierIds: z.array(z.number().int().positive()).optional(),
});

// DTO for updating expense category
export const UpdateExpenseCategoryDto = z.object({
  name: z.string().min(1, 'اسم الفئة مطلوب').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  supplierIds: z.array(z.number().int().positive()).optional(),
});

// Query DTOs
export const GetExpenseCategoriesQueryDto = z.object({
  includeInactive: z.coerce.boolean().default(false),
});

export const GetProductCostHistoryQueryDto = z.object({
  companyId: z.coerce.number().int().positive().optional(),
});

// Type exports
export type CreatePurchaseExpenseRequest = z.infer<typeof CreatePurchaseExpenseDto>;
export type ApprovePurchaseRequest = z.infer<typeof ApprovePurchaseDto>;
export type CreateExpenseCategoryRequest = z.infer<typeof CreateExpenseCategoryDto>;
export type UpdateExpenseCategoryRequest = z.infer<typeof UpdateExpenseCategoryDto>;
export type GetExpenseCategoriesQuery = z.infer<typeof GetExpenseCategoriesQueryDto>;
export type GetProductCostHistoryQuery = z.infer<typeof GetProductCostHistoryQueryDto>;

// Response types
export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  suppliers: ExpenseCategorySupplier[];
}

export interface ExpenseCategorySupplier {
  id: number;
  supplierId: number;
  supplier: {
    id: number;
    name: string;
  };
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
  currency: 'LYD' | 'USD' | 'EUR';
  exchangeRate: number;
  amountForeign: number | null;
  notes: string | null;
  createdAt: string;
}

export interface ProductCostHistory {
  id: number;
  productId: number;
  purchaseId: number;
  companyId: number;
  purchasePrice: number;
  expensePerUnit: number;
  totalCostPerUnit: number;
  createdAt: string;
  purchase: {
    id: number;
    invoiceNumber: string | null;
    createdAt: string;
  };
}

export interface SupplierPayable {
  id?: number; // ID إيصال الدفع
  supplierId: number;
  supplierName: string;
  amount: number;
  type: 'MAIN_PURCHASE' | 'EXPENSE';
  description?: string;
  categoryName?: string;
}

export interface ApprovePurchaseResponse {
  success: boolean;
  purchase: {
    id: number;
    isApproved: boolean;
    approvedAt: string;
    totalExpenses: number;
    finalTotal: number;
  };
  productCosts?: {
    productId: number;
    totalCostPerUnit: number;
  }[];
  supplierPayables?: SupplierPayable[];
  paymentReceipts?: SupplierPayable[];
  message?: string;
}
