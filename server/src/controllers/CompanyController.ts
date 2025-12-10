import { Request, Response } from 'express';
import { CompanyService } from '../services/CompanyService';
import { CreateCompanyDto, UpdateCompanyDto, GetCompaniesQueryDto } from '../dto/CompanyDto';
import { responseHelper } from '../utils/responseHelper';
import { PrismaClient } from '@prisma/client';
import prisma from '../models/prismaClient';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService(prisma);
  }

  // إنشاء شركة جديدة
  createCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📝 Create Company Request Body:', req.body);
      const validatedData = CreateCompanyDto.parse(req.body);
      console.log('✅ Validated Data:', validatedData);
      const company = await this.companyService.createCompany(validatedData);

      responseHelper.success(res, company, 'تم إنشاء الشركة بنجاح', 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        responseHelper.validationError(res, error.errors);
        return;
      }
      responseHelper.error(res, error.message, 400);
    }
  };

  // الحصول على جميع الشركات
  getCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = GetCompaniesQueryDto.parse(req.query);
      const result = await this.companyService.getCompanies(validatedQuery);

      responseHelper.success(res, result, 'تم الحصول على الشركات بنجاح');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        responseHelper.validationError(res, error.errors);
        return;
      }
      responseHelper.error(res, error.message, 400);
    }
  };

  // الحصول على شركة بواسطة المعرف
  getCompanyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        responseHelper.error(res, 'معرف الشركة غير صحيح', 400);
        return;
      }

      const company = await this.companyService.getCompanyById(id);

      if (!company) {
        responseHelper.error(res, 'الشركة غير موجودة', 404);
        return;
      }

      responseHelper.success(res, company, 'تم الحصول على الشركة بنجاح');
    } catch (error: any) {
      responseHelper.error(res, error.message, 400);
    }
  };

  // تحديث الشركة
  updateCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        responseHelper.error(res, 'معرف الشركة غير صحيح', 400);
        return;
      }

      const validatedData = UpdateCompanyDto.parse(req.body);
      const company = await this.companyService.updateCompany(id, validatedData);

      responseHelper.success(res, company, 'تم تحديث الشركة بنجاح');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        responseHelper.validationError(res, error.errors);
        return;
      }
      responseHelper.error(res, error.message, 400);
    }
  };

  // حذف الشركة
  deleteCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🗑️ Delete Company Request - ID:', req.params.id);
      const id = parseInt(req.params['id'] as string);

      if (isNaN(id)) {
        console.log('❌ Invalid ID provided:', req.params.id);
        responseHelper.error(res, 'معرف الشركة غير صحيح', 400);
        return;
      }

      console.log('🔍 Attempting to delete company with ID:', id);
      await this.companyService.deleteCompany(id);

      responseHelper.success(res, null, 'تم حذف الشركة بنجاح');
    } catch (error: any) {
      responseHelper.error(res, error.message, 400);
    }
  };

  // الحصول على الهيكل الهرمي للشركات
  getCompanyHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const hierarchy = await this.companyService.getCompanyHierarchy();

      responseHelper.success(res, hierarchy, 'تم الحصول على الهيكل الهرمي بنجاح');
    } catch (error: any) {
      responseHelper.error(res, error.message, 400);
    }
  };

  // إحصائيات الشركات
  getCompanyStats = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('📊 CompanyController.getCompanyStats - Request received');
      const stats = await this.companyService.getCompanyStats();
      console.log('✅ CompanyController.getCompanyStats - Stats retrieved:', stats);

      responseHelper.success(res, stats, 'تم الحصول على إحصائيات الشركات بنجاح');
    } catch (error: any) {
      console.error('❌ CompanyController.getCompanyStats - Error:', error);
      responseHelper.error(res, error.message, 400);
    }
  };

  // الحصول على الشركات التابعة للشركة الأم
  getBranchCompanies = async (req: Request, res: Response): Promise<void> => {
    try {
      const parentId = parseInt(req.params['parentId'] as string);

      if (isNaN(parentId)) {
        responseHelper.error(res, 'معرف الشركة الأم غير صحيح', 400);
        return;
      }

      const branches = await this.companyService.getBranchCompanies(parentId);

      responseHelper.success(res, branches, 'تم الحصول على الشركات التابعة بنجاح');
    } catch (error: any) {
      responseHelper.error(res, error.message, 400);
    }
  };
}
