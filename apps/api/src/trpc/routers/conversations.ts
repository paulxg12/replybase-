import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";

export const conversationsRouter = router({
  // List chat sessions for merchant
  listSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        escalatedOnly: z.boolean().default(false),
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
      if (input.escalatedOnly) {
        where.escalated = true;
      }

      const [sessions, total] = await Promise.all([
        prisma.chatSession.findMany({
          where,
          select: {
            id: true,
            visitorId: true,
            escalated: true,
            createdAt: true,
            updatedAt: true,
          },
          take: input.limit,
          skip: input.offset,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.chatSession.count({ where }),
      ]);

      return {
        sessions,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get single session with all messages
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
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

      const session = await prisma.chatSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return session;
    }),

  // Get session with full message history
  getWithMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
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

      const session = await prisma.chatSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      return {
        session,
        messages: (session.messages as any[]) || [],
      };
    }),

  // Mark session as resolved
  markResolved: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
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

      const session = await prisma.chatSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { escalated: false, updatedAt: new Date() },
      });

      return { success: true };
    }),

  // Get escalation statistics
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

    const totalSessions = await prisma.chatSession.count({
      where: { merchantId: merchant.id },
    });

    const escalatedSessions = await prisma.chatSession.count({
      where: { merchantId: merchant.id, escalated: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await prisma.chatSession.count({
      where: {
        merchantId: merchant.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      totalSessions,
      escalatedSessions,
      escalationRate: totalSessions > 0 ? escalatedSessions / totalSessions : 0,
      sessionsLast30Days: recentSessions,
    };
  }),
});
