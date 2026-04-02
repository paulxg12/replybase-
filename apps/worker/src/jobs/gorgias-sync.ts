import { prisma } from "@replybase/db";
import { GorgiasClient } from "@replybase/gorgias";
import { EmbeddingService } from "@replybase/rag";

interface SyncJobData {
  merchantId: string;
  syncJobId: string;
  manual?: boolean;
}

/**
 * GorgiasSync job: fetch tickets from Gorgias API → chunk + embed → upsert into pgvector
 */
export async function processGorgiasSync(data: SyncJobData) {
  const { merchantId, syncJobId } = data;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        gorgiasSubdomain: true,
        gorgiasApiEmail: true,
        gorgiasApiKey: true,
      },
    });

    if (!merchant?.gorgiasSubdomain || !merchant?.gorgiasApiKey) {
      throw new Error("Merchant not configured for Gorgias");
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    // Update job status
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: { status: "RUNNING", startedAt: new Date(), progress: 5 },
    });

    const gorgias = new GorgiasClient({
      subdomain: merchant.gorgiasSubdomain,
      apiEmail: merchant.gorgiasApiEmail,
      apiKey: merchant.gorgiasApiKey,
    });

    const embeddingService = new EmbeddingService(openaiKey);

    // Fetch tickets
    const tickets = await gorgias.fetchTickets();

    if (tickets.length === 0) {
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: { status: "COMPLETED", progress: 100, finishedAt: new Date() },
      });
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { syncStatus: "READY", lastSyncedAt: new Date() },
      });
      return;
    }

    let totalChunksCreated = 0;

    for (const [index, ticket] of tickets.entries()) {
      const ticketBody = ticket.messages.map((m: any) => m.body).join("\n\n");

      const savedTicket = await prisma.ticket.upsert({
        where: {
          merchantId_gorgiasTicketId: {
            merchantId,
            gorgiasTicketId: ticket.id,
          },
        },
        update: {
          subject: ticket.subject,
          messages: ticket.messages,
          tags: ticket.tags ?? [],
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null,
        },
        create: {
          merchantId,
          gorgiasTicketId: ticket.id,
          subject: ticket.subject,
          messages: ticket.messages,
          tags: ticket.tags ?? [],
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null,
        },
      });

      const chunks = embeddingService.chunkTicket(ticket.subject, ticketBody);

      if (chunks.length > 0) {
        await embeddingService.upsertChunks(
          merchantId,
          chunks.map((content: string, chunkIndex: number) => ({
            content,
            sourceType: "TICKET" as const,
            sourceId: `${savedTicket.id}-${chunkIndex}`,
            metadata: { ticketId: savedTicket.id, chunkIndex },
          }))
        );
        totalChunksCreated += chunks.length;
      }

      const progress = Math.max(5, Math.round(((index + 1) / tickets.length) * 100));
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: { progress },
      });
    }

    // Mark complete
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: { status: "COMPLETED", progress: 100, finishedAt: new Date() },
    });

    await prisma.merchant.update({
      where: { id: merchantId },
      data: { syncStatus: "READY", lastSyncedAt: new Date() },
    });

    console.log(`Sync completed: ${tickets.length} tickets, ${totalChunksCreated} chunks`);
  } catch (error) {
    console.error("Sync job failed:", error);

    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    await prisma.merchant.update({
      where: { id: merchantId },
      data: { syncStatus: "ERROR" },
    });

    throw error;
  }
}
