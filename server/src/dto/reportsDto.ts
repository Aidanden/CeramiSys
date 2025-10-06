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
export const ProfitReportQueryDto = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  companyId: z.string().optional().transform(Number),
  groupBy: z.enum(["day", "week", "month", "year"]).optional().default("month"),
});

export type ProfitReportQuery = z.infer<typeof ProfitReportQueryDto>;

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
