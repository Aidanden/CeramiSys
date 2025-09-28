import { z } from 'zod';

// DTO لإنشاء شركة جديدة
export const CreateCompanyDto = z.object({
  name: z.string().min(2, 'اسم الشركة يجب أن يكون على الأقل حرفين'),
  code: z.string().min(2, 'كود الشركة يجب أن يكون على الأقل حرفين'),
  isParent: z.boolean().default(false),
  parentId: z.number().int().positive().optional(),
});

// DTO لتحديث الشركة
export const UpdateCompanyDto = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  isParent: z.boolean().optional(),
  parentId: z.number().int().positive().optional().nullable(),
});

// DTO للاستعلام عن الشركات
export const GetCompaniesQueryDto = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('10').transform(Number).pipe(z.number().int().positive().max(10000)),
  search: z.string().optional(),
  isParent: z.enum(['true', 'false']).optional(),
  parentId: z.string().optional().transform((val) => val ? Number(val) : undefined),
});

// Types
export type CreateCompanyRequest = z.infer<typeof CreateCompanyDto>;
export type UpdateCompanyRequest = z.infer<typeof UpdateCompanyDto>;
export type GetCompaniesQuery = z.infer<typeof GetCompaniesQueryDto>;