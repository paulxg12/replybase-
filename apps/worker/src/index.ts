require("dotenv").config();

import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { processGorgiasSync } from "./jobs/gorgias-sync";
import { processWebCrawl } from "./jobs/web-crawler";
import { scheduleWeeklyJobs } from "./lib/scheduler";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function bootstrap() {
  console.log("🚀 Starting Replybase Worker...");

  // Gorgias Sync Worker
  const syncWorker = new Worker(
    "sync",
    async (job) => {
      console.log(`Processing sync job: ${job.id} (${job.name})`);
      await processGorgiasSync(job.data);
    },
    { connection: redis, concurrency: 2 }
  );

  syncWorker.on("completed", (job) => {
    console.log(`✓ Sync job completed: ${job.id}`);
  });

  syncWorker.on("failed", (job, error) => {
    console.error(`✗ Sync job failed: ${job?.id}`, error.message);
  });

  // Web Crawler Worker
  const crawlWorker = new Worker(
    "crawl",
    async (job) => {
      console.log(`Processing crawl job: ${job.id} (${job.name})`);
      await processWebCrawl(job.data);
    },
    { connection: redis, concurrency: 1 }
  );

  crawlWorker.on("completed", (job) => {
    console.log(`✓ Crawl job completed: ${job.id}`);
  });

  crawlWorker.on("failed", (job, error) => {
    console.error(`✗ Crawl job failed: ${job?.id}`, error.message);
  });

  // Schedule weekly repeatable jobs
  await scheduleWeeklyJobs(redis);

  console.log("✓ Worker initialized — listening for jobs");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("Shutting down worker...");
    await syncWorker.close();
    await crawlWorker.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Worker bootstrap failed:", error);
  process.exit(1);
});
