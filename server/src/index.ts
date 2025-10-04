import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
/*ROUTE IMPORT*/
import authRoute from "./routes/authRoute";
import usersRoute from "./routes/usersRoute";
import companyRoutes from "./routes/companyRoutes";
import productRoutes from "./routes/productRoutes";
import salesRoutes from "./routes/salesRoutes";
import salePaymentRoutes from "./routes/salePaymentRoutes";
import interCompanySaleRoutes from "./routes/interCompanySaleRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import activityRoutes from "./routes/activityRoutes";
import complexInterCompanySaleRoutes from "./routes/complexInterCompanySaleRoutes";


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
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Optimized caching for better performance
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=5');
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
app.use('/api/users', usersRoute);
app.use('/api/company', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sale-payments', salePaymentRoutes);
app.use('/api/inter-company-sales', interCompanySaleRoutes);
app.use('/api', purchaseRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/complex-inter-company-sales', complexInterCompanySaleRoutes);


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
