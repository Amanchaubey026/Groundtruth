import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import { errorHandler } from "./lib/errors.js";
import { logger, requestContext } from "./lib/logger.js";
import { initDb } from "./db/client.js";
import { ingestRouter } from "./routes/ingest.js";
import { itemsRouter } from "./routes/items.js";
import { queryRouter } from "./routes/query.js";
import { warmupEmbeddings } from "./services/embeddings.js";
import { isLlmReachable } from "./services/llm.js";

initDb();

const app = express();

const allowedOrigins = new Set([
  config.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);

app.get("/health", async (_req, res) => {
  const llm = await isLlmReachable();
  res.status(200).json({
    status: "ok",
    llm: llm ? "reachable" : "unreachable",
    provider: config.llmProvider,
  });
});

app.use(ingestRouter);
app.use(itemsRouter);
app.use(queryRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      message: "Not found",
      code: "NOT_FOUND",
    },
  });
});

app.use(errorHandler);

app.listen(config.port, "0.0.0.0", () => {
  logger.info("Server started", {
    port: config.port,
    clientUrl: config.clientUrl,
    llmProvider: config.llmProvider,
  });

  warmupEmbeddings().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown error";
    logger.warn("Embedding warmup failed", { error: message });
  });
});
