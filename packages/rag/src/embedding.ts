import { OpenAI } from "openai";
import { prisma } from "@replybase/db";
import type { Prisma } from "@replybase/db";

// Re-export for use in services
export { prisma };

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

export class EmbeddingService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    });

    return texts.map((text, idx) => ({
      text,
      embedding: response.data[idx].embedding,
    }));
  }

  chunkTicket(subject: string, agentReply: string): string[] {
    const formatted = `Q: ${subject}\nA: ${agentReply}`;

    // If short enough, return as single chunk
    if (formatted.length < 2000) {
      return [formatted];
    }

    // Split long text at sentence boundaries
    const sentences = agentReply.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = `Q: ${subject}\nA: `;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 2000) {
        if (currentChunk.length > `Q: ${subject}\nA: `.length) {
          chunks.push(currentChunk.trim());
          currentChunk = `Q: ${subject}\nA: `;
        }
      }
      currentChunk += sentence + " ";
    }

    if (currentChunk.length > `Q: ${subject}\nA: `.length) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [formatted];
  }

  async upsertChunks(
    merchantId: string,
    chunks: Array<{
      content: string;
      sourceType: "TICKET" | "WEBSITE_CRAWL" | "MANUAL";
      sourceId?: string;
      metadata?: Prisma.InputJsonValue;
    }>
  ): Promise<void> {
    if (chunks.length === 0) return;

    const embeddings = await this.embedTexts(chunks.map((c) => c.content));

    for (let i = 0; i < embeddings.length; i++) {
      const embedding = embeddings[i];
      const matchingChunk = chunks[i];
      if (!matchingChunk) continue;

      // Check if chunk with same sourceId already exists
      if (matchingChunk.sourceId) {
        const existing = await prisma.knowledgeChunk.findFirst({
          where: {
            merchantId,
            sourceId: matchingChunk.sourceId,
            sourceType: matchingChunk.sourceType,
          },
        });

        if (existing) {
          // Update existing
          await prisma.knowledgeChunk.update({
            where: { id: existing.id },
            data: {
              content: embedding.text,
              ...(matchingChunk.metadata
                ? { metadata: matchingChunk.metadata }
                : {}),
            },
          });
          await this.setChunkEmbedding(existing.id, embedding.embedding);
          continue;
        }
      }

      // Insert new
      const created = await prisma.knowledgeChunk.create({
        data: {
          merchantId,
          content: embedding.text,
          sourceType: matchingChunk.sourceType,
          sourceId: matchingChunk.sourceId,
          ...(matchingChunk.metadata
            ? { metadata: matchingChunk.metadata }
            : {}),
        },
      });
      await this.setChunkEmbedding(created.id, embedding.embedding);
    }
  }

  private async setChunkEmbedding(
    chunkId: string,
    embedding: number[]
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      'UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2',
      JSON.stringify(embedding),
      chunkId
    );
  }

  async queryChunks(
    merchantId: string,
    queryText: string,
    limit: number = 6
  ): Promise<
    Array<{ content: string; metadata: unknown; similarity: number }>
  > {
    const [queryEmbedding] = await this.embedTexts([queryText]);

    // Use pgvector cosine similarity search
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        metadata: unknown;
        similarity: number;
      }>
    >`
      SELECT
        "id",
        "content",
        "metadata",
        (1 - ("embedding" <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) as similarity
      FROM "knowledge_chunks"
      WHERE "merchantId" = ${merchantId}
      AND "embedding" IS NOT NULL
      AND (1 - ("embedding" <=> ${JSON.stringify(queryEmbedding.embedding)}::vector)) >= 0.3
      ORDER BY "embedding" <=> ${JSON.stringify(queryEmbedding.embedding)}::vector
      LIMIT ${limit}
    `;

    return results.map((r: { content: string; metadata: unknown; similarity: number }) => ({
      content: r.content,
      metadata: r.metadata,
      similarity: Number(r.similarity),
    }));
  }
}
