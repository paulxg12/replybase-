import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { prisma } from "@replybase/db";
import { TRPCError } from "@trpc/server";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

const syncQueue = new Queue("sync", { connection: redis });

function mapJobStatus(status: string): "PENDING" | "SYNCING" | "READY" | "ERROR" {
  switch (status) {
    case "RUNNING":
      return "SYNCING";
    case "COMPLETED":
      return "READY";
    case "FAILED":
      return "ERROR";
    default:
      return "PENDING";
  }
}

function formatSyncJobForDashboard(job: {
  id: string;
  status: string;
  progress: number;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}) {
  return {
    id: job.id,
    status: mapJobStatus(job.status),
    progress: job.progress,
    ticketsFetched: null as number | null,
    chunksCreated: null as number | null,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.finishedAt,
  };
}

export const syncRouter = router({
  // Get current sync status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        syncStatus: true,
        lastSyncedAt: true,
      },
    });

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Merchant not found",
      });
    }

    // Get the last sync job
    const lastJob = await prisma.syncJob.findFirst({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        progress: true,
        error: true,
        createdAt: true,
        finishedAt: true,
      },
    });

    // Check if there's an active job
    const activeJobs = await syncQueue.getJobs(["active"]);
    const isCurrentlySyncing = activeJobs.some(
      (job) => job.data.merchantId === merchant.id
    );

    return {
      status: merchant.syncStatus,
      lastSyncedAt: merchant.lastSyncedAt,
      lastJob: lastJob ? formatSyncJobForDashboard(lastJob) : null,
      isCurrentlySyncing,
    };
  }),

  // Manually trigger a sync
  triggerManualSync: protectedProcedure.mutation(async ({ ctx }) => {
    const merchant = await prisma.merchant.findFirst({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        syncStatus: true,
        shopifyDomain: true,
        shopifyAccessToken: true,
        gorgiasSubdomain: true,
        gorgiasApiEmail: true,
        gorgiasApiKey: true,
      },
    });

    if (!merchant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Merchant not found",
      });
    }

    // Check if Shopify and Gorgias are configured
    if (
      !merchant.shopifyDomain ||
      !merchant.shopifyAccessToken ||
      !merchant.gorgiasSubdomain ||
      !merchant.gorgiasApiEmail ||
      !merchant.gorgiasApiKey
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Shopify and Gorgias must be configured before syncing",
      });
    }

    try {
      // Create a sync job record
      const syncJob = await prisma.syncJob.create({
        data: {
          merchantId: merchant.id,
          type: "INITIAL_TICKETS",
          status: "PENDING",
        },
      });

      // Queue the sync job
      await syncQueue.add(
        "sync",
        {
          merchantId: merchant.id,
          syncJobId: syncJob.id,
          manual: true,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );

      // Update merchant status
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { syncStatus: "SYNCING" },
      });

      return {
        success: true,
        syncJobId: syncJob.id,
        message: "Sync job queued",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to queue sync job",
      });
    }
  }),

  // Get sync history
  getHistory: protectedProcedure
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      const jobs = await prisma.syncJob.findMany({
        where: { merchantId: merchant.id },
        select: {
          id: true,
          status: true,
          progress: true,
          error: true,
          createdAt: true,
          finishedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return jobs.map(formatSyncJobForDashboard);
    }),

  // Get sync job details
  getJobDetails: protectedProcedure
    .input(z.object({ jobId: z.string() }))
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

      const job = await prisma.syncJob.findUnique({
        where: { id: input.jobId },
      });

      if (!job || job.merchantId !== merchant.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return job;
    }),
});
