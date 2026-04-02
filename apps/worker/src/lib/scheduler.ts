import { Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@replybase/db";

/**
 * Schedule weekly repeatable BullMQ jobs for all merchants
 */
export async function scheduleWeeklyJobs(redis: Redis) {
  const syncQueue = new Queue("sync", { connection: redis });
  const crawlQueue = new Queue("crawl", { connection: redis });

  // Schedule Gorgias sync — every Sunday at 2:00 AM UTC
  await syncQueue.upsertJobScheduler(
    "weekly-gorgias-sync",
    {
      pattern: "0 2 * * 0", // Sunday at 02:00 UTC
    },
    {
      name: "weekly-gorgias-sync",
      data: { scheduled: true },
    }
  );

  // Schedule web crawls — every Sunday at 3:00 AM UTC (after sync)
  await crawlQueue.upsertJobScheduler(
    "weekly-web-crawl",
    {
      pattern: "0 3 * * 0", // Sunday at 03:00 UTC
    },
    {
      name: "weekly-web-crawl",
      data: { scheduled: true },
    }
  );

  console.log("✓ Weekly sync and crawl jobs scheduled");
}
