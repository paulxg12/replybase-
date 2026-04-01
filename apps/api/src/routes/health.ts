import { Express, Request, Response } from "express";
import { prisma, validateEnv } from "@replybase/db";
import { apiSuccess, apiError } from "../lib/responses";
import { logError, logInfo } from "../lib/logger";

export function registerHealthRoutes(app: Express) {
  app.get("/health", async (_req: Request, res: Response) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;

      logInfo("Health check passed");
      res.json(apiSuccess({ status: "ok", timestamp: new Date().toISOString() }));
    } catch (error) {
      logError("Health check failed", error);
      res.status(503).json(
        apiError(
          "SERVICE_UNAVAILABLE",
          "Service is unavailable. Database connection failed."
        )
      );
    }
  });
}
