import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function write(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const entry = {
    level,
    msg,
    time: new Date().toISOString(),
    ...sanitize(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

const SENSITIVE_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "token",
  "secret",
  "password",
  "xai_api_key",
]);

function sanitize(fields: LogFields): LogFields {
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[redacted]";
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.header("x-request-id");
  const requestId = headerId && headerId.trim() ? headerId.trim() : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info("Request completed", {
      requestId,
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}
