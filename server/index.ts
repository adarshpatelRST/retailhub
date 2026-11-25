import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./utils/logger";
import { auditMiddleware } from "./middleware/audit-middleware";
import { runDatabaseSeed } from "./seed";
import { seedFullInventoryCoverage } from "./seed-inventory-coverage";
import { backgroundScheduler } from "./services/background-scheduler";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import productsRoutes from "./routes/products";
import categoriesRoutes from "./routes/categories";
import brandsRoutes from "./routes/brands";
import storesRoutes from "./routes/stores";
import inventoryRoutes from "./routes/inventory";
import transfersRoutes from "./routes/transfers";
import actionCenterRoutes from "./routes/action-center";
import dashboardRoutes from "./routes/dashboard";
import reportsRoutes from "./routes/reports";
import salesRoutes from "./routes/sales";
import regionsRoutes from "./routes/regions";
import auditRoutes from "./routes/audit";
import configurationsRoutes from "./routes/configurations";

const app = express();

// 1. Core Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-Id", "Accept"],
    exposedHeaders: ["X-Correlation-Id"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(auditMiddleware);

// 2. Health Check
app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    environment: config.app.env,
    timestamp: new Date().toISOString(),
  });
});

// 3. API Route Mounting
const apiRouters = [
  { path: "/auth", router: authRoutes },
  { path: "/users", router: usersRoutes },
  { path: "/products", router: productsRoutes },
  { path: "/categories", router: categoriesRoutes },
  { path: "/brands", router: brandsRoutes },
  { path: "/stores", router: storesRoutes },
  { path: "/inventory", router: inventoryRoutes },
  { path: "/transfers", router: transfersRoutes },
  { path: "/recommendations", router: actionCenterRoutes },
  { path: "/action-center", router: actionCenterRoutes },
  { path: "/intelligence", router: actionCenterRoutes },
  { path: "/dashboard", router: dashboardRoutes },
  { path: "/dashboards", router: dashboardRoutes },
  { path: "/reports", router: reportsRoutes },
  { path: "/sales", router: salesRoutes },
  { path: "/regions", router: regionsRoutes },
  { path: "/audit", router: auditRoutes },
  { path: "/configurations", router: configurationsRoutes },
];

for (const { path: routePath, router } of apiRouters) {
  app.use(`/api/v1${routePath}`, router);
  app.use(`/api${routePath}`, router);
}

// 4. Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "An unexpected error occurred.";

  if (statusCode >= 500) {
    logger.error(`[${req.method} ${req.path}] Unhandled error:`, err);
  } else {
    logger.warn(`[${req.method} ${req.path}] (${statusCode} ${code}): ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details,
    },
    path: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
  });
});

// 5. Bootstrap Server
async function startServer() {
  try {
    // Attempt baseline database seeding (safe in dev, preserve existing records)
    await runDatabaseSeed({ cleanReset: false }).catch((err) => {
      logger.warn("Database seed skipped or pending database connectivity:", err.message);
    });
    await seedFullInventoryCoverage().catch((err) => {
      logger.warn("Inventory coverage seed skipped:", err.message);
    });

    const server = app.listen(config.app.port, "0.0.0.0", () => {
      logger.info(`RetailHub Enterprise Express API running on http://localhost:${config.app.port}/api/v1`);
      logger.info(`Health check probe available at http://localhost:${config.app.port}/api/v1/health`);

      // Start automated background rebalance scheduler
      backgroundScheduler.start();
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info("Gracefully shutting down RetailHub API server...");
      backgroundScheduler.stop();
      server.close(() => {
        logger.info("Server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logger.error("Failed to start RetailHub API server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
