import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
/*ROUTE IMPORT*/
import authRoute from "./routes/authRoute";
import usersRoute from "./routes/usersRoute";
import companyRoutes from "./routes/companyRoutes";
import productRoutes from "./routes/productRoutes";
import salesRoutes from "./routes/salesRoutes";
import salePaymentRoutes from "./routes/salePaymentRoutes";
import interCompanySaleRoutes from "./routes/interCompanySaleRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import purchaseExpenseRoutes from "./routes/purchaseExpense.routes";
import paymentReceiptRoutes from './routes/paymentReceipt.routes';
import supplierAccountRoutes from './routes/supplierAccount.routes';
import activityRoutes from "./routes/activityRoutes";
import complexInterCompanySaleRoutes from "./routes/complexInterCompanySaleRoutes";
import reportsRoute from "./routes/reportsRoute";
import notificationRoutes from "./routes/notificationRoutes";
import provisionalSalesRoutes from "./routes/provisionalSalesRoutes";
import saleReturnRoutes from "./routes/saleReturnRoutes";
import warehouseRoutes from "./routes/warehouseRoutes";
import customerAccountRoutes from "./routes/customerAccountRoutes";
import damageReportRoutes from "./routes/damageReportRoutes";
import screensRoute from "./routes/screensRoute";
import externalStoreRoutes from "./routes/externalStoreRoutes";
import externalStoreAuthRoutes from "./routes/externalStoreAuthRoutes";
import externalStorePortalRoutes from "./routes/externalStorePortalRoutes";
import externalStoreInvoiceRoutes from "./routes/externalStoreInvoiceRoutes";


/*CONFIGRATION*/
dotenv.config();
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3030",
  credentials: true
}));

// Compression middleware - تقليل حجم البيانات بنسبة 70-90%
app.use(compression({
  level: 6, // توازن بين السرعة والضغط
  threshold: 1024, // فقط للبيانات أكبر من 1KB
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Optimized caching for better performance
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    // تحسين الـ cache بناءً على نوع البيانات
    const path = req.path;

    // بيانات ثابتة - cache طويل (5 دقائق)
    if (path.includes('/products') || path.includes('/company') || path.includes('/users')) {
      res.set('Cache-Control', 'public, max-age=300');
    }
    // بيانات متغيرة - cache متوسط (1 دقيقة)
    else if (path.includes('/sales') || path.includes('/purchases') || path.includes('/warehouse')) {
      res.set('Cache-Control', 'public, max-age=60');
    }
    // بيانات حساسة - بدون cache
    else if (path.includes('/auth') || path.includes('/permissions')) {
      res.set('Cache-Control', 'private, no-cache');
    }
    // افتراضي - cache قصير
    else {
      res.set('Cache-Control', 'public, max-age=30');
    }
  } else {
    res.set('Cache-Control', 'no-cache');
  }
  next();
});

// Simplified request logging for production performance
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

/*ROUTE */
app.use('/api/auth', authRoute);
// External Stores Routes - Must be before generic /api routes
app.use('/api/external-stores', externalStoreRoutes);
app.use('/api/store-portal', externalStoreAuthRoutes);
app.use('/api/store-portal', externalStorePortalRoutes);
app.use('/api/external-store-invoices', externalStoreInvoiceRoutes);

app.use('/api/users', usersRoute);
app.use('/api/company', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sale-payments', salePaymentRoutes);
app.use('/api/inter-company-sales', interCompanySaleRoutes);
app.use('/api', purchaseRoutes);
app.use('/api/purchase-expenses', purchaseExpenseRoutes);
app.use('/api/payment-receipts', paymentReceiptRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/complex-inter-company-sales', complexInterCompanySaleRoutes);
app.use('/api/reports', reportsRoute);
app.use('/api/notifications', notificationRoutes);
app.use('/api/provisional-sales', provisionalSalesRoutes);
app.use('/api/sale-returns', saleReturnRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/customer-accounts', customerAccountRoutes);
app.use('/api/supplier-accounts', supplierAccountRoutes);
app.use('/api/damage-reports', damageReportRoutes);
app.use('/api', screensRoute);
// External Stores Routes moved up


// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error("Error details:", err);
  console.error("Error stack:", err.stack);

  // Handle JSON parsing errors specifically
  if (err.type === 'entity.parse.failed') {
    console.error("JSON Parse Error - Raw body:", err.body);
    res.status(400).json({
      error: "Invalid JSON format",
      details: err.message,
      position: err.message.match(/position (\d+)/)?.[1] || 'unknown'
    });
    return;
  }

  res.status(500).json({ error: "Something went wrong!", details: err.message });
});

/*SERVER */
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
