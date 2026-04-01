import { OpenAI } from "openai";

export interface ChatResponse {
  reply: string;
  confidence: number;
  sources: Array<{ content: string; similarity: number }>;
}

export class LLMService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(
    userMessage: string,
    contextChunks: Array<{ content: string; similarity: number }>,
    brandVoice: string = "Be helpful, friendly, and professional."
  ): Promise<ChatResponse> {
    const sourceTexts = contextChunks
      .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
      .join("\n\n");

    const systemPrompt = `You are a helpful customer support assistant.

Brand voice and guidelines:
${brandVoice}

Answer ONLY based on the provided context. If the context doesn't contain enough information to answer the question, say you'll connect the customer with a human agent.

Context:
${sourceTexts}`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const reply =
        response.choices[0]?.message?.content ||
        "I'm unable to help with that right now.";

      // Calculate confidence from source similarities
      const avgConfidence =
        contextChunks.length > 0
          ? contextChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) /
            contextChunks.length
          : 0;

      return {
        reply,
        confidence: Math.min(avgConfidence, 1),
        sources: contextChunks,
      };
    } catch (error) {
      throw new Error(
        `LLM generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
