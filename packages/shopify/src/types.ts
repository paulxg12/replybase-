import { z } from "zod";

export const ShopifyOrderSchema = z.object({
  id: z.string(),
  order_number: z.number(),
  email: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  financial_status: z.string(),
  fulfillment_status: z.string().nullable(),
  total_price: z.string(),
  currency: z.string(),
  line_items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      quantity: z.number(),
      price: z.string(),
    })
  ),
});

export type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

export interface ShopifyClientOptions {
  domain: string;
  accessToken: string;
}

export interface OrderSearchResult {
  orders: ShopifyOrder[];
  error?: string;
}
