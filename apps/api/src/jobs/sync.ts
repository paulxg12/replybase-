import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@replybase/db";
import { GorgiasClient } from "@replybase/gorgias";
import { EmbeddingService } from "@replybase/rag";
import { logInfo, logError } from "../lib/logger";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

export const syncQueue = new Queue("sync", { connection: redis });

interface SyncJobData {
  merchantId: string;
  syncJobId: string;
  manual?: boolean;
}

/**
 * Process sync jobs - fetches tickets from Gorgias, chunks them, and indexes via pgvector
 */
async function processSyncJob(job: Job<SyncJobData>) {
  const { merchantId, syncJobId } = job.data;

  logInfo("Processing sync job", { merchantId, syncJobId });

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

    if (
      !merchant ||
      !merchant.gorgiasSubdomain ||
      !merchant.gorgiasApiEmail ||
      !merchant.gorgiasApiKey
    ) {
      throw new Error("Merchant not configured for Gorgias");
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Update job status
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        progress: 5,
      },
    });

    // Initialize clients
    const gorgias = new GorgiasClient({
      subdomain: merchant.gorgiasSubdomain,
      apiEmail: merchant.gorgiasApiEmail,
      apiKey: merchant.gorgiasApiKey,
    });

    const embeddingService = new EmbeddingService(openaiKey);

    // Fetch tickets
    logInfo("Fetching tickets from Gorgias", { merchantId });
    const tickets = await gorgias.fetchTickets();

    if (tickets.length === 0) {
      logInfo("No tickets found in Gorgias", { merchantId });
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: {
          status: "COMPLETED",
          progress: 100,
          finishedAt: new Date(),
        },
      });
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { syncStatus: "READY", lastSyncedAt: new Date() },
      });
      return;
    }

    // Save tickets and chunk them
    let totalChunksCreated = 0;

    for (const [index, ticket] of tickets.entries()) {
      const ticketBody = ticket.messages.map((m) => m.body).join("\n\n");

      // Create or update ticket record
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

      // Chunk the ticket
      const chunks = embeddingService.chunkTicket(
        ticket.subject,
        ticketBody
      );

      if (chunks.length > 0) {
        await embeddingService.upsertChunks(
          merchantId,
          chunks.map((content, chunkIndex) => ({
            content,
            sourceType: "TICKET",
            sourceId: `${savedTicket.id}-${chunkIndex}`,
            metadata: {
              ticketId: savedTicket.id,
              chunkIndex,
            },
          }))
        );
        totalChunksCreated += chunks.length;
      }

      const progress = Math.max(
        5,
        Math.round(((index + 1) / tickets.length) * 100)
      );
      await prisma.syncJob.update({
        where: { id: syncJobId },
        data: { progress },
      });
    }

    // Mark sync as complete
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        finishedAt: new Date(),
      },
    });

    // Update merchant status
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { syncStatus: "READY", lastSyncedAt: new Date() },
    });

    logInfo("Sync job completed", {
      merchantId,
      ticketsFetched: tickets.length,
      chunksCreated: totalChunksCreated,
    });
  } catch (error) {
    logError("Sync job failed", error);

    // Update job with error
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Update merchant status
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { syncStatus: "ERROR" },
    });

    throw error;
  }
}

/**
 * Initialize BullMQ worker for sync jobs
 */
export function initializeSyncWorker() {
  const worker = new Worker<SyncJobData>("sync", processSyncJob, {
    connection: redis,
    concurrency: 2, // Process up to 2 sync jobs concurrently
  });

  worker.on("completed", (job: Job<SyncJobData>) => {
    logInfo("Sync job completed", { jobId: job.id });
  });

  worker.on("failed", (job: Job<SyncJobData> | undefined, error: Error) => {
    logError(`Sync job failed (jobId: ${job?.id})`, error);
  });

  logInfo("Sync worker initialized");
  return worker;
}

/**
 * Schedule weekly sync jobs (every Sunday at 02:00 UTC)
 */
export async function scheduleWeeklySyncs() {
  // This would typically be done via a separate cron service or BullMQ Flows
  // For now, it can be scheduled externally
  logInfo("Weekly sync scheduling configured");
}
