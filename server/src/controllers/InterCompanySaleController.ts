/**
 * Inter-Company Sale Controller
 * متحكم المبيعات بين الشركات
 */

import { Request, Response } from 'express';
import { InterCompanySaleService } from '../services/InterCompanySaleService';
import {
  CreateInterCompanySaleDtoSchema,
  GetInterCompanySalesQueryDtoSchema
} from '../dto/interCompanySaleDto';

const interCompanySaleService = new InterCompanySaleService();

/**
 * إنشاء فاتورة مبيعات بين الشركات
 */
export const createInterCompanySale = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchCompanyId = (req as any).user?.companyId;

    if (!branchCompanyId) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    // التحقق من أن الشركة لها شركة أم
    const { PrismaClient } = require('@prisma/client');
    const prisma = require('../models/prismaClient').default; // Use singleton

    const branchCompany = await prisma.company.findUnique({
      where: { id: branchCompanyId },
      select: { parentId: true }
    });

    if (!branchCompany?.parentId) {
      res.status(400).json({
        success: false,
        message: 'هذه الشركة ليست شركة تابعة - لا يمكن إنشاء مبيعات بين الشركات'
      });
      return;
    }

    const data = CreateInterCompanySaleDtoSchema.parse(req.body);
    const result = await interCompanySaleService.createInterCompanySale(
      data,
      branchCompanyId,
      branchCompany.parentId
    );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على جميع المبيعات بين الشركات
 */
export const getInterCompanySales = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchCompanyId = (req as any).user?.companyId;

    if (!branchCompanyId) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const query = GetInterCompanySalesQueryDtoSchema.parse(req.query);
    const result = await interCompanySaleService.getInterCompanySales(query, branchCompanyId);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على فاتورة مبيعات بين الشركات بالتفصيل
 */
export const getInterCompanySaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchCompanyId = (req as any).user?.companyId;
    const { id } = req.params;

    if (!branchCompanyId) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const result = await interCompanySaleService.getInterCompanySaleById(Number(id), branchCompanyId);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * الحصول على إحصائيات المبيعات بين الشركات
 */
export const getInterCompanySalesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const branchCompanyId = (req as any).user?.companyId;

    if (!branchCompanyId) {
      res.status(401).json({
        success: false,
        message: 'غير مصرح - معرف الشركة مفقود'
      });
      return;
    }

    const result = await interCompanySaleService.getInterCompanySalesStats(branchCompanyId);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
