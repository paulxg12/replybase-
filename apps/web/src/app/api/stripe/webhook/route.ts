import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * POST /api/stripe/webhook — Handle Stripe subscription events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_SIGNATURE", message: "Missing signature" } },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_SIGNATURE", message: "Invalid signature" } },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscription.id },
          update: {
            status: subscription.status,
            planId: subscription.items.data[0]?.price.id || "",
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          create: {
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            planId: subscription.items.data[0]?.price.id || "",
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            merchantId: await getMerchantIdByCustomer(subscription.customer as string),
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: { status: "active" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: { status: "past_due" },
          });

          // Create notification for the merchant
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: invoice.subscription as string },
          });
          if (sub) {
            await prisma.notification.create({
              data: {
                merchantId: sub.merchantId,
                title: "Payment Failed",
                description: "Your subscription payment failed. Please update your payment method.",
                type: "payment_failed",
                actionUrl: "/dashboard/settings",
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    );
  }
}

async function getMerchantIdByCustomer(stripeCustomerId: string): Promise<string> {
  const existing = await prisma.subscription.findFirst({
    where: { stripeCustomerId },
    select: { merchantId: true },
  });
  if (existing) return existing.merchantId;

  // Fallback: find first merchant without a subscription
  const merchant = await prisma.merchant.findFirst({
    where: { subscription: null },
    select: { id: true },
  });
  return merchant?.id || "";
}
