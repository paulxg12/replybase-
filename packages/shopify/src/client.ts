import { ShopifyOrderSchema, type ShopifyOrder, type ShopifyClientOptions, type OrderSearchResult } from "./types";

export class ShopifyClient {
  private domain: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(options: ShopifyClientOptions) {
    this.domain = options.domain;
    this.accessToken = options.accessToken;
    this.baseUrl = `https://${this.domain}/admin/api/2024-01`;
  }

  private getHeaders(): HeadersInit {
    return {
      "X-Shopify-Access-Token": this.accessToken,
      "Content-Type": "application/json",
    };
  }

  async getOrderByEmail(email: string): Promise<OrderSearchResult> {
    try {
      const query = encodeURIComponent(`email:${email}`);
      const response = await fetch(
        `${this.baseUrl}/orders.json?status=any&query=${query}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return {
          orders: [],
          error: `Shopify API error: ${response.status}`,
        };
      }

      const data = await response.json();
      const orders = data.orders.map((o: unknown) =>
        ShopifyOrderSchema.parse(o)
      );

      return { orders };
    } catch (error) {
      return {
        orders: [],
        error: `Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}.json`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return ShopifyOrderSchema.parse(data.order);
    } catch (error) {
      console.error("Failed to fetch Shopify order:", error);
      return null;
    }
  }

  async getStoreInfo(): Promise<{ name: string; domain: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/shop.json`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        name: data.shop.name,
        domain: data.shop.domain,
      };
    } catch (error) {
      console.error("Failed to fetch Shopify store info:", error);
      return null;
    }
  }
}

export async function validateShopifyCredentials(
  domain: string,
  accessToken: string
): Promise<boolean> {
  const client = new ShopifyClient({ domain, accessToken });
  const result = await client.getStoreInfo();
  return result !== null;
}
