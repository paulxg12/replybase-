import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const billingRouter = router({
  // Get current subscription
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
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

    const subscription = await prisma.subscription.findUnique({
      where: { merchantId: merchant.id },
    });

    if (!subscription) {
      return {
        plan: "free",
        status: "active",
        monthlyConversations: 100,
        monthlyConversationsUsed: 0,
        renewsAt: null,
        features: {
          knowledgeChunks: 100,
          weeklySync: false,
          webhooks: false,
        },
      };
    }

    // Get monthly conversation count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyConversationsUsed = await prisma.chatSession.count({
      where: {
        merchantId: merchant.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Get plan limits
    const planLimits: Record<string, { monthly: number; chunks: number; weekly: boolean; webhooks: boolean }> = {
      starter: {
        monthly: 1000,
        chunks: 1000,
        weekly: true,
        webhooks: false,
      },
      professional: {
        monthly: 10000,
        chunks: 10000,
        weekly: true,
        webhooks: true,
      },
      enterprise: {
        monthly: Infinity,
        chunks: Infinity,
        weekly: true,
        webhooks: true,
      },
    };

    const limits = planLimits[subscription.planId] || planLimits.starter;

    return {
      plan: subscription.planId,
      status: subscription.status,
      monthlyConversations: limits.monthly,
      monthlyConversationsUsed,
      renewsAt: subscription.currentPeriodEnd,
      features: {
        knowledgeChunks: limits.chunks,
        weeklySync: limits.weekly,
        webhooks: limits.webhooks,
      },
    };
  }),

  // Create checkout session
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["starter", "professional", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

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
        // Plan IDs (should be configured in Stripe dashboard)
        const planIds: Record<string, string> = {
          starter: process.env.STRIPE_PLAN_STARTER_ID || "price_starter",
          professional:
            process.env.STRIPE_PLAN_PROFESSIONAL_ID || "price_professional",
          enterprise:
            process.env.STRIPE_PLAN_ENTERPRISE_ID || "price_enterprise",
        };

        const existingSubscription = await prisma.subscription.findUnique({
          where: { merchantId: merchant.id },
          select: { stripeCustomerId: true },
        });

        // Create or get customer
        let customerId = existingSubscription?.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              merchantId: merchant.id,
            },
          });
          customerId = customer.id;
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: planIds[input.plan],
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
        });

        return {
          url: session.url,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),

  // Create portal session
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: { id: true },
    });

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription",
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { merchantId: merchant.id },
      select: { stripeCustomerId: true },
    });

    if (!subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription",
      });
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create portal session",
      });
    }
  }),

  // Get plans
  getPlans: protectedProcedure.query(() => {
    return [
      {
        id: "free",
        name: "Free",
        description: "Perfect for getting started",
        price: 0,
        monthlyConversations: 100,
        knowledgeChunks: 100,
        weeklySync: false,
        webhooks: false,
      },
      {
        id: "starter",
        name: "Starter",
        description: "For small to medium teams",
        price: 99,
        monthlyConversations: 1000,
        knowledgeChunks: 1000,
        weeklySync: true,
        webhooks: false,
      },
      {
        id: "professional",
        name: "Professional",
        description: "For growing businesses",
        price: 299,
        monthlyConversations: 10000,
        knowledgeChunks: 10000,
        weeklySync: true,
        webhooks: true,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "Unlimited everything",
        price: null,
        monthlyConversations: Infinity,
        knowledgeChunks: Infinity,
        weeklySync: true,
        webhooks: true,
        cta: "Contact Sales",
      },
    ];
  }),
});
