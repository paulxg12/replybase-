import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const syncQueue = new Queue("sync", { connection: redis });

/**
 * POST /api/gorgias/sync — trigger BullMQ sync job
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchantId } = body;

    if (!merchantId) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, gorgiasSubdomain: true, gorgiasApiKey: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Merchant not found" } },
        { status: 404 }
      );
    }

    // Create sync job record
    const syncJob = await prisma.syncJob.create({
      data: {
        merchantId: merchant.id,
        type: "WEEKLY_TICKETS",
        status: "PENDING",
      },
    });

    // Update merchant status
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { syncStatus: "SYNCING" },
    });

    // Add to BullMQ queue
    await syncQueue.add("gorgias-sync", {
      merchantId: merchant.id,
      syncJobId: syncJob.id,
      manual: true,
    });

    return NextResponse.json({
      ok: true,
      data: { syncJobId: syncJob.id, status: "PENDING" },
    });
  } catch (error) {
    console.error("Failed to trigger sync:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to trigger sync" } },
      { status: 500 }
    );
  }
}
