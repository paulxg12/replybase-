import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "demo@replybase.app" },
    update: {},
    create: {
      email: "demo@replybase.app",
      name: "Demo Merchant",
    },
  });

  // Create test shop (merchant)
  const merchant = await prisma.merchant.upsert({
    where: { shopifyDomain: "demo-shop.myshopify.com" },
    update: {},
    create: {
      userId: user.id,
      shopifyDomain: "demo-shop.myshopify.com",
      shopifyAccessToken: "shpat_demo_token",
      gorgiasSubdomain: "demo-shop",
      gorgiasApiKey: "demo-gorgias-key",
      gorgiasApiEmail: "support@demo-shop.com",
      displayName: "Demo Shop",
      syncStatus: "READY",
      lastSyncedAt: new Date(),
    },
  });

  // Create 5 sample KB entries
  const sampleEntries = [
    {
      content:
        "Q: What is your return policy?\nA: We offer a 30-day return policy on all items. Items must be in original condition with tags attached. Refunds are processed within 5-7 business days after we receive the returned item.",
      sourceType: "TICKET" as const,
      sourceId: "seed-1",
    },
    {
      content:
        "Q: How long does shipping take?\nA: Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is available for an additional $9.99. Free shipping on orders over $75.",
      sourceType: "TICKET" as const,
      sourceId: "seed-2",
    },
    {
      content:
        "Q: Do you ship internationally?\nA: Yes! We ship to over 50 countries. International shipping typically takes 7-14 business days. Customs fees and import duties are the responsibility of the buyer.",
      sourceType: "TICKET" as const,
      sourceId: "seed-3",
    },
    {
      content:
        "Q: How do I track my order?\nA: Once your order ships, you'll receive an email with a tracking number and link. You can also track your order by logging into your account on our website.",
      sourceType: "TICKET" as const,
      sourceId: "seed-4",
    },
    {
      content:
        "Q: Can I change or cancel my order?\nA: You can modify or cancel your order within 1 hour of placing it. After that, orders enter our fulfillment process and cannot be changed. Contact support immediately if you need help.",
      sourceType: "MANUAL" as const,
      sourceId: "seed-5",
    },
  ];

  for (const entry of sampleEntries) {
    await prisma.knowledgeChunk.upsert({
      where: {
        id: `seed-${entry.sourceId}`,
      },
      update: { content: entry.content },
      create: {
        id: `seed-${entry.sourceId}`,
        merchantId: merchant.id,
        content: entry.content,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        metadata: { seeded: true },
      },
    });
  }

  console.log(`✓ Created user: ${user.email}`);
  console.log(`✓ Created merchant: ${merchant.shopifyDomain}`);
  console.log(`✓ Created ${sampleEntries.length} sample KB entries`);
  console.log("🌱 Seed complete!");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
