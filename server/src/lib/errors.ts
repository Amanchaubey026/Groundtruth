import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ErrorCode } from "../types.js";
import { logger } from "./logger.js";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    logger.warn("Application error", {
      requestId,
      route: req.originalUrl,
      method: req.method,
      status: err.statusCode,
      code: err.code,
      message: err.message,
    });
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error("Unexpected error", {
    requestId,
    route: req.originalUrl,
    method: req.method,
    error: message,
  });

  res.status(500).json({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
  });
}
