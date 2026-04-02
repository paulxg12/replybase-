import { prisma } from "@replybase/db";
import { EmbeddingService } from "@replybase/rag";

interface CrawlJobData {
  merchantId: string;
  urls: string[];
}

/**
 * WebCrawler job: crawl merchant's product/FAQ pages → embed → upsert into pgvector
 */
export async function processWebCrawl(data: CrawlJobData) {
  const { merchantId, urls } = data;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

  const embeddingService = new EmbeddingService(openaiKey);
  let totalChunks = 0;

  for (const url of urls) {
    try {
      console.log(`Crawling: ${url}`);

      // Fetch page content
      const response = await fetch(url, {
        headers: { "User-Agent": "Replybase-Crawler/1.0" },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract text content (basic HTML stripping)
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (textContent.length < 100) {
        console.warn(`No meaningful content on ${url}`);
        continue;
      }

      // Chunk the content
      const chunks = chunkText(textContent, 1500);

      // Embed and upsert
      await embeddingService.upsertChunks(
        merchantId,
        chunks.map((content, index) => ({
          content,
          sourceType: "WEBSITE_CRAWL" as const,
          sourceId: `crawl-${encodeURIComponent(url)}-${index}`,
          metadata: { url, chunkIndex: index, crawledAt: new Date().toISOString() },
        }))
      );

      totalChunks += chunks.length;
      console.log(`Crawled ${url}: ${chunks.length} chunks`);
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
    }
  }

  console.log(`Web crawl completed: ${urls.length} URLs, ${totalChunks} total chunks`);
}

/**
 * Split text into chunks at sentence boundaries
 */
function chunkText(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence + " ";
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}
