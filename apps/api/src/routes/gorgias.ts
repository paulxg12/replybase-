import { Express, Request, Response } from "express";
import { prisma } from "@replybase/db";
import { apiSuccess, apiError } from "../lib/responses";
import { GorgiasClient, validateGorgiasCredentials } from "@replybase/gorgias";
import { validateShopifyCredentials } from "@replybase/shopify";
import { logError } from "../lib/logger";

export interface TestConnectionRequest extends Request {
  body: {
    subdomain: string;
    email: string;
    apiKey: string;
  };
}

export function registerGorgiasRoutes(app: Express) {
  app.post("/gorgias/test-connection", async (req: TestConnectionRequest, res: Response) => {
    try {
      const { subdomain, email, apiKey } = req.body;

      if (!subdomain || !email || !apiKey) {
        return res.status(400).json(
          apiError("INVALID_INPUT", "subdomain, email, and apiKey are required")
        );
      }

      const isValid = await validateGorgiasCredentials(subdomain, email, apiKey);

      if (!isValid) {
        return res.status(401).json(
          apiError("INVALID_CREDENTIALS", "Gorgias credentials are invalid")
        );
      }

      res.json(apiSuccess({ valid: true }));
    } catch (error) {
      logError("Gorgias test connection failed", error);
      res.status(500).json(
        apiError("ERROR", "Failed to test Gorgias connection")
      );
    }
  });
}
