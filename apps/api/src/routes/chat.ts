import { Express, Request, Response } from "express";
import { prisma } from "@replybase/db";
import { apiSuccess, apiError } from "../lib/responses";
import { logError, logInfo } from "../lib/logger";
import { EmbeddingService } from "@replybase/rag";
import { LLMService } from "@replybase/rag";
import { ShopifyClient } from "@replybase/shopify";
import { z } from "zod";

const ChatRequestSchema = z.object({
  merchantPublicKey: z.string(),
  visitorId: z.string(),
  sessionId: z.string().optional(),
  message: z.string().min(1).max(5000),
});

export interface ChatRequest extends Request {
  body: z.infer<typeof ChatRequestSchema>;
}

// Regex for WISMO (Where Is My Order) detection
const WISMO_KEYWORDS =
  /\b(where|what|when|order|status|track|shipment|delivery|shipped|arrive|arrived)\b/i;

async function detectWISMOQuery(message: string): Promise<boolean> {
  return WISMO_KEYWORDS.test(message);
}

export function registerChatRoutes(app: Express) {
  app.post("/chat", async (req: ChatRequest, res: Response) => {
    try {
      // Validate input
      const parseResult = ChatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(
          apiError(
            "INVALID_INPUT",
            "Invalid request body",
            parseResult.error.flatten().fieldErrors
          )
        );
      }

      const { merchantPublicKey, visitorId, sessionId, message } =
        parseResult.data;

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
        return res.status(404).json(
          apiError("MERCHANT_NOT_FOUND", "Widget merchant not found")
        );
      }

      if (merchant.syncStatus !== "READY") {
        return res.status(503).json(
          apiError(
            "MERCHANT_NOT_READY",
            "The chatbot is not ready to handle queries"
          )
        );
      }

      // Load or create chat session
      let session = sessionId
        ? await prisma.chatSession.findUnique({
            where: { id: sessionId },
          })
        : null;

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            merchantId: merchant.id,
            visitorId,
            messages: [],
          },
        });
      }

      // Add user message to session
      const updatedMessages = [
        ...((session.messages as any[]) || []),
        {
          id: `msg-${Date.now()}`,
          role: "user",
          content: message,
          timestamp: Date.now(),
        },
      ];

      // Check if this is a WISMO query
      const isWISMO = await detectWISMOQuery(message);

      let reply = "";
      let confidence = 0;
      let escalated = false;
      let sources: Array<{ content: string; similarity: number }> = [];

      if (isWISMO) {
        // Try to get order status from Shopify
        const shopify = new ShopifyClient({
          domain: merchant.shopifyDomain,
          accessToken: merchant.shopifyAccessToken,
        });

        // Extract email if present in message (simple heuristic)
        const emailMatch = message.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch) {
          const orderResult = await shopify.getOrderByEmail(emailMatch[0]);
          if (orderResult.orders.length > 0) {
            const order = orderResult.orders[0];
            reply = `Great! I found your order #${order.order_number}. Status: ${order.fulfillment_status || "Processing"}. Your order was placed on ${new Date(order.created_at).toLocaleDateString()}.`;
            confidence = 0.95;
            escalated = false;
            logInfo("WISMO query handled via Shopify API", {
              merchantId: merchant.id,
              orderNumber: order.order_number,
            });
          } else {
            reply =
              "I couldn't find an order with that email. Please check your email address or contact support.";
            confidence = 0.5;
            escalated = false;
          }
        } else {
          // No email found, escalate
          reply =
            "To find your order, please provide your email address. Or I can connect you with an agent.";
          confidence = 0.4;
          escalated = true;
        }
      } else {
        // Use RAG pipeline for general queries
        try {
          const openaiKey = process.env.OPENAI_API_KEY;
          if (!openaiKey) {
            throw new Error("OPENAI_API_KEY not configured");
          }

          const embeddingService = new EmbeddingService(openaiKey);
          const llmService = new LLMService(openaiKey);

          // Query knowledge base
          const chunks = await embeddingService.queryChunks(
            merchant.id,
            message,
            6
          );

          // If no relevant chunks found, escalate
          if (
            chunks.length === 0 ||
            (chunks[0]?.similarity || 0) < 0.45
          ) {
            reply =
              "I'm not sure about that. Let me connect you with a support agent who can help.";
            confidence = 0.2;
            escalated = true;
            sources = chunks;
          } else {
            // Generate response using LLM
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

          logInfo("RAG query processed", {
            merchantId: merchant.id,
            confidence,
            sourcesUsed: sources.length,
          });
        } catch (ragError) {
          logError("RAG pipeline failed", ragError);
          reply =
            "I'm experiencing technical difficulties. Please try again or contact support.";
          confidence = 0;
          escalated = true;
        }
      }

      // Add assistant message to session
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
        data: {
          messages: updatedMessages,
          escalated: escalated || session.escalated,
        },
      });

      res.json(
        apiSuccess({
          reply,
          confidence,
          escalated,
          sessionId: session.id,
          sources,
        })
      );
    } catch (error) {
      logError("Chat endpoint failed", error);
      res.status(500).json(
        apiError("ERROR", "Failed to process chat message")
      );
    }
  });
}
