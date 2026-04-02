import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";
import { z } from "zod";

const UpdateKBSchema = z.object({
  content: z.string().min(1).max(10000),
  metadata: z.record(z.any()).optional(),
});

/**
 * PUT /api/kb/[id] — Edit a KB entry
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parseResult = UpdateKBSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const existing = await prisma.knowledgeChunk.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "KB entry not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      content: parseResult.data.content,
    };
    if (parseResult.data.metadata) {
      updateData.metadata = parseResult.data.metadata;
    }

    const updated = await prisma.knowledgeChunk.update({
      where: { id: params.id },
      data: updateData as any,
    });

    // Re-embed the updated content
    if (process.env.OPENAI_API_KEY) {
      const { EmbeddingService } = await import("@replybase/rag");
      const embeddingService = new EmbeddingService(process.env.OPENAI_API_KEY);
      const [embedding] = await embeddingService.embedTexts([parseResult.data.content]);
      await prisma.$executeRawUnsafe(
        'UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2',
        JSON.stringify(embedding.embedding),
        params.id
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Failed to update KB entry:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to update entry" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kb/[id] — Delete a KB entry
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.knowledgeChunk.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete KB entry:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to delete entry" } },
      { status: 500 }
    );
  }
}
