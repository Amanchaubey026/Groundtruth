import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "../..");
const repoRoot = path.resolve(serverRoot, "..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(serverRoot, ".env") });

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function stringEnv(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : fallback;
}

const llmProvider = stringEnv("LLM_PROVIDER", "ollama").toLowerCase();

export const config = {
  port: numberEnv("PORT", 4000),
  clientUrl: stringEnv("CLIENT_URL", "http://localhost:5173"),
  dbPath: path.isAbsolute(stringEnv("DB_PATH", "./data/inbox.db"))
    ? stringEnv("DB_PATH", "./data/inbox.db")
    : path.resolve(serverRoot, stringEnv("DB_PATH", "./data/inbox.db")),
  ollamaHost: stringEnv("OLLAMA_HOST", "http://localhost:11434").replace(/\/$/, ""),
  ollamaModel: stringEnv("OLLAMA_MODEL", "llama3.1:8b"),
  llmProvider: llmProvider === "xai" ? "xai" : "ollama",
  xaiApiKey: process.env.XAI_API_KEY?.trim() ?? "",
  xaiModel: stringEnv("XAI_MODEL", "grok-4.6"),
  xaiBaseUrl: stringEnv("XAI_BASE_URL", "https://api.x.ai/v1").replace(/\/$/, ""),
  topK: numberEnv("TOP_K", 4),
  minSimilarity: numberEnv("MIN_SIMILARITY", 0.3),
  urlFetchTimeoutMs: numberEnv("URL_FETCH_TIMEOUT_MS", 10_000),
  maxUrlResponseBytes: numberEnv("MAX_URL_RESPONSE_BYTES", 5_000_000),
  maxNoteChars: numberEnv("MAX_NOTE_CHARS", 100_000),
  maxQuestionChars: numberEnv("MAX_QUESTION_CHARS", 2_000),
  serverRoot,
} as const;
