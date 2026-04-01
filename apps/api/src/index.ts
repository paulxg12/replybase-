require("dotenv").config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { validateEnv, prisma } from "@replybase/db";
import { errorHandler } from "./lib/responses";
import { logInfo, logError } from "./lib/logger";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerHealthRoutes } from "./routes/health";
import { registerGorgiasRoutes } from "./routes/gorgias";
import { registerWidgetRoutes } from "./routes/widget";
import { registerChatRoutes } from "./routes/chat";
import { authMiddleware, requireAuth } from "./middleware/auth";
import { appRouter } from "./trpc";
import { createTRPCContext, TRPCRequest } from "./trpc/trpc";
import { initializeSyncWorker } from "./jobs/sync";

async function bootstrap() {
  // Validate environment variables
  logInfo("Validating environment variables...");
  validateEnv();

  // Initialize Express app
  const app = express();
  const PORT = process.env.PORT || 4000;

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);

  // Test database connection
  try {
    logInfo("Connecting to database...");
    await prisma.$queryRaw`SELECT 1`;
    logInfo("✓ Database connection successful");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      logError("Failed to connect to database", error);
      process.exit(1);
    } else {
      logInfo("⚠️  Development mode: Skipping database connection check");
    }
  }

  // Initialize BullMQ worker for sync jobs
  try {
    logInfo("Initializing sync job worker...");
    initializeSyncWorker();
    logInfo("✓ Sync worker initialized");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      logError("Failed to initialize sync worker", error);
      process.exit(1);
    } else {
      logInfo("⚠️  Development mode: Skipping sync worker (BullMQ/Redis not available)");
    }
  }

  // Auth middleware for all routes except health and webhooks
  app.use((req, res, next) => {
    if (
      req.path === "/health" ||
      req.path === "/gorgias/webhook" ||
      req.path.startsWith("/trpc")
    ) {
      return next();
    }
    authMiddleware(req, res, next);
  });

  // Routes
  registerHealthRoutes(app);
  registerGorgiasRoutes(app);
  registerWidgetRoutes(app);
  registerChatRoutes(app);

  // tRPC routes
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => {
        const req = opts.req as TRPCRequest;
        return createTRPCContext(req);
      },
      onError: ({ error, path }) => {
        logError(`tRPC error on ${path}`, error);
      },
    })
  );

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: "NOT_FOUND", message: "Endpoint not found" },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  // Start server
  app.listen(PORT, () => {
    logInfo(`✓ API server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  logError("Bootstrap failed", error);
  process.exit(1);
});
