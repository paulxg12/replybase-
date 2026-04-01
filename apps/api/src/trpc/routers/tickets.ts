import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";
import { EmbeddingService } from "@replybase/rag";

export const ticketsRouter = router({
  // List knowledge chunks for a merchant
  listChunks: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        sourceType: z.enum(["TICKET", "WEBSITE_CRAWL", "MANUAL"]).optional(),
      })
    )
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

      const where: any = { merchantId: merchant.id };
      if (input.sourceType) {
        where.sourceType = input.sourceType;
      }

      const [chunks, total] = await Promise.all([
        prisma.knowledgeChunk.findMany({
          where,
          select: {
            id: true,
            content: true,
            sourceType: true,
            sourceId: true,
            createdAt: true,
          },
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.knowledgeChunk.count({ where }),
      ]);

      return {
        chunks,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get single chunk
  getChunk: protectedProcedure
    .input(z.object({ chunkId: z.string() }))
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

      const chunk = await prisma.knowledgeChunk.findUnique({
        where: { id: input.chunkId },
      });

      if (!chunk || chunk.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chunk not found",
        });
      }

      return chunk;
    }),

  // Delete knowledge chunk
  deleteChunk: protectedProcedure
    .input(z.object({ chunkId: z.string() }))
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

      const chunk = await prisma.knowledgeChunk.findUnique({
        where: { id: input.chunkId },
      });

      if (!chunk || chunk.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chunk not found",
        });
      }

      await prisma.knowledgeChunk.delete({ where: { id: input.chunkId } });

      return { success: true };
    }),

  // Add manual knowledge chunk
  addManualChunk: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(10000),
        category: z.string().optional(),
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

      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("OPENAI_API_KEY not configured");
        }

        const embeddingService = new EmbeddingService(openaiKey);
        const sourceId = `manual-${Date.now()}`;

        await embeddingService.upsertChunks(merchant.id, [
          {
            content: input.content,
            sourceType: "MANUAL",
            sourceId,
            metadata: {
              category: input.category || "General",
              addedBy: ctx.user.id,
            },
          },
        ]);

        const chunk = await prisma.knowledgeChunk.findFirst({
          where: {
            merchantId: merchant.id,
            sourceType: "MANUAL",
            sourceId,
          },
        });

        if (!chunk) {
          throw new Error("Chunk creation failed");
        }

        return chunk;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add chunk",
        });
      }
    }),

  // Search chunks (for the knowledge management page)
  searchChunks: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(10),
      })
    )
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

      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("OPENAI_API_KEY not configured");
        }

        const embeddingService = new EmbeddingService(openaiKey);

        // Query vector search
        const results = await embeddingService.queryChunks(
          merchant.id,
          input.query,
          input.limit
        );

        return results;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Search failed",
        });
      }
    }),
});
