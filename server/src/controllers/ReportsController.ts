import { Request, Response } from "express";
import { ReportsService } from "../services/ReportsService";
import {
  SalesReportQueryDto,
  StockReportQueryDto,
  CustomerReportQueryDto,
  TopProductsReportQueryDto,
  SupplierReportQueryDto,
  PurchaseReportQueryDto,
  ProductMovementReportQueryDto,
  FinancialReportQueryDto
} from "../dto/reportsDto";

export class ReportsController {
  private reportsService: ReportsService;

  constructor() {
    this.reportsService = new ReportsService();
  }

  /**
   * GET /api/reports/sales
   * تقرير المبيعات
   */
  getSalesReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = SalesReportQueryDto.parse(req.query);
      const report = await this.reportsService.getSalesReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getSalesReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير المبيعات",
      });
    }
  };

  /**
   * GET /api/reports/stock
   * تقرير المخزون
   */
  getStockReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = StockReportQueryDto.parse(req.query);
      const report = await this.reportsService.getStockReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getStockReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير المخزون",
      });
    }
  };

  /**
   * GET /api/reports/customers
   * تقرير العملاء
   */
  getCustomerReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = CustomerReportQueryDto.parse(req.query);
      const report = await this.reportsService.getCustomerReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getCustomerReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير العملاء",
      });
    }
  };

  /**
   * GET /api/reports/top-products
   * تقرير المنتجات الأكثر مبيعاً
   */
  getTopProductsReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = TopProductsReportQueryDto.parse(req.query);
      const report = await this.reportsService.getTopProductsReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getTopProductsReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير المنتجات الأكثر مبيعاً",
      });
    }
  };

  /**
   * GET /api/reports/suppliers
   * تقرير الموردين
   */
  getSupplierReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = SupplierReportQueryDto.parse(req.query);
      const report = await this.reportsService.getSupplierReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getSupplierReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير الموردين",
      });
    }
  };

  /**
   * GET /api/reports/purchases
   * تقرير المشتريات
   */
  getPurchaseReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = PurchaseReportQueryDto.parse(req.query);
      const report = await this.reportsService.getPurchaseReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getPurchaseReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير المشتريات",
      });
    }
  };

  /**
   * GET /api/reports/product-movement
   * تقرير حركة الصنف
   */
  getProductMovementReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = ProductMovementReportQueryDto.parse(req.query);
      const report = await this.reportsService.getProductMovementReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getProductMovementReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير حركة الصنف",
      });
    }
  };

  /**
   * GET /api/reports/financial
   * تقرير الأرباح (التقرير المالي)
   */
  getFinancialReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const validatedQuery = FinancialReportQueryDto.parse(req.query);
      const report = await this.reportsService.getFinancialReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getFinancialReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب التقرير المالي",
      });
    }
  };


  /**
   * GET /api/reports/supplier-stock
   * تقرير بضاعة الموردين
   */
  getSupplierStockReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const { SupplierStockReportQueryDto } = require("../dto/reportsDto");
      const validatedQuery = SupplierStockReportQueryDto.parse(req.query);
      const report = await this.reportsService.getSupplierStockReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getSupplierStockReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير بضاعة الموردين",
      });
    }
  };

  /**
   * GET /api/reports/group-stock
   * تقرير بضاعة المجموعات
   */
  getGroupStockReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userCompanyId = (req as any).user?.companyId;
      const isSystemUser = (req as any).user?.isSystemUser;

      if (!userCompanyId) {
        res.status(401).json({
          success: false,
          message: "غير مصرح - معرف الشركة مفقود",
        });
        return;
      }

      const { GroupStockReportQueryDto } = require("../dto/reportsDto");
      const validatedQuery = GroupStockReportQueryDto.parse(req.query);
      const report = await this.reportsService.getGroupStockReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getGroupStockReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير بضاعة المجموعات",
      });
    }
  };
}

