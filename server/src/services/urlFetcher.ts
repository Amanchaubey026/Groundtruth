/** Server-side URL ingest: http(s) only, timeout + size cap, Readability extract. Fetched HTML is never rendered in the UI. */
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { parseHttpUrl } from "../lib/validation.js";
import { normalizeWhitespace } from "./chunking.js";

export interface FetchedPage {
  url: string;
  title: string | null;
  rawContent: string;
  cleanedContent: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "text/plain",
]);

export async function fetchAndExtract(url: string): Promise<FetchedPage> {
  const html = await downloadPage(url);
  return extractReadableContent(html.html, html.finalUrl);
}

async function downloadPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.urlFetchTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
        "User-Agent": "AI-Knowledge-Inbox/1.0",
      },
    });

    let finalUrl: string;
    try {
      finalUrl = parseHttpUrl(response.url || url);
    } catch {
      throw new AppError(
        422,
        "URL_FETCH_ERROR",
        "URL redirected to an unsupported destination",
      );
    }

    if (!response.ok) {
      throw new AppError(
        422,
        "URL_FETCH_ERROR",
        `URL fetch failed with status ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !isAllowedContentType(contentType)) {
      throw new AppError(
        422,
        "URL_FETCH_ERROR",
        `Unsupported content type: ${contentType.split(";")[0]?.trim() || "unknown"}`,
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > config.maxUrlResponseBytes) {
      throw new AppError(422, "URL_FETCH_ERROR", "URL response is too large");
    }

    const html = await readBodyLimited(response, config.maxUrlResponseBytes);
    return { html, finalUrl };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isAbortError(error)) {
      throw new AppError(422, "URL_FETCH_ERROR", "URL fetch timed out");
    }
    logger.warn("URL fetch failed", { url, error: errorMessage(error) });
    throw new AppError(422, "URL_FETCH_ERROR", "URL fetch failed");
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedContentType(contentType: string): boolean {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!mime) return true;
  return ALLOWED_MIME_TYPES.has(mime);
}

async function readBodyLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new AppError(422, "URL_FETCH_ERROR", "URL response is too large");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new AppError(422, "URL_FETCH_ERROR", "URL response is too large");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

export function extractReadableContent(html: string, pageUrl: string): FetchedPage {
  const mimeHint = html.trimStart().slice(0, 32).toLowerCase();
  const looksLikePlainText =
    !mimeHint.includes("<html") &&
    !mimeHint.includes("<!doctype") &&
    !mimeHint.includes("<head") &&
    !mimeHint.includes("<body") &&
    !mimeHint.includes("<article");

  if (looksLikePlainText && !html.includes("<")) {
    const cleaned = normalizeWhitespace(html);
    if (!cleaned) {
      throw new AppError(
        422,
        "URL_PARSE_ERROR",
        "Could not extract readable content from the URL",
      );
    }
    return {
      url: pageUrl,
      title: hostnameTitle(pageUrl),
      rawContent: html,
      cleanedContent: cleaned,
    };
  }

  try {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => undefined);
    virtualConsole.on("jsdomError", () => undefined);

    const dom = new JSDOM(html, {
      url: pageUrl,
      virtualConsole,
      contentType: "text/html",
    });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const cleaned = normalizeWhitespace(article?.textContent ?? "");

    if (!article || cleaned.length < 40) {
      throw new AppError(
        422,
        "URL_PARSE_ERROR",
        "Could not extract readable content from the URL",
      );
    }

    return {
      url: pageUrl,
      title: article.title?.trim() || hostnameTitle(pageUrl),
      rawContent: html,
      cleanedContent: cleaned,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("Readability parse failed", { url: pageUrl, error: errorMessage(error) });
    throw new AppError(
      422,
      "URL_PARSE_ERROR",
      "Could not extract readable content from the URL",
    );
  }
}

function hostnameTitle(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
