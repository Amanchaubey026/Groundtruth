export type SourceType = "note" | "url";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "URL_FETCH_ERROR"
  | "URL_PARSE_ERROR"
  | "EMBEDDING_ERROR"
  | "LLM_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"
  | "NOT_FOUND";

export interface ItemRecord {
  id: string;
  source_type: SourceType;
  source_url: string | null;
  title: string | null;
  raw_content: string;
  cleaned_content: string;
  created_at: string;
}

export interface ChunkRecord {
  id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  embedding: Buffer;
  created_at: string;
}

export interface ItemSummary {
  id: string;
  sourceType: SourceType;
  title: string | null;
  sourceUrl: string | null;
  preview: string;
  createdAt: string;
}

export interface IngestResponse {
  id: string;
  sourceType: SourceType;
  title: string | null;
  sourceUrl: string | null;
  chunkCount: number;
  createdAt: string;
}

export interface RetrievedSource {
  sourceNumber: number;
  chunkId: string;
  itemId: string;
  title: string | null;
  url: string | null;
  content: string;
  score: number;
}

export interface QuerySource {
  sourceNumber: number;
  itemId: string;
  title: string | null;
  url: string | null;
  snippet: string;
  score: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
