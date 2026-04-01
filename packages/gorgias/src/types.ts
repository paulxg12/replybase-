import { z } from "zod";

export const GorgiasTicketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      created_at: z.string(),
      from_agent: z.boolean().optional(),
    })
  ),
  tags: z.array(z.string()).optional().default([]),
  resolved_at: z.string().nullable().optional(),
  created_at: z.string(),
});

export type GorgiasTicket = z.infer<typeof GorgiasTicketSchema>;

export interface GorgiasFetchOptions {
  subdomain: string;
  apiEmail: string;
  apiKey: string;
  since?: Date;
}
