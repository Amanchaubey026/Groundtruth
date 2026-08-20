# AI Knowledge Inbox

A small production-style web app for a single user: save notes and URLs, retrieve semantically relevant chunks, and generate grounded answers with cited sources.

This is intentionally small. Embeddings and storage stay local (SQLite + MiniLM). The default generator is a hosted OpenRouter free model so a reviewer can run the RAG path without installing Ollama.

## Overview

The application is a personal knowledge inbox:

1. Save a short text note, or a URL whose readable content is fetched server-side.
2. Store the item and its metadata in SQLite.
3. Split the cleaned text into overlapping word chunks.
4. Embed those chunks with a local MiniLM model.
5. Ask a natural-language question.
6. Retrieve the most similar chunks with brute-force cosine similarity.
7. Generate an answer from those chunks only, and show the source snippets.

## Features

- Save plain-text notes
- Save URLs with server-side fetch + Readability extraction
- SQLite storage for items, chunks, and embeddings
- Local embeddings (`Xenova/all-MiniLM-L6-v2`)
- LLM via OpenRouter (`openai/gpt-oss-20b:free` by default), with optional local Ollama
- Grounded RAG answers with numbered citations
- Source snippets and similarity scores in the UI
- Structured JSON logs and consistent API errors
- Thin Express routes with business logic in services

## Architecture

```text
                    ┌──────────────────────┐
                    │      React UI        │
                    │    Vite + TS +       │
                    │      Tailwind        │
                    └────────┬─────────────┘
                             │ HTTP / JSON
                    ┌────────▼─────────────┐
                    │    Express API       │
                    │      TypeScript      │
                    └────────┬─────────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
     POST /ingest       GET /items        POST /query
           │                                   │
           ▼                                   ▼
    Ingestion Service                     RAG Service
           │                                   │
     note or URL fetch                   MiniLM query embed
           │                                   │
        chunking                         SQLite brute-force
           │                                   │
     MiniLM embeddings                    grounded prompt
           │                                   │
        SQLite                            OpenRouter / optional local Ollama
                                               │
                                        answer + sources
```

Routes stay thin:

```text
HTTP request → validation → service → response
```

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Backend | Node.js + Express + TypeScript | Fast API development, matches the assignment |
| Database | SQLite via `better-sqlite3` | Zero infrastructure, single-file, single-user |
| Vectors | `chunks.embedding` BLOBs | Explicitly allowed; no dedicated vector DB |
| Retrieval | Brute-force cosine similarity | Simple and enough for a small corpus |
| Embeddings | `Xenova/all-MiniLM-L6-v2` | Local, free, 384 dimensions |
| LLM | OpenRouter (`openai/gpt-oss-20b:free`) | Hosted, no credits for the default `:free` model |
| Optional LLM | Local Ollama (`llama3.1:8b`) | Offline swap behind the same `llm.ts` interface |
| URL extraction | `fetch` + jsdom + Readability | Server-side readable content |
| Frontend | React + Vite + TypeScript + Tailwind | Small UI, hooks only |

## Local Setup

### 1. Clone

```bash
git clone <repository-url>
cd Groundtruth
```

### 2. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

`better-sqlite3` is a native addon. On Windows that requires a working C++ build toolchain (Visual Studio Build Tools with the "Desktop development with C++" workload).

### 3. Configure environment

```bash
cp .env.example .env
```

Set `OPENROUTER_API_KEY` in `.env`. Defaults:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
LLM_PROVIDER=openrouter
OPENROUTER_MODEL=openai/gpt-oss-20b:free
MIN_SIMILARITY=0.30
TOP_K=4
```

The MiniLM embedding model downloads and caches automatically on first use (typically ~20–30 MB). The first ingest or query is slower while that happens.

### Optional: local Ollama

Ollama is not required. To run fully offline, install from [https://ollama.com](https://ollama.com), pull a **local** model (not an Ollama Cloud tag), and switch the provider:

```bash
ollama pull llama3.1:8b
```

On a lower-RAM machine:

```bash
ollama pull phi3:mini
```

```env
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Do not use Cloud tags such as `gpt-oss:20b-cloud`. Those need an Ollama account and a network round-trip.

## Running the Application

From `server/`:

```bash
npm run dev
```

From `client/`:

```bash
npm run dev
```

Open `http://localhost:5173`.

The backend is `http://localhost:4000`. CORS is limited to `CLIENT_URL`.

## API Documentation

All error responses use:

```json
{
  "error": {
    "message": "Question cannot be empty",
    "code": "VALIDATION_ERROR"
  }
}
```

Error codes: `VALIDATION_ERROR`, `URL_FETCH_ERROR`, `URL_PARSE_ERROR`, `EMBEDDING_ERROR`, `LLM_ERROR`, `DATABASE_ERROR`, `INTERNAL_ERROR`.

### `GET /health`

```json
{ "status": "ok", "llm": "reachable", "provider": "openrouter" }
```

This endpoint stays `200` even if Ollama is down. `llm` is informational.

### `POST /ingest`

Note:

```json
{ "type": "note", "content": "React Server Components allow..." }
```

URL:

```json
{ "type": "url", "url": "https://example.com/article" }
```

`201 Created`:

```json
{
  "id": "uuid",
  "sourceType": "url",
  "title": "Article Title",
  "sourceUrl": "https://example.com/article",
  "chunkCount": 6,
  "createdAt": "2026-08-19T10:00:00.000Z"
}
```

Validation failures are `400`. URL fetch/parse failures are `422`.

### `GET /items`

Returns metadata, not full stored content:

```json
{
  "items": [
    {
      "id": "uuid",
      "sourceType": "note",
      "title": null,
      "sourceUrl": null,
      "preview": "First 140 characters...",
      "createdAt": "2026-08-19T10:00:00.000Z"
    }
  ]
}
```

### `POST /query`

```json
{ "question": "What did the article say about React Server Components?" }
```

`200 OK`:

```json
{
  "answer": "The article explains that React Server Components...",
  "sources": [
    {
      "itemId": "uuid",
      "title": "React Documentation",
      "url": "https://example.com/article",
      "snippet": "React Server Components...",
      "score": 0.83
    }
  ]
}
```

If nothing is similar enough, the request is still `200`:

```json
{
  "answer": "I couldn't find relevant information in your saved content.",
  "sources": []
}
```

Empty questions are `400`.

## RAG Pipeline

```text
POST /query
  → validate question
  → MiniLM query embedding (same model as ingestion)
  → load chunk embeddings from SQLite
  → cosine similarity (dot product of normalized vectors)
  → top K (default 4)
  → drop chunks below MIN_SIMILARITY (default 0.30)
  → if none remain, return the "not found" answer without calling the LLM
  → build numbered sources
  → grounded prompt
  → LLM
  → answer + source metadata
```

The similarity threshold is a tuning value, not a universal constant. `0.30` is a starting point for MiniLM on mixed notes and articles; raise it if unrelated chunks leak through, lower it if relevant hits are dropped.

## Chunking Strategy

Chosen: **~500 words per chunk, ~50 words of overlap, paragraph-aware**.

Implementation:

1. Normalize whitespace.
2. Split on blank lines.
3. Pack paragraphs until the chunk is about 500 words.
4. If a paragraph is larger than the target, split it on word boundaries.
5. Prepend the last ~50 words of the previous packed chunk as overlap.

This is measured in **words**, not tokens. That avoids tokenizer-specific complexity for this assignment.

Why:

- Deterministic and easy to debug
- No extra segmentation model
- Works well for small documents
- Paragraph packing keeps coherent text together
- Overlap reduces information loss at boundaries

Tradeoff: a coherent idea can still be split. Overlap and paragraph boundaries are the mitigation, not a perfect fix.

## Embedding Strategy

Ingestion and queries both use `Xenova/all-MiniLM-L6-v2` through `@huggingface/transformers`.

- 384-dimensional vectors
- Mean pooling + L2 normalization
- Pipeline loaded once and reused
- Batched where practical (8 texts at a time)

The same model is required for documents and queries. Cosine similarity is only meaningful in one embedding space.

Tradeoff: MiniLM is free, local, and fast enough, but weaker than larger hosted embedding models.

## Vector Store Choice

Embeddings are stored as `Float32Array` → SQLite `BLOB` on each chunk row.

Search is brute-force:

```text
query vector · each chunk vector → sort descending → top K
```

Why this is appropriate here:

- Single user
- Small corpus
- Zero extra infrastructure
- Easy to inspect and explain

Tradeoff: search is **O(n)** in the number of chunks. At tens or hundreds of thousands of chunks, move to an ANN index (`pgvector`, Qdrant, Pinecone, Weaviate, …).

## LLM Choice

The RAG layer calls `services/llm.ts`, not a provider SDK. The default generator is OpenRouter with a free model:

```text
POST https://openrouter.ai/api/v1/chat/completions
model: openai/gpt-oss-20b:free
```

That needs an `OPENROUTER_API_KEY` but no paid credits for the default `:free` slug. Free models can be slower or rate-limited; they are enough for this assignment.

### Optional local Ollama

To swap the generator without touching retrieval, chunking, embeddings, SQLite, or the frontend:

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
```

Use a model you have already pulled locally (`llama3.1:8b`, `phi3:mini`, …). Do not use Ollama Cloud tags.

Tradeoff: local models need extra setup and are hardware-bound. The hosted default is easier for a reviewer.

### Optional hosted model (SpaceXAI)

```env
LLM_PROVIDER=xai
XAI_API_KEY=...
XAI_MODEL=grok-4.6
```

That uses the OpenAI-compatible SpaceXAI endpoint at `https://api.x.ai/v1`. It needs credits.

## Citation Strategy

Each retrieved chunk is numbered `[Source 1]`, `[Source 2]`, … in the prompt. The LLM is told to cite those labels. The API separately returns title, URL, snippet, and score so the UI does not have to parse the model’s prose.

If no chunk clears `MIN_SIMILARITY`, the LLM is not called.

## Error Handling

- `AppError` carries `statusCode`, `code`, and a public `message`
- A single Express error middleware maps that to the standard JSON shape
- Stack traces stay out of responses
- URL failures become `422 URL_FETCH_ERROR` / `URL_PARSE_ERROR`
- Unreachable LLM becomes `503 LLM_ERROR`
- Invalid input becomes `400 VALIDATION_ERROR`

## Debuggability

Every request gets a `requestId` (also returned as `x-request-id`). Logs are JSON lines:

```json
{
  "level": "info",
  "msg": "Query completed",
  "requestId": "abc-123",
  "route": "/query",
  "durationMs": 842,
  "retrievedChunks": 4,
  "topSimilarity": 0.71,
  "llmDurationMs": 610
}
```

Ingestion logs `itemId`, `sourceType`, `chunkCount`, and `embeddingDurationMs`.

Logs do not include API keys, secrets, or full document bodies.

## Tradeoffs

### Chunking

Simple word/paragraph packing vs. semantic chunking or token windows. Chosen for clarity and the timebox. Occasional splits across an idea are accepted.

### SQLite + serialized embeddings

Zero ops vs. a real vector database. Correct for a single-user inbox; wrong for concurrent multi-instance production.

### Brute-force search

Trivial correctness vs. ANN recall/latency. Fine until the corpus grows.

### Local MiniLM

No key, no cost, weaker quality than large hosted embedders.

### OpenRouter free model

No paid credits, extra network hop, possible rate limits and variable latency. Easy for a reviewer.

### Local Ollama

No key, extra setup, hardware-bound latency. Swaps only `llm.ts`.

### Synchronous ingestion

`POST /ingest` waits for fetch + chunk + embed + store. Clear for a demo; too slow once documents or traffic grow. Production would enqueue a worker.

## What Breaks at Scale

- **Brute-force search** is O(n) per query.
- **SQLite** does not like concurrent writers, multiple app instances, or multi-tenant isolation.
- **Synchronous ingest** holds the HTTP request through embedding.
- **Hosted LLM** depends on OpenRouter availability and free-model rate limits.
- **Local Ollama** is not a horizontally scalable inference tier.
- **No user_id** means there is no way to scope retrieval.

Production direction: PostgreSQL + `pgvector` (or a vector DB), a queue + worker for ingest, hosted or dedicated LLM inference, and per-user isolation.

## Production Changes

If this were a production system, the next changes would be:

1. Authentication
2. Per-user data isolation
3. PostgreSQL instead of SQLite
4. ANN vector search (`pgvector` / Qdrant / Pinecone)
5. Background ingestion workers
6. Queue-based processing and retries
7. Hosted or dedicated LLM inference
8. Embedding model versioning
9. Query caching
10. Rate limiting and request size limits
11. Stronger SSRF protections for URL fetch
12. Metrics, tracing, and persistent logs
13. Database migrations
14. Automated tests and CI
15. Health/readiness that distinguishes liveness from dependency readiness

These are documented, not implemented.

## Known Limitations

1. Single-user only
2. No authentication
3. SQLite is not for large concurrent workloads
4. Brute-force vector search is O(n)
5. Hosted free-model quality and latency vary by OpenRouter provider
6. Local LLM quality and latency depend on the selected Ollama model and hardware
7. URL ingestion only handles readable web pages
8. No background ingestion queue
9. No reranking
10. No semantic chunking
11. No document deletion UI
12. No multi-user isolation
13. No production-grade SSRF firewall
14. No automated evaluation dataset

Basic URL fetch protections *are* implemented: http/https only, timeout, response size cap, content-type checks, redirect protocol check, no script execution, and fetched HTML is never rendered as live frontend HTML.

## What Was Intentionally Not Built

Authentication, Redis, BullMQ, Kafka, Docker/Kubernetes, a dedicated vector DB, microservices, WebSockets, agent workflows, semantic chunking, rerankers, multi-tenancy, advanced observability, cloud deployment, and CI/CD.

The goal is a small, intentional, production-aware assignment — not a production system compressed into a weekend.
