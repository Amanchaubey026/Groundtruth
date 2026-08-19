import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { RetrievedSource } from "../types.js";

const SYSTEM_PROMPT = `You are an assistant answering questions about a user's saved knowledge.

Use only the provided sources.

Do not invent information.

If the provided sources do not contain enough information, say that you don't have enough information to answer.

When making factual claims, cite the relevant source using [Source 1], [Source 2], etc.`;

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
): Promise<string> {
  const user = buildGroundedUserPrompt(sources, question);
  return completeChat(SYSTEM_PROMPT, user);
}

async function completeChat(system: string, user: string): Promise<string> {
  if (config.llmProvider === "xai") {
    return completeWithXai(system, user);
  }
  return completeWithOllama(system, user);
}

async function completeWithOllama(system: string, user: string): Promise<string> {
  const url = `${config.ollamaHost}/api/chat`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

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

    const data = (await response.json()) as { message?: { content?: unknown } };
    const content = data.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AppError(
        503,
        "LLM_ERROR",
        "The language model returned an empty response",
      );
    }
    return content.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("Ollama request failed", { error: errorMessage(error) });
    throw new AppError(
      503,
      "LLM_ERROR",
      "Could not reach the language model. Is Ollama running?",
    );
  }
}

async function completeWithXai(system: string, user: string): Promise<string> {
  if (!config.xaiApiKey) {
    throw new AppError(
      503,
      "LLM_ERROR",
      "XAI_API_KEY is required when LLM_PROVIDER=xai",
    );
  }

  try {
    const response = await fetch(`${config.xaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.xaiModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn("xAI returned an error status", { status: response.status });
      throw new AppError(
        503,
        "LLM_ERROR",
        "The language model is currently unavailable",
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AppError(
        503,
        "LLM_ERROR",
        "The language model returned an empty response",
      );
    }
    return content.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("xAI request failed", { error: errorMessage(error) });
    throw new AppError(503, "LLM_ERROR", "Could not reach the language model");
  }
}

export async function isLlmReachable(): Promise<boolean> {
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
