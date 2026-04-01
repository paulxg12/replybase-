import { prisma } from "@replybase/db";

interface CreateNotificationParams {
  merchantId: string;
  title: string;
  description?: string;
  type: "sync_complete" | "new_chat" | "payment_failed" | "widget_install" | string;
  actionUrl?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        merchantId: params.merchantId,
        title: params.title,
        description: params.description || null,
        type: params.type,
        actionUrl: params.actionUrl || null,
      },
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    // Don't throw - notifications shouldn't break the main flow
  }
}

export async function getNotificationSummary(merchantId: string) {
  const notification = await prisma.notification.findFirst({
    where: { merchantId, read: false },
    orderBy: { createdAt: "desc" },
  });

  return notification;
}

/**
 * Emit notifications when specific events occur
 * These are called from various places in the app (webhooks, jobs, etc.)
 */

export const NotificationEvents = {
  /**
   * Called when a sync job completes successfully
   */
  syncComplete: async (merchantId: string, ticketCount: number) => {
    await createNotification({
      merchantId,
      title: "Sync Complete ✅",
      description: `Successfully synchronized ${ticketCount} ticket(s)`,
      type: "sync_complete",
      actionUrl: "/dashboard/sync",
    });
  },

  /**
   * Called when a new chat message arrives
   */
  newChat: async (merchantId: string, visitorName?: string) => {
    const displayName = visitorName || "New Visitor";
    await createNotification({
      merchantId,
      title: "New Chat Message",
      description: `Message from ${displayName}`,
      type: "new_chat",
      actionUrl: "/dashboard/conversations",
    });
  },

  /**
   * Called when a payment fails
   */
  paymentFailed: async (merchantId: string, amount?: number) => {
    const amountText = amount ? ` for $${(amount / 100).toFixed(2)}` : "";
    await createNotification({
      merchantId,
      title: "Payment Failed ⚠️",
      description: `Payment processing failed${amountText}. Please update your payment method.`,
      type: "payment_failed",
      actionUrl: "/dashboard/billing",
    });
  },

  /**
   * Called when the widget is installed on a store
   */
  widgetInstalled: async (merchantId: string) => {
    await createNotification({
      merchantId,
      title: "Widget Installed 🚀",
      description: "Your chat widget is now live on your store",
      type: "widget_install",
      actionUrl: "/dashboard/widget",
    });
  },

  /**
   * Called when sync job fails
   */
  syncFailed: async (merchantId: string, error?: string) => {
    const errorText = error ? `: ${error}` : "";
    await createNotification({
      merchantId,
      title: "Sync Failed ❌",
      description: `Your sync job failed${errorText}. Check the logs for details.`,
      type: "sync_failed",
      actionUrl: "/dashboard/sync",
    });
  },

  /**
   * Called when integration is disconnected
   */
  integrationDisconnected: async (
    merchantId: string,
    integration: "shopify" | "gorgias"
  ) => {
    const integrationName = integration === "shopify" ? "Shopify" : "Gorgias";
    await createNotification({
      merchantId,
      title: `${integrationName} Disconnected`,
      description: `Your ${integrationName} integration has been disconnected. Please reconnect.`,
      type: "integration_disconnected",
      actionUrl: "/dashboard/settings",
    });
  },
};
