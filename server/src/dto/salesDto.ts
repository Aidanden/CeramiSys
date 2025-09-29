/**
 * Sales DTOs
 * كائنات نقل البيانات للمبيعات
 */

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

// Interfaces للمبيعات
export interface CreateSaleLineDto {
  productId: number;
  qty: number;
  unitPrice: number;
}

export interface CreateSaleDto {
  customerId?: number;
  invoiceNumber?: string;
  saleType: SaleType;
  paymentMethod: PaymentMethod;
  lines: CreateSaleLineDto[];
}

export interface UpdateSaleDto {
  customerId?: number;
  invoiceNumber?: string;
  saleType?: SaleType;
  paymentMethod?: PaymentMethod;
  lines?: CreateSaleLineDto[];
}

export interface GetSalesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  saleType?: SaleType;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
}

// Interfaces للعملاء
export interface CreateCustomerDto {
  name: string;
  phone?: string;
  note?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  note?: string;
}

export interface GetCustomersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}
