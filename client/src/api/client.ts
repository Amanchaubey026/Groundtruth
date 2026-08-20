// Dev uses the Vite proxy (empty base). Set VITE_API_URL if the API is on another origin.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "http://localhost:4000");

export type SourceType = "note" | "url";

export interface ItemSummary {
  id: string;
  sourceType: SourceType;
  title: string | null;
  sourceUrl: string | null;
  preview: string;
  createdAt: string;
}

export interface IngestResult {
  id: string;
  sourceType: SourceType;
  title: string | null;
  sourceUrl: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface QuerySource {
  sourceNumber: number;
  itemId: string;
  title: string | null;
  url: string | null;
  snippet: string;
  score: number;
}

export interface QueryResult {
  answer: string;
  sources: QuerySource[];
}

export interface QueryStreamHandlers {
  onSources: (sources: QuerySource[]) => void;
  onToken: (text: string) => void;
  onDone: (result: QueryResult) => void;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Could not reach the API. Is the server running?", 0, "NETWORK_ERROR");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = parseError(data);
    throw new ApiError(error.message, response.status, error.code);
  }
  return data as T;
}

function parseError(data: unknown): { message: string; code: string } {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object"
  ) {
    const error = data.error as { message?: unknown; code?: unknown };
    return {
      message: typeof error.message === "string" ? error.message : "Request failed",
      code: typeof error.code === "string" ? error.code : "INTERNAL_ERROR",
    };
  }
  return { message: "Request failed", code: "INTERNAL_ERROR" };
}

export function ingestNote(content: string): Promise<IngestResult> {
  return request<IngestResult>("/ingest", {
    method: "POST",
    body: JSON.stringify({ type: "note", content }),
  });
}

export function ingestUrl(url: string): Promise<IngestResult> {
  return request<IngestResult>("/ingest", {
    method: "POST",
    body: JSON.stringify({ type: "url", url }),
  });
}

export function listItems(): Promise<{ items: ItemSummary[] }> {
  return request<{ items: ItemSummary[] }>("/items");
}

export async function queryKnowledgeStream(
  question: string,
  handlers: QueryStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ question, stream: true }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) return;
    throw new ApiError("Could not reach the API. Is the server running?", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const error = parseError(data);
    throw new ApiError(error.message, response.status, error.code);
  }

  await readSse(response, (event, data) => {
    if (event === "sources") {
      const sources = (data as { sources?: QuerySource[] }).sources ?? [];
      handlers.onSources(sources);
      return;
    }
    if (event === "token") {
      const text = (data as { text?: string }).text ?? "";
      if (text) handlers.onToken(text);
      return;
    }
    if (event === "done") {
      const payload = data as QueryResult;
      handlers.onDone({
        answer: payload.answer ?? "",
        sources: payload.sources ?? [],
      });
      return;
    }
    if (event === "error") {
      const payload = data as { message?: string; code?: string };
      throw new ApiError(
        payload.message ?? "The language model failed",
        503,
        payload.code ?? "LLM_ERROR",
      );
    }
  });
}

async function readSse(
  response: Response,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  if (!response.body) {
    throw new ApiError("Empty stream from the API", 503, "LLM_ERROR");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const raw = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      if (raw.trim()) {
        dispatchSseBlock(raw, onEvent);
      }
      separator = buffer.indexOf("\n\n");
    }
  }
}

function dispatchSseBlock(
  raw: string,
  onEvent: (event: string, data: unknown) => void,
): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return;
  onEvent(event, JSON.parse(dataLines.join("\n")));
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
