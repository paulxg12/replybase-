import { Express, Request, Response, NextFunction } from "express";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return {
    ok: true,
    data,
  };
}

export function apiError(
  code: string,
  message: string,
  details?: unknown
): ApiError {
  const error: ApiError["error"] = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    ok: false,
    error,
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandled error:", err);

  const statusCode = (err as any).statusCode || 500;
  const message =
    statusCode === 500
      ? "Internal server error"
      : err.message || "Unknown error";

  res.status(statusCode).json(apiError("ERROR", message));
}
