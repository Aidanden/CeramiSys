import { Request, Response } from "express";
import { ReportsService } from "../services/ReportsService";
import {
  SalesReportQueryDto,
  StockReportQueryDto,
  ProfitReportQueryDto,
  CustomerReportQueryDto,
  TopProductsReportQueryDto,
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
   * GET /api/reports/profit
   * تقرير الأرباح
   */
  getProfitReport = async (req: Request, res: Response): Promise<void> => {
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

      const validatedQuery = ProfitReportQueryDto.parse(req.query);
      const report = await this.reportsService.getProfitReport(validatedQuery, userCompanyId, isSystemUser);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error("Error in getProfitReport:", error);
      res.status(500).json({
        success: false,
        message: error.message || "حدث خطأ أثناء جلب تقرير الأرباح",
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
}
