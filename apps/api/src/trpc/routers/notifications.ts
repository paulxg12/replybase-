import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const notificationRouter = router({
  // Get recent notifications (unread first)
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const merchant = await prisma.merchant.findFirst({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!merchant) {
        return { notifications: [], unreadCount: 0 };
      }

      const notifications = await prisma.notification.findMany({
        where: { merchantId: merchant.id },
        orderBy: [{ read: "asc" }, { createdAt: "desc" }],
        take: input.limit,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          read: true,
          createdAt: true,
          actionUrl: true,
        },
      });

      const unreadCount = await prisma.notification.count({
        where: { merchantId: merchant.id, read: false },
      });

      return {
        notifications,
        unreadCount,
      };
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
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

      await prisma.notification.updateMany({
        where: {
          id: input.notificationId,
          merchantId: merchant.id,
        },
        data: { read: true },
      });

      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
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

    await prisma.notification.updateMany({
      where: {
        merchantId: merchant.id,
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }),

  // Get unread count (for badge)
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: { id: true },
    });

    if (!merchant) {
      return { unreadCount: 0 };
    }

    const unreadCount = await prisma.notification.count({
      where: { merchantId: merchant.id, read: false },
    });

    return { unreadCount };
  }),
});
