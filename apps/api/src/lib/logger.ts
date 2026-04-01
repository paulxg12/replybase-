import pino from "pino";
import { isDevelopment } from "@replybase/config";

const transport = isDevelopment()
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: false,
      },
    })
  : undefined;

export const logger = transport ? pino({}, transport) : pino();

export function logError(
  context: string,
  error: unknown,
  data?: Record<string, unknown>
): void {
  const message =
    error instanceof Error ? error.message : JSON.stringify(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error({ context, message, stack, ...(data ? { data } : {}) }, "Error occurred");
}

export function logInfo(message: string, data?: unknown): void {
  logger.info(data || {}, message);
}
