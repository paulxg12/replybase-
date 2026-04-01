import { Express, Request, Response } from "express";
import { prisma } from "@replybase/db";
import { apiSuccess, apiError } from "../lib/responses";
import { logError } from "../lib/logger";

export interface WidgetConfigRequest extends Request {
  params: {
    publicKey: string;
  };
}

export function registerWidgetRoutes(app: Express) {
  // Public endpoint - no auth required
  app.get(
    "/widget/:publicKey/config",
    async (req: WidgetConfigRequest, res: Response) => {
      try {
        const { publicKey } = req.params;

        const merchant = await prisma.merchant.findUnique({
          where: { widgetPublicKey: publicKey },
          select: {
            widgetConfig: true,
            syncStatus: true,
            id: true,
          },
        });

        if (!merchant) {
          return res.status(404).json(
            apiError("MERCHANT_NOT_FOUND", "Widget not found")
          );
        }

        if (merchant.syncStatus !== "READY") {
          return res.status(503).json(
            apiError(
              "MERCHANT_NOT_READY",
              "Merchant is not ready to serve chats"
            )
          );
        }

        res.json(apiSuccess(merchant.widgetConfig));
      } catch (error) {
        logError("Widget config fetch failed", error);
        res.status(500).json(
          apiError("ERROR", "Failed to fetch widget config")
        );
      }
    }
  );
}
