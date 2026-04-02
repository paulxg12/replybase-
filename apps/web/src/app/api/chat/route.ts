import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@replybase/db";
import { EmbeddingService, LLMService } from "@replybase/rag";
import { z } from "zod";

const ChatRequestSchema = z.object({
  merchantPublicKey: z.string(),
  visitorId: z.string(),
  sessionId: z.string().optional(),
  message: z.string().min(1).max(5000),
});

const WISMO_KEYWORDS =
  /\b(where|what|when|order|status|track|shipment|delivery|shipped|arrive|arrived)\b/i;

/**
 * POST /api/chat — RAG pipeline: embed query → pgvector similarity search → OpenAI completion
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const { merchantPublicKey, visitorId, sessionId, message } = parseResult.data;

    // Look up merchant
    const merchant = await prisma.merchant.findUnique({
      where: { widgetPublicKey: merchantPublicKey },
      select: {
        id: true,
        syncStatus: true,
        shopifyDomain: true,
        shopifyAccessToken: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { ok: false, error: { code: "MERCHANT_NOT_FOUND", message: "Widget merchant not found" } },
        { status: 404 }
      );
    }

    if (merchant.syncStatus !== "READY") {
      return NextResponse.json(
        { ok: false, error: { code: "MERCHANT_NOT_READY", message: "Chatbot is not ready" } },
        { status: 503 }
      );
    }

    // Load or create chat session
    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      session = await prisma.chatSession.create({
        data: { merchantId: merchant.id, visitorId, messages: [] },
      });
    }

    const updatedMessages = [
      ...((session.messages as any[]) || []),
      {
        id: `msg-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      },
    ];

    const isWISMO = WISMO_KEYWORDS.test(message);
    let reply = "";
    let confidence = 0;
    let escalated = false;
    let sources: Array<{ content: string; similarity: number }> = [];

    if (isWISMO) {
      const emailMatch = message.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      if (emailMatch) {
        // Dynamically import Shopify client for WISMO
        const { ShopifyClient } = await import("@replybase/shopify");
        const shopify = new ShopifyClient({
          domain: merchant.shopifyDomain,
          accessToken: merchant.shopifyAccessToken,
        });
        const orderResult = await shopify.getOrderByEmail(emailMatch[0]);
        if (orderResult.orders.length > 0) {
          const order = orderResult.orders[0];
          reply = `Great! I found your order #${order.order_number}. Status: ${order.fulfillment_status || "Processing"}. Placed on ${new Date(order.created_at).toLocaleDateString()}.`;
          confidence = 0.95;
        } else {
          reply = "I couldn't find an order with that email. Please check your email address.";
          confidence = 0.5;
        }
      } else {
        reply = "To find your order, please provide your email address.";
        confidence = 0.4;
        escalated = true;
      }
    } else {
      // RAG pipeline
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return NextResponse.json(
          { ok: false, error: { code: "CONFIG_ERROR", message: "OPENAI_API_KEY not set" } },
          { status: 500 }
        );
      }

      const embeddingService = new EmbeddingService(openaiKey);
      const llmService = new LLMService(openaiKey);

      const chunks = await embeddingService.queryChunks(merchant.id, message, 6);

      if (chunks.length === 0 || (chunks[0]?.similarity || 0) < 0.45) {
        reply = "I'm not sure about that. Let me connect you with a support agent.";
        confidence = 0.2;
        escalated = true;
        sources = chunks;
      } else {
        const response = await llmService.generateResponse(
          message,
          chunks,
          "Be helpful, friendly, and professional. Answer based on the provided context."
        );
        reply = response.reply;
        confidence = response.confidence;
        escalated = response.confidence < 0.5;
        sources = response.sources;
      }
    }

    // Add assistant message
    updatedMessages.push({
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: reply,
      confidence,
      escalated,
      timestamp: Date.now(),
    });

    // Save updated session
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { messages: updatedMessages, escalated: escalated || session.escalated },
    });

    return NextResponse.json({
      ok: true,
      data: { reply, confidence, escalated, sessionId: session.id, sources },
    });
  } catch (error) {
    console.error("Chat endpoint failed:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ERROR", message: "Failed to process chat message" } },
      { status: 500 }
    );
  }
}
