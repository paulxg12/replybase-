import { router } from "./trpc";
import { merchantRouter } from "./routers/merchants";
import { ticketsRouter } from "./routers/tickets";
import { conversationsRouter } from "./routers/conversations";
import { syncRouter } from "./routers/sync";
import { billingRouter } from "./routers/billing";
import { notificationRouter } from "./routers/notifications";
import { apiKeysRouter } from "./routers/api-keys";

export const appRouter = router({
  merchants: merchantRouter,
  tickets: ticketsRouter,
  conversations: conversationsRouter,
  sync: syncRouter,
  billing: billingRouter,
  notifications: notificationRouter,
  apiKeys: apiKeysRouter,
});

export type AppRouter = typeof appRouter;
