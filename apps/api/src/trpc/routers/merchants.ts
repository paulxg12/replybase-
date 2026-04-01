import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";

export const merchantRouter = router({
  // Get current merchant by authenticated user
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        shopifyDomain: true,
        shopifyAccessToken: true,
        gorgiasSubdomain: true,
        syncStatus: true,
        lastSyncedAt: true,
        widgetConfig: true,
        widgetPublicKey: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Merchant not found",
      });
    }

    return {
      ...merchant,
      gorgiasDomain: merchant.gorgiasSubdomain,
      config: merchant.widgetConfig,
    };
  }),

  // Update widget configuration
  updateWidgetConfig: protectedProcedure
    .input(
      z.object({
        brandColor: z.string().optional(),
        brandName: z.string().optional(),
        initialMessage: z.string().optional(),
        placeholder: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true, widgetConfig: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      const currentConfig =
        merchant.widgetConfig &&
        typeof merchant.widgetConfig === "object" &&
        !Array.isArray(merchant.widgetConfig)
          ? (merchant.widgetConfig as Record<string, unknown>)
          : {};

      const updated = await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          widgetConfig: {
            ...currentConfig,
            ...input,
          },
        },
        select: { widgetConfig: true },
      });

      return updated.widgetConfig;
    }),

  // Get merchant statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
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

    // Get stats
    const [chatCount, ticketCount, chunkCount] = await Promise.all([
      prisma.chatSession.count({ where: { merchantId: merchant.id } }),
      prisma.ticket.count({ where: { merchantId: merchant.id } }),
      prisma.knowledgeChunk.count({
        where: { merchantId: merchant.id },
      }),
    ]);

    // Get chat volume last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentChats = await prisma.chatSession.count({
      where: {
        merchantId: merchant.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      totalChats: chatCount,
      totalTickets: ticketCount,
      totalKnowledgeChunks: chunkCount,
      recentChats30Days: recentChats,
    };
  }),

  // Complete onboarding (called after all integrations are set up)
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
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

    // Mark sync as ready (will be populated by BullMQ job)
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        syncStatus: "PENDING",
      },
    });

    return { success: true };
  }),

  // Update merchant profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update user name in auth table
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
        },
      });

      return { success: true, name: user.name };
    }),

  // Delete merchant account and all associated data
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
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

    // Delete all merchant data in cascade order
    // 1. Chat sessions (messages are stored as JSON within each session)
    await prisma.chatSession.deleteMany({
      where: { merchantId: merchant.id },
    });

    // 2. Knowledge chunks
    await prisma.knowledgeChunk.deleteMany({
      where: { merchantId: merchant.id },
    });

    // 3. Tickets
    await prisma.ticket.deleteMany({
      where: { merchantId: merchant.id },
    });

    // 4. Sync jobs
    await prisma.syncJob.deleteMany({
      where: { merchantId: merchant.id },
    });

    // 5. Subscriptions
    await prisma.subscription.deleteMany({
      where: { merchantId: merchant.id },
    });

    // 6. Merchant
    await prisma.merchant.delete({
      where: { id: merchant.id },
    });

    // 7. User
    await prisma.user.delete({
      where: { id: ctx.user.id },
    });

    return { success: true };
  }),
});
