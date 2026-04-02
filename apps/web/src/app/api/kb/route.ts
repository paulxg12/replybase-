import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";

/**
 * GET /api/kb — List knowledge base entries for a shop
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!merchantId) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const [entries, total] = await Promise.all([
      prisma.knowledgeChunk.findMany({
        where: { merchantId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          sourceType: true,
          sourceId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.knowledgeChunk.count({ where: { merchantId } }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { entries, total, limit, offset },
    });
  } catch (error) {
    console.error("Failed to list KB entries:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to list entries" } },
      { status: 500 }
    );
  }
}
