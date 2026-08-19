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

export function queryKnowledge(question: string): Promise<QueryResult> {
  return request<QueryResult>("/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
