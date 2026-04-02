/**
 * RAG Pipeline DB Layer — End-to-End Test
 *
 * Tests: (1) create Merchant, (2) create KnowledgeChunk with dummy embedding,
 * (3) run pgvector cosine similarity search against it.
 *
 * Usage: cd packages/db && npx tsx prisma/test-rag.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEST_PREFIX = "rag-test-";
const VECTOR_DIM = 1536;

/** Generate a normalized dummy embedding vector */
function dummyEmbedding(seed: number): number[] {
  const vec = Array.from({ length: VECTOR_DIM }, (_, i) =>
    Math.sin(seed * (i + 1) * 0.01)
  );
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map((v) => v / norm);
}

async function main() {
  console.log("━━━ RAG Pipeline DB Test ━━━\n");

  // ── Step 0: Ensure pgvector extension ──────────────────────────────
  console.log("0️⃣  Ensuring pgvector extension...");
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  console.log("   ✓ pgvector extension ready\n");

  // ── Step 1: Create test User + Merchant ────────────────────────────
  console.log("1️⃣  Creating test User + Merchant...");

  const user = await prisma.user.upsert({
    where: { email: `${TEST_PREFIX}user@test.com` },
    update: {},
    create: {
      id: `${TEST_PREFIX}user`,
      email: `${TEST_PREFIX}user@test.com`,
      name: "RAG Test User",
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { shopifyDomain: `${TEST_PREFIX}shop.myshopify.com` },
    update: {},
    create: {
      id: `${TEST_PREFIX}merchant`,
      userId: user.id,
      shopifyDomain: `${TEST_PREFIX}shop.myshopify.com`,
      shopifyAccessToken: "test-token",
      gorgiasSubdomain: "test",
      gorgiasApiKey: "test-key",
      gorgiasApiEmail: "test@test.com",
      displayName: "RAG Test Shop",
      syncStatus: "READY",
    },
  });

  console.log(`   ✓ Merchant: ${merchant.id} (${merchant.shopifyDomain})\n`);

  // ── Step 2: Create KnowledgeChunks with dummy embeddings ───────────
  console.log("2️⃣  Creating KnowledgeChunks with embeddings...");

  const entries = [
    {
      id: `${TEST_PREFIX}chunk-returns`,
      content: "Our return policy allows returns within 30 days of purchase. Items must be in original condition.",
      seed: 1,
    },
    {
      id: `${TEST_PREFIX}chunk-shipping`,
      content: "We offer free shipping on orders over $50. Standard delivery takes 5-7 business days.",
      seed: 2,
    },
    {
      id: `${TEST_PREFIX}chunk-pricing`,
      content: "Our premium plan costs $29/month and includes unlimited chat sessions and priority support.",
      seed: 3,
    },
  ];

  for (const entry of entries) {
    const embedding = dummyEmbedding(entry.seed);

    // Upsert chunk (without embedding — Prisma can't handle Unsupported type directly)
    await prisma.knowledgeChunk.upsert({
      where: { id: entry.id },
      update: { content: entry.content },
      create: {
        id: entry.id,
        merchantId: merchant.id,
        content: entry.content,
        sourceType: "MANUAL",
        sourceId: `test-${entry.seed}`,
        metadata: { test: true },
      },
    });

    // Set embedding via raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2`,
      JSON.stringify(embedding),
      entry.id
    );

    console.log(`   ✓ Chunk "${entry.id}" — ${entry.content.slice(0, 50)}...`);
  }
  console.log();

  // ── Step 3: pgvector similarity search ─────────────────────────────
  console.log("3️⃣  Running pgvector cosine similarity search...");

  // Use the "returns" embedding as the query
  const queryEmbedding = dummyEmbedding(1); // same seed as "returns" chunk
  const queryVector = JSON.stringify(queryEmbedding);

  const results: Array<{
    id: string;
    content: string;
    source_type: string;
    similarity: number;
  }> = await prisma.$queryRawUnsafe(
    `SELECT
       id,
       content,
       "sourceType" as source_type,
       1 - (embedding <=> $1::vector) as similarity
     FROM "knowledge_chunks"
     WHERE "merchantId" = $2
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    queryVector,
    merchant.id
  );

  console.log(`   Found ${results.length} results:\n`);
  console.log("   ┌──────────────────────┬────────────┬──────────────────────────────────────────────┐");
  console.log("   │ ID                   │ Similarity │ Content                                      │");
  console.log("   ├──────────────────────┼────────────┼──────────────────────────────────────────────┤");
  for (const row of results) {
    const id = row.id.slice(-15).padEnd(20);
    const sim = row.similarity.toFixed(6).padStart(10);
    const content = row.content.slice(0, 44).padEnd(44);
    console.log(`   │ ${id} │ ${sim} │ ${content} │`);
  }
  console.log("   └──────────────────────┴────────────┴──────────────────────────────────────────────┘\n");

  // ── Assertions ─────────────────────────────────────────────────────
  const topResult = results[0];
  const passed =
    topResult &&
    topResult.id.includes("chunk-returns") &&
    topResult.similarity > 0.99;

  if (passed) {
    console.log("✅ PASS — Top result is the returns chunk with similarity > 0.99");
    console.log(`         (similarity = ${topResult.similarity.toFixed(6)})`);
  } else {
    console.log("❌ FAIL — Top result is not the expected returns chunk");
    console.log(`         Got: ${topResult?.id} (sim=${topResult?.similarity})`);
  }

  // ── Cleanup ────────────────────────────────────────────────────────
  console.log("\n🧹 Cleaning up test data...");
  await prisma.knowledgeChunk.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  await prisma.merchant.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  console.log("   ✓ Cleaned up\n");

  console.log("━━━ Done ━━━");
  return passed;
}

main()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((err) => {
    console.error("\n💥 Test failed with error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
