import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { RetrievedSource } from "../types.js";

const SYSTEM_PROMPT = `You are an assistant answering questions about a user's saved knowledge.

Use only the provided sources. Do not invent facts.

If the sources do not contain enough information, say that you don't have enough information to answer.

Write the answer in Markdown:
- short paragraphs
- headings, lists, and bold where they help
- inline code when referring to technical terms

Cite sources inline immediately after the claim they support, using exactly this form: [Source 1], [Source 2], etc.

Rules:
- Only use source numbers that appear in the prompt.
- Do not write a "Sources" section, bibliography, or list of references at the end.
- Do not repeat the retrieved excerpts.
- Do not wrap the entire answer in a code fence.`;

export function buildGroundedUserPrompt(
  sources: RetrievedSource[],
  question: string,
): string {
  const sourceBlocks = sources.map((source) => {
    const lines = [
      `[Source ${source.sourceNumber}]`,
      `Title: ${source.title ?? "Untitled"}`,
    ];
    if (source.url) {
      lines.push(`URL: ${source.url}`);
    }
    lines.push("Content:");
    lines.push(source.content);
    return lines.join("\n");
  });

  return `Sources:\n\n${sourceBlocks.join("\n\n")}\n\nQuestion:\n${question}`;
}

export async function generateAnswer(
  sources: RetrievedSource[],
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  let answer = "";
  for await (const token of streamAnswer(sources, question, signal)) {
    answer += token;
  }
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new AppError(
      503,
      "LLM_ERROR",
      "The language model returned an empty response",
    );
  }
  return trimmed;
}

export async function* streamAnswer(
  sources: RetrievedSource[],
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const user = buildGroundedUserPrompt(sources, question);
  yield* streamChat(SYSTEM_PROMPT, user, signal);
}

async function* streamChat(
  system: string,
  user: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (config.llmProvider === "openrouter") {
    yield* streamWithOpenRouter(system, user, signal);
    return;
  }
  if (config.llmProvider === "xai") {
    yield* streamWithXai(system, user, signal);
    return;
  }
  yield* streamWithOllama(system, user, signal);
}

async function* streamWithOpenRouter(
  system: string,
  user: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!config.openrouterApiKey) {
    throw new AppError(
      503,
      "LLM_ERROR",
      "OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter",
    );
  }

  yield* streamOpenAiCompatible({
    url: `${config.openrouterBaseUrl}/chat/completions`,
    apiKey: config.openrouterApiKey,
    model: config.openrouterModel,
    system,
    user,
    signal,
    providerLabel: "OpenRouter",
    extraHeaders: {
      "HTTP-Referer": config.clientUrl,
      "X-Title": "Ground Truth",
    },
  });
}

async function* streamWithXai(
  system: string,
  user: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (!config.xaiApiKey) {
    throw new AppError(
      503,
      "LLM_ERROR",
      "XAI_API_KEY is required when LLM_PROVIDER=xai",
    );
  }

  yield* streamOpenAiCompatible({
    url: `${config.xaiBaseUrl}/chat/completions`,
    apiKey: config.xaiApiKey,
    model: config.xaiModel,
    system,
    user,
    signal,
    providerLabel: "xAI",
  });
}

async function* streamWithOllama(
  system: string,
  user: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const url = `${config.ollamaHost}/api/chat`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: true,
        think: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (error) {
    if (isAbortError(error)) return;
    logger.warn("Ollama request failed", { error: errorMessage(error) });
    throw new AppError(
      503,
      "LLM_ERROR",
      "Could not reach the language model. Is Ollama running?",
    );
  }

  if (!response.ok) {
    logger.warn("Ollama returned an error status", {
      status: response.status,
      model: config.ollamaModel,
    });
    throw new AppError(
      503,
      "LLM_ERROR",
      "The language model is currently unavailable",
    );
  }

  yield* iterateNdjsonTokens(response, (row) => {
    const content = (row.message as { content?: unknown } | undefined)?.content;
    return typeof content === "string" ? content : "";
  });
}

interface OpenAiStreamOptions {
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  signal?: AbortSignal;
  providerLabel: string;
  extraHeaders?: Record<string, string>;
}

async function* streamOpenAiCompatible(
  options: OpenAiStreamOptions,
): AsyncGenerator<string> {
  let response: Response;
  try {
    response = await fetch(options.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        ...(options.extraHeaders ?? {}),
      },
      signal: options.signal,
      body: JSON.stringify({
        model: options.model,
        stream: true,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
    });
  } catch (error) {
    if (isAbortError(error)) return;
    logger.warn(`${options.providerLabel} request failed`, {
      error: errorMessage(error),
    });
    throw new AppError(503, "LLM_ERROR", "Could not reach the language model");
  }

  if (!response.ok) {
    throw await llmHttpError(response, options.providerLabel, options.model);
  }

  yield* iterateSseTokens(response, (row) => {
    const content = (
      row.choices as Array<{ delta?: { content?: unknown } }> | undefined
    )?.[0]?.delta?.content;
    return typeof content === "string" ? content : "";
  });
}

async function llmHttpError(
  response: Response,
  providerLabel: string,
  model: string,
): Promise<AppError> {
  const detail = await readErrorMessage(response);
  logger.warn(`${providerLabel} returned an error status`, {
    status: response.status,
    model,
    error: detail,
  });

  if (response.status === 401 || response.status === 403) {
    return new AppError(
      503,
      "LLM_ERROR",
      `${providerLabel} rejected the API key. Check the key and remaining credits.`,
    );
  }
  if (response.status === 402) {
    return new AppError(
      503,
      "LLM_ERROR",
      `${providerLabel} needs credits for this model. Use a :free model or add credits.`,
    );
  }
  if (response.status === 429) {
    return new AppError(
      503,
      "LLM_ERROR",
      `${providerLabel} rate-limited the request. Try again in a moment.`,
    );
  }
  return new AppError(503, "LLM_ERROR", "The language model is currently unavailable");
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };
    if (typeof body.error === "string") return body.error;
    if (body.error && typeof body.error === "object" && typeof body.error.message === "string") {
      return body.error.message;
    }
    if (typeof body.message === "string") return body.message;
  } catch {
    // ignore parse failures
  }
  return `HTTP ${response.status}`;
}

export async function isLlmReachable(): Promise<boolean> {
  if (config.llmProvider === "openrouter") {
    if (!config.openrouterApiKey) return false;
    try {
      const response = await fetch(`${config.openrouterBaseUrl}/key`, {
        headers: { Authorization: `Bearer ${config.openrouterApiKey}` },
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  if (config.llmProvider === "xai") {
    return Boolean(config.xaiApiKey);
  }
  try {
    const response = await fetch(`${config.ollamaHost}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function activeModelName(): string {
  if (config.llmProvider === "openrouter") return config.openrouterModel;
  if (config.llmProvider === "xai") return config.xaiModel;
  return config.ollamaModel;
}

async function* iterateNdjsonTokens(
  response: Response,
  pick: (row: Record<string, unknown>) => string,
): AsyncGenerator<string> {
  if (!response.body) {
    throw new AppError(503, "LLM_ERROR", "The language model returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const token = tokenFromJsonLine(line, pick);
        if (token) yield token;
      }
    }
    const token = tokenFromJsonLine(buffer, pick);
    if (token) yield token;
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  }
}

async function* iterateSseTokens(
  response: Response,
  pick: (row: Record<string, unknown>) => string,
): AsyncGenerator<string> {
  if (!response.body) {
    throw new AppError(503, "LLM_ERROR", "The language model returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          const token = tokenFromJsonLine(payload, pick);
          if (token) yield token;
        }
      }
    }
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  }
}

function tokenFromJsonLine(
  line: string,
  pick: (row: Record<string, unknown>) => string,
): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  try {
    const row = JSON.parse(trimmed) as Record<string, unknown>;
    return pick(row);
  } catch {
    return "";
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
