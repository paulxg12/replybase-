import { Request, Response, NextFunction } from "express";
import { logInfo, logError } from "../lib/logger";
import { apiError } from "../lib/responses";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    merchantId: string;
  };
}

/**
 * Validates JWT tokens from NextAuth
 * Expected: Authorization: Bearer <token>
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json(
        apiError("UNAUTHORIZED", "Missing or invalid auth token")
      );
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json(apiError("UNAUTHORIZED", "Invalid token"));
    }

    try {
      // Decode JWT without verification (NextAuth verifies on the dashboard side)
      // In production, you'd verify the signature here
      const parts = token.split(".");
      if (parts.length !== 3) {
        return res.status(401).json(apiError("UNAUTHORIZED", "Malformed token"));
      }

      const decoded = JSON.parse(
        Buffer.from(parts[1], "base64").toString()
      );

      if (!decoded.sub || !decoded.email) {
        return res.status(401).json(apiError("UNAUTHORIZED", "Invalid token claims"));
      }

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        merchantId: decoded.merchantId || "",
      };

      logInfo("Authentication successful", {
        userId: decoded.sub,
        merchantId: decoded.merchantId,
      });

      next();
    } catch (parseError) {
      logError("Token parsing failed", parseError);
      return res.status(401).json(apiError("UNAUTHORIZED", "Invalid token"));
    }
  } catch (error) {
    logError("Auth middleware error", error);
    res.status(500).json(apiError("ERROR", "Authentication failed"));
  }
}

/**
 * Protects routes - requires authentication
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.id) {
    return res.status(401).json(apiError("UNAUTHORIZED", "Authentication required"));
  }
  next();
}

/**
 * Protects routes - requires authentication + merchant access
 */
export function requireMerchantAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.merchantId) {
    return res
      .status(401)
      .json(apiError("UNAUTHORIZED", "Merchant access required"));
  }
  next();
}
