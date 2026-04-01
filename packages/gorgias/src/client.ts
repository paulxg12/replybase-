import { GorgiasTicketSchema, type GorgiasTicket, type GorgiasFetchOptions } from "./types";

const GORGIAS_API_BASE = "https://api.gorgias.io/api/v3";
const MAX_REQUESTS_PER_MINUTE = 40;

export class GorgiasClient {
  private subdomain: string;
  private apiEmail: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(options: GorgiasFetchOptions) {
    this.subdomain = options.subdomain;
    this.apiEmail = options.apiEmail;
    this.apiKey = options.apiKey;
    this.baseUrl = `${GORGIAS_API_BASE}/accounts/${options.subdomain}`;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.apiEmail}:${this.apiKey}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Gorgias auth failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      return !!data.id;
    } catch (error) {
      console.error("Gorgias connection test failed:", error);
      return false;
    }
  }

  async fetchTickets(since?: Date): Promise<GorgiasTicket[]> {
    const tickets: GorgiasTicket[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const params = new URLSearchParams({
          status: "closed",
          limit: "100",
          page: page.toString(),
        });

        if (since) {
          params.append("resolved_after", since.toISOString());
        }

        const response = await fetch(
          `${this.baseUrl}/tickets?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: this.getAuthHeader(),
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 429) {
          // Rate limited - wait and retry
          await this.sleep(60000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Gorgias API error: ${response.status}`);
        }

        const data = await response.json();
        const validatedTickets = data.data.map((t: unknown) =>
          GorgiasTicketSchema.parse(t)
        );

        tickets.push(...validatedTickets);

        // Check if there are more pages
        hasMore = validatedTickets.length === 100;
        page++;

        // Rate limiting: max 40 req/min = 1 per 1.5 seconds
        await this.sleep(1500);
      } catch (error) {
        console.error(`Error fetching Gorgias tickets (page ${page}):`, error);
        hasMore = false;
      }
    }

    return tickets;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function validateGorgiasCredentials(
  subdomain: string,
  email: string,
  apiKey: string
): Promise<boolean> {
  const client = new GorgiasClient({
    subdomain,
    apiEmail: email,
    apiKey,
  });

  return client.testConnection();
}
