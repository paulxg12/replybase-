import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// Helper: Generate a random API key in format "rk_test_XXXXXXXXXXXX"
function generateApiKeyString(): string {
  const prefix = "rk_test_";
  const randomPart = crypto.randomBytes(24).toString("hex");
  return prefix + randomPart;
}

// Helper: Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Helper: Get first 4 chars of key for display
function getKeyPrefix(key: string): string {
  return key.substring(0, 7); // "rk_test_" prefix (7 chars)
}

export const apiKeysRouter = router({
  // Generate a new API key
  generateApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        rateLimit: z.number().int().min(10).max(100000).default(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      // Generate the actual key
      const actualKey = generateApiKeyString();
      const keyHash = hashApiKey(actualKey);
      const keyPrefix = getKeyPrefix(actualKey);

      // Store hashed version
      await prisma.apiKey.create({
        data: {
          merchantId: merchant.id,
          name: input.name,
          keyHash,
          keyPrefix,
          rateLimit: input.rateLimit,
        },
      });

      // Return the actual key (only time user sees it)
      return {
        key: actualKey,
        prefix: keyPrefix,
        message: "Save this key somewhere safe. You won't be able to see it again!",
      };
    }),

  // List all non-revoked API keys
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: { id: true },
    });

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Merchant not found",
      });
    }

    const keys = await prisma.apiKey.findMany({
      where: {
        merchantId: merchant.id,
        revokedAt: null, // Only active keys
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        rateLimit: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return keys.map((key) => ({
      ...key,
      // Don't expose keyHash
      masked: `${key.keyPrefix}...`, // Display as "rk_test_..."
    }));
  }),

  // Revoke an API key (soft delete)
  revokeApiKey: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      // Verify key belongs to this merchant
      const key = await prisma.apiKey.findUnique({
        where: { id: input.keyId },
      });

      if (!key || key.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API key not found",
        });
      }

      // Soft delete by setting revokedAt
      await prisma.apiKey.update({
        where: { id: input.keyId },
        data: { revokedAt: new Date() },
      });

      return { success: true };
    }),

  // Get usage stats for a key
  getApiKeyUsage: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      const key = await prisma.apiKey.findUnique({
        where: { id: input.keyId },
      });

      if (!key || key.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API key not found",
        });
      }

      return {
        id: key.id,
        name: key.name,
        rateLimit: key.rateLimit,
        usageCount: key.usageCount,
        usagePercentage: Math.round((key.usageCount / key.rateLimit) * 100),
        lastUsedAt: key.lastUsedAt,
        isRevoked: key.revokedAt !== null,
      };
    }),

  // Update rate limit for a key
  updateApiKeyRateLimit: protectedProcedure
    .input(
      z.object({
        keyId: z.string(),
        newRateLimit: z.number().int().min(10).max(100000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      const key = await prisma.apiKey.findUnique({
        where: { id: input.keyId },
      });

      if (!key || key.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API key not found",
        });
      }

      await prisma.apiKey.update({
        where: { id: input.keyId },
        data: { rateLimit: input.newRateLimit },
      });

      return { success: true };
    }),

  // Helper: Verify API key (for backend use)
  // This is called by middleware to validate incoming API keys
  verifyApiKey: protectedProcedure
    .input(z.object({ keyHash: z.string() }))
    .query(async ({ input }) => {
      const key = await prisma.apiKey.findUnique({
        where: { keyHash: input.keyHash },
        select: {
          id: true,
          merchantId: true,
          rateLimit: true,
          usageCount: true,
          revokedAt: true,
        },
      });

      if (!key || key.revokedAt !== null) {
        return { valid: false };
      }

      return {
        valid: true,
        merchantId: key.merchantId,
        rateLimit: key.rateLimit,
        usageCount: key.usageCount,
      };
    }),
});
