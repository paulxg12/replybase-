import { initTRPC, TRPCError } from "@trpc/server";
import { Express, Request, Response } from "express";

export interface TRPCContext {
  user: {
    id: string;
    email: string;
  };
}

export interface TRPCRequest extends Request {
  user?: {
    id: string;
    email: string;
    merchantId: string;
  };
}

const t = initTRPC.context<TRPCContext>().create();

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const req = opts.ctx.user;

  if (!req) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return opts.next({
    ctx: {
      user: req as TRPCContext["user"],
    },
  });
});

export const router = t.router;
export const middleware = t.middleware;

/**
 * Create tRPC context from Express request
 */
export function createTRPCContext(req: TRPCRequest): TRPCContext {
  const user = req.user;

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
  };
}
