import { z } from "zod";

// DTO لتقرير المبيعات
export const SalesReportQueryDto = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  companyId: z.string().optional().transform(Number),
  customerId: z.string().optional().transform(Number),
  saleType: z.enum(["cash", "credit"]).optional(),
});

export type SalesReportQuery = z.infer<typeof SalesReportQueryDto>;

// DTO لتقرير المخزون
export const StockReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  productId: z.string().optional().transform(Number),
  minBoxes: z.string().optional().transform(Number),
  maxBoxes: z.string().optional().transform(Number),
});

export type StockReportQuery = z.infer<typeof StockReportQueryDto>;

// DTO لتقرير الأرباح
export const FinancialReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  productId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type FinancialReportQuery = z.infer<typeof FinancialReportQueryDto>;

// DTO لتقرير العملاء
export const CustomerReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  customerId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CustomerReportQuery = z.infer<typeof CustomerReportQueryDto>;

// DTO لتقرير المنتجات الأكثر مبيعاً
export const TopProductsReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional().default("10").transform(Number),
});

export type TopProductsReportQuery = z.infer<typeof TopProductsReportQueryDto>;

// DTO لتقرير الموردين
export const SupplierReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  supplierId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type SupplierReportQuery = z.infer<typeof SupplierReportQueryDto>;

// DTO لتقرير المشتريات
export const PurchaseReportQueryDto = z.object({
  companyId: z.string().optional().transform(Number),
  supplierId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  purchaseType: z.enum(["CASH", "CREDIT"]).optional(),
});

export type PurchaseReportQuery = z.infer<typeof PurchaseReportQueryDto>;

// DTO لتقرير حركة الصنف
export const ProductMovementReportQueryDto = z.object({
  productId: z.string().transform(Number),
  companyId: z.string().optional().transform(Number),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ProductMovementReportQuery = z.infer<typeof ProductMovementReportQueryDto>;

// DTO لتقرير بضاعة الموردين
export const SupplierStockReportQueryDto = z.object({
  supplierId: z.string().transform(Number),
  companyId: z.string().optional().transform(Number),
});

export type SupplierStockReportQuery = z.infer<typeof SupplierStockReportQueryDto>;

// DTO لتقرير بضاعة المجموعات
export const GroupStockReportQueryDto = z.object({
  groupId: z.string().transform(Number),
  companyId: z.string().optional().transform(Number),
});

export type GroupStockReportQuery = z.infer<typeof GroupStockReportQueryDto>;

