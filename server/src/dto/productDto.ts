/**
 * Product DTOs
 * كائنات نقل البيانات للأصناف
 */

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDecimal, Min, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

// DTO لإنشاء صنف جديد
export class CreateProductDto {
  @IsString({ message: 'رمز الصنف يجب أن يكون نص' })
  @IsNotEmpty({ message: 'رمز الصنف مطلوب' })
  sku!: string;

  @IsString({ message: 'اسم الصنف يجب أن يكون نص' })
  @IsNotEmpty({ message: 'اسم الصنف مطلوب' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'الوحدة يجب أن تكون نص' })
  unit?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'عدد الوحدات في الصندوق يجب أن يكون رقم صالح' })
  @Min(0.01, { message: 'عدد الوحدات في الصندوق يجب أن يكون أكبر من صفر' })
  unitsPerBox?: number;

  @IsNumber({}, { message: 'معرف الشركة يجب أن يكون رقم' })
  @IsInt({ message: 'معرف الشركة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الشركة يجب أن يكون أكبر من صفر' })
  createdByCompanyId!: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'سعر البيع يجب أن يكون رقم صالح' })
  @Min(0, { message: 'سعر البيع يجب أن يكون أكبر من أو يساوي صفر' })
  sellPrice?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'عدد الصناديق الأولية يجب أن يكون رقم صالح' })
  @Min(0, { message: 'عدد الصناديق الأولية يجب أن يكون أكبر من أو يساوي صفر' })
  initialBoxes?: number;
}

// DTO لتحديث صنف
export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'رمز الصنف يجب أن يكون نص' })
  @IsNotEmpty({ message: 'رمز الصنف لا يمكن أن يكون فارغ' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'اسم الصنف يجب أن يكون نص' })
  @IsNotEmpty({ message: 'اسم الصنف لا يمكن أن يكون فارغ' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'الوحدة يجب أن تكون نص' })
  unit?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'عدد الوحدات في الصندوق يجب أن يكون رقم صالح' })
  @Min(0.01, { message: 'عدد الوحدات في الصندوق يجب أن يكون أكبر من صفر' })
  unitsPerBox?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'سعر البيع يجب أن يكون رقم صالح' })
  @Min(0, { message: 'سعر البيع يجب أن يكون أكبر من أو يساوي صفر' })
  sellPrice?: number;
}

// DTO لاستعلام الأصناف
export class GetProductsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'رقم الصفحة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون أكبر من صفر' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'حد الصفحة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'حد الصفحة يجب أن يكون أكبر من صفر' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'البحث يجب أن يكون نص' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'كود الصنف يجب أن يكون نص' })
  sku?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'معرف الشركة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الشركة يجب أن يكون أكبر من صفر' })
  companyId?: number;

  @IsOptional()
  @IsString({ message: 'الوحدة يجب أن تكون نص' })
  unit?: string;
}

// DTO لتحديث المخزون
export class UpdateStockDto {
  @IsNumber({}, { message: 'معرف الصنف يجب أن يكون رقم' })
  @IsInt({ message: 'معرف الصنف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الصنف يجب أن يكون أكبر من صفر' })
  productId!: number;

  @IsNumber({}, { message: 'معرف الشركة يجب أن يكون رقم' })
  @IsInt({ message: 'معرف الشركة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الشركة يجب أن يكون أكبر من صفر' })
  companyId!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'الكمية يجب أن تكون رقم صالح' })
  @Min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي صفر' })
  quantity!: number;
}

// DTO لتحديث السعر
export class UpdatePriceDto {
  @IsNumber({}, { message: 'معرف الصنف يجب أن يكون رقم' })
  @IsInt({ message: 'معرف الصنف يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الصنف يجب أن يكون أكبر من صفر' })
  productId!: number;

  @IsNumber({}, { message: 'معرف الشركة يجب أن يكون رقم' })
  @IsInt({ message: 'معرف الشركة يجب أن يكون رقم صحيح' })
  @Min(1, { message: 'معرف الشركة يجب أن يكون أكبر من صفر' })
  companyId!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'سعر البيع يجب أن يكون رقم صالح' })
  @Min(0, { message: 'سعر البيع يجب أن يكون أكبر من أو يساوي صفر' })
  sellPrice!: number;
}

// Response DTOs
export interface ProductResponseDto {
  id: number;
  sku: string;
  name: string;
  unit?: string;
  unitsPerBox?: number; // عدد الوحدات في الصندوق
  qrCode?: string; // QR Code كـ Data URL
  createdByCompanyId: number;
  createdByCompany: {
    id: number;
    name: string;
    code: string;
  };
  createdAt: Date;
  updatedAt: Date;
  // بيانات المخزون والأسعار للشركة الحالية
  stock?: Array<{
    companyId: number;
    boxes: number; // عدد الصناديق
    quantity: number; // الكمية بالوحدات (boxes * unitsPerBox)
    updatedAt: Date;
  }>;
  price?: {
    sellPrice: number;
    updatedAt: Date;
  };
}

export interface ProductsResponseDto {
  success: boolean;
  message: string;
  data: {
    products: ProductResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ProductStatsResponseDto {
  success: boolean;
  message: string;
  data: {
    totalProducts: number;
    productsWithStock: number;
    productsWithoutStock: number;
    totalStockValue: number;
    averageProductPrice: number;
  };
}
