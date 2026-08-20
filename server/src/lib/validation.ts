import { AppError } from "./errors.js";
import { config, type LlmProvider } from "./config.js";
import type { LlmSelection, SourceType } from "../types.js";

export interface NoteIngestInput {
  type: "note";
  content: string;
  title?: string;
}

export interface UrlIngestInput {
  type: "url";
  url: string;
  title?: string;
}

export type IngestInput = NoteIngestInput | UrlIngestInput;

function asRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Expected a string value");
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseIngestInput(body: unknown): IngestInput {
  const record = asRecord(body);
  const type = record.type;

  if (type !== "note" && type !== "url") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      'Field "type" must be either "note" or "url"',
    );
  }

  if (type === "note") {
    if (typeof record.content !== "string") {
      throw new AppError(400, "VALIDATION_ERROR", 'Field "content" is required for notes');
    }
    const content = record.content.trim();
    if (!content) {
      throw new AppError(400, "VALIDATION_ERROR", "Note content cannot be empty");
    }
    if (content.length > config.maxNoteChars) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        `Note content exceeds the maximum length of ${config.maxNoteChars} characters`,
      );
    }
    return {
      type: "note",
      content,
      title: optionalString(record.title),
    };
  }

  if (typeof record.url !== "string" || !record.url.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", 'Field "url" is required for URL items');
  }

  const url = parseHttpUrl(record.url.trim());
  return {
    type: "url",
    url,
    title: optionalString(record.title),
  };
}

export function parseHttpUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "URL is malformed");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Only http and https URLs are supported",
    );
  }

  return parsed.toString();
}

export function parseQuestion(body: unknown): string {
  return parseQueryInput(body).question;
}

export function parseQueryInput(body: unknown): { question: string; llm: LlmSelection } {
  const record = asRecord(body);
  if (typeof record.question !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", 'Field "question" is required');
  }
  const question = record.question.trim();
  if (!question) {
    throw new AppError(400, "VALIDATION_ERROR", "Question cannot be empty");
  }
  if (question.length > config.maxQuestionChars) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Question exceeds the maximum length of ${config.maxQuestionChars} characters`,
    );
  }
  return { question, llm: parseLlmSelection(record) };
}

function parseLlmSelection(record: Record<string, unknown>): LlmSelection {
  const provider = parseOptionalProvider(record.provider);
  const model = optionalString(record.model);

  if (provider === "openrouter") {
    return { provider, model: model ?? config.openrouterModel };
  }
  if (provider === "xai") {
    return { provider, model: model ?? config.xaiModel };
  }
  return { provider: "ollama", model: model ?? config.ollamaModel };
}

function parseOptionalProvider(value: unknown): LlmProvider {
  if (value === undefined || value === null || value === "") {
    return config.llmProvider;
  }
  if (value === "openrouter" || value === "ollama" || value === "xai") {
    return value;
  }
  throw new AppError(
    400,
    "VALIDATION_ERROR",
    'Field "provider" must be "ollama", "openrouter", or "xai"',
  );
}

export function isSourceType(value: string): value is SourceType {
  return value === "note" || value === "url";
}
