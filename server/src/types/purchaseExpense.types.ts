import { Decimal } from '@prisma/client/runtime/library';

// فئة المصروفات
export interface PurchaseExpenseCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
  supplierIds?: number[]; // الموردين المرتبطين بهذه الفئة
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  supplierIds?: number[];
}

// المصروفات
export interface PurchaseExpense {
  id: number;
  purchaseId: number;
  categoryId: number;
  supplierId?: number;
  amount: Decimal;
  notes?: string;
  isActualExpense: boolean; // true = مصروف فعلي (دين), false = مصروف تقديري (لتوزيع التكلفة فقط)
  createdAt: Date;
}

export interface CreatePurchaseExpenseDto {
  categoryId: number;
  supplierId?: number;
  amount: number;
  notes?: string;
  isActualExpense?: boolean; // true = مصروف فعلي (دين), false = مصروف تقديري (لتوزيع التكلفة فقط)
}

// اعتماد الفاتورة
export interface ApprovePurchaseDto {
  purchaseId: number;
  expenses: CreatePurchaseExpenseDto[];
}

export interface ApprovePurchaseResponse {
  success: boolean;
  purchase: {
    id: number;
    isApproved: boolean;
    approvedAt: Date;
    totalExpenses: Decimal;
    finalTotal: Decimal;
  };
  productCosts: {
    productId: number;
    totalCostPerUnit: Decimal;
  }[];
}
